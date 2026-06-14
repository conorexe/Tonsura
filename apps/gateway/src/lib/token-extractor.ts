type AnyBody = Record<string, unknown>;

export interface ExtractionInput {
  requestBody?: AnyBody;
  responseBody?: AnyBody;
  requestText?: string;
  responseHeaders?: Headers;
}

export type ProviderExtractor = (input: ExtractionInput) => number;

function num(v: unknown): number {
  const n = typeof v === "string" ? parseInt(v, 10) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

const openai: ProviderExtractor = ({ responseBody }) => {
  const usage = responseBody?.["usage"] as AnyBody | undefined;
  if (!usage) return 0;
  if ("total_tokens" in usage) return num(usage["total_tokens"]);
  return num(usage["prompt_tokens"]) + num(usage["completion_tokens"]);
};

const anthropic: ProviderExtractor = ({ responseBody }) => {
  const usage = responseBody?.["usage"] as AnyBody | undefined;
  if (!usage) return 0;
  return num(usage["input_tokens"]) + num(usage["output_tokens"]);
};

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

const llm: ProviderExtractor = (input) => {
  const usage = input.responseBody?.["usage"] as AnyBody | undefined;
  if (!usage) return 0;
  if ("input_tokens" in usage || "output_tokens" in usage) return anthropic(input);
  return openai(input);
};

const generic: ProviderExtractor = () => 0;

const EXTRACTORS: Record<string, ProviderExtractor> = {
  openai,
  anthropic,
  elevenlabs,
  llm,
  generic,
};

export function extractUnits(providerType: string, input: ExtractionInput): number {
  const extractor = EXTRACTORS[providerType] ?? llm;
  return extractor(input);
}

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
