import type { TransformConfig } from "@tonsura/validators";
import { applyAddFields, applyFieldMap, applyRemoveFields } from "./utils";
import { injectPromptWrap, injectSystemPrompt } from "./llm";

export function transformRequest(
  body: Record<string, unknown>,
  incomingHeaders: Headers,
  config: TransformConfig | null | undefined,
  // Widened beyond "llm"/"generic" to the named providers (openai, anthropic,
  // elevenlabs, ...). LLM-style request transforms apply to the chat providers.
  providerType: string
): { body: Record<string, unknown>; headers: Record<string, string> } {
  const isChatLlm =
    providerType === "llm" ||
    providerType === "openai" ||
    providerType === "anthropic";
  const req = config?.request;
  let result = { ...body };

  const headerMap: Record<string, string> = {};
  incomingHeaders.forEach((value, key) => {
    headerMap[key] = value;
  });

  const headers: Record<string, string> = { ...headerMap };

  if (!req) return { body: result, headers };

  if (isChatLlm) {
    if (req.systemPrompt) {
      result = injectSystemPrompt(result, headerMap, req.systemPrompt);
    }
    if (req.promptPrefix || req.promptSuffix) {
      result = injectPromptWrap(result, req.promptPrefix, req.promptSuffix);
    }
  }

  if (req.addFields) result = applyAddFields(result, req.addFields);
  if (req.removeFields) result = applyRemoveFields(result, req.removeFields);
  if (req.fieldMap) result = applyFieldMap(result, req.fieldMap);

  if (req.addHeaders) {
    for (const [k, v] of Object.entries(req.addHeaders)) headers[k] = v;
  }
  if (req.removeHeaders) {
    for (const k of req.removeHeaders) delete headers[k];
  }

  return { body: result, headers };
}
