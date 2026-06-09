import type { TransformConfig } from "@tonsura/validators";
import { applyAddFields, applyFieldMap, applyRemoveFields } from "./utils";

export function transformResponse(
  body: Record<string, unknown>,
  config: TransformConfig | null | undefined
): Record<string, unknown> {
  const res = config?.response;
  if (!res) return body;

  let result = { ...body };
  if (res.addFields) result = applyAddFields(result, res.addFields);
  if (res.removeFields) result = applyRemoveFields(result, res.removeFields);
  if (res.fieldMap) result = applyFieldMap(result, res.fieldMap);
  return result;
}
