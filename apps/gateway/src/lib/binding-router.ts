import type { BindingMeta, SubKeyMeta } from "@tonsura/validators";

export interface ResolvedRoute {
  binding: BindingMeta;
  upstreamPath: string;
}

export function legacyBinding(meta: SubKeyMeta): BindingMeta {
  return {
    pathAlias: null,
    productId: meta.productId,
    providerId: meta.providerId,
    providerType: meta.providerType,
    providerBaseUrl: meta.providerBaseUrl,
    authScheme: meta.authScheme,
    authParam: meta.authParam,
    encryptedMasterKey: meta.encryptedMasterKey,
    unitType: meta.unitType,
    pricePerMillionTokens: meta.pricePerMillionTokens,
    costPerMillionTokens: meta.costPerMillionTokens,
    transformConfig: meta.transformConfig,
  };
}

export function selectBinding(
  bindings: BindingMeta[],
  path: string
): ResolvedRoute | null {
  const match = path.match(/^\/v1\/([^/]+)(\/.*)?$/);
  if (!match) return null;

  const alias = match[1];
  const rest = match[2] ?? "/";
  const binding = bindings.find((b) => b.pathAlias === alias);
  if (!binding) return null;

  return { binding, upstreamPath: rest };
}

export function resolveRoute(
  meta: SubKeyMeta,
  path: string
): ResolvedRoute | null {
  if (meta.bindings.length > 0) {
    return selectBinding(meta.bindings, path);
  }
  return { binding: legacyBinding(meta), upstreamPath: path };
}
