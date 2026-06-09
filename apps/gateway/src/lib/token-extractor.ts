// Pluggable per-provider usage extraction.
//
// The extractor's single job is to produce the *count* of billable units for a
// given upstream call. Pricing (cost/revenue per million units) and the unit
// label live on the binding config (SubKeyMeta), not here — the SaaS owner
// configures cost-per-unit manually against whatever unit the provider bills in
// (tokens for OpenAI, characters for ElevenLabs, etc.).
//
// Each extractor sees the full call context — parsed request body, parsed
// response body (when JSON), the raw request text, and the response headers —
// because providers expose usage in different places:
//   - OpenAI / Anthropic: token counts in the JSON response `usage` object.
//   - ElevenLabs: bills per *character* of input; the response is binary audio
//     (no JSON usage), so units come from the request text length (or a usage
//     header when present).

type AnyBody = Record<string, unknown>;

export interface ExtractionInput {
  /** Parsed JSON request body, or undefined for non-JSON requests. */
  requestBody?: AnyBody;
  /** Parsed JSON response body, or undefined when the response isn't JSON
   *  (binary audio, streamed SSE, etc.). */
  responseBody?: AnyBody;
  /** Raw request body text — used to count characters when the provider bills
   *  per character and exposes no usage object. */
  requestText?: string;
  /** Upstream response headers — some providers report usage here. */
  responseHeaders?: Headers;
}

export type ProviderExtractor = (input: ExtractionInput) => number;

function num(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

// --- OpenAI: chat/completions/embeddings expose `usage.total_tokens`. For
// streamed responses, total_tokens is only present when the caller sets
// `stream_options.include_usage` (then it arrives in the final chunk, which we
// can't see without teeing the stream — returns 0 in that case; flagged).
const openai: ProviderExtractor = ({ responseBody }) => {
  const usage = responseBody?.["usage"] as AnyBody | undefined;
  if (!usage) return 0;
  if ("total_tokens" in usage) return num(usage["total_tokens"]);
  // Fallback to prompt + completion if total isn't summed.
  return num(usage["prompt_tokens"]) + num(usage["completion_tokens"]);
};

// --- Anthropic: messages API reports `usage.input_tokens` + `output_tokens`.
const anthropic: ProviderExtractor = ({ responseBody }) => {
  const usage = responseBody?.["usage"] as AnyBody | undefined;
  if (!usage) return 0;
  return num(usage["input_tokens"]) + num(usage["output_tokens"]);
};

// --- ElevenLabs: billed per character of the synthesized `text`. The TTS
// endpoints return binary audio (no JSON body), so we count the request text.
// Newer responses also surface usage in headers; prefer that when present so
// server-side normalization (e.g. SSML stripping) is respected.
const ELEVENLABS_USAGE_HEADERS = [
  "character-cost",
  "x-character-cost",
  "x-characters-used",
  "character-count",
];
const elevenlabs: ProviderExtractor = ({ requestBody, responseHeaders }) => {
  if (responseHeaders) {
    for (const h of ELEVENLABS_USAGE_HEADERS) {
      const v = responseHeaders.get(h);
      if (v) return num(v);
    }
  }
  const text = requestBody?.["text"];
  return typeof text === "string" ? [...text].length : 0;
};

// --- Generic auto-detect for the legacy "llm" providerType: try OpenAI shape,
// then Anthropic shape. Keeps pre-pivot providers working without reconfig.
const llm: ProviderExtractor = (input) => {
  const usage = input.responseBody?.["usage"] as AnyBody | undefined;
  if (!usage) return 0;
  if ("input_tokens" in usage || "output_tokens" in usage) return anthropic(input);
  return openai(input);
};

// --- Non-metered providers (request/record priced): the call itself is the
// billable unit, counted in the proxy via unitType, so the extractor yields 0.
const generic: ProviderExtractor = () => 0;

const EXTRACTORS: Record<string, ProviderExtractor> = {
  openai,
  anthropic,
  elevenlabs,
  llm,
  generic,
};

/**
 * Count billable units for a call against the given provider. Unknown provider
 * keys fall back to the legacy LLM auto-detect so nothing silently reports zero
 * for an existing token-metered binding.
 */
export function extractUnits(providerType: string, input: ExtractionInput): number {
  const extractor = EXTRACTORS[providerType] ?? llm;
  return extractor(input);
}

/**
 * @deprecated Back-compat shim for the old signature. Prefer `extractUnits`,
 * which sees request + headers (needed for character-billed providers).
 */
export function extractTokens(
  body: AnyBody,
  providerType: "llm" | "generic"
): number {
  return extractUnits(providerType, { responseBody: body });
}

export function calculateCost(units: number, costPerMillionUnits: string): string {
  const cost = (units / 1_000_000) * parseFloat(costPerMillionUnits);
  return cost.toFixed(8);
}

export function calculateRevenue(units: number, pricePerMillionUnits: string): string {
  const revenue = (units / 1_000_000) * parseFloat(pricePerMillionUnits);
  return revenue.toFixed(8);
}
