export function applyFieldMap(
  obj: Record<string, unknown>,
  fieldMap: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj };
  for (const [oldKey, newKey] of Object.entries(fieldMap)) {
    if (oldKey in result) {
      result[newKey] = result[oldKey];
      delete result[oldKey];
    }
  }
  return result;
}

export function applyAddFields(
  obj: Record<string, unknown>,
  fields: Record<string, unknown>
): Record<string, unknown> {
  return { ...obj, ...fields };
}

export function applyRemoveFields(
  obj: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}
