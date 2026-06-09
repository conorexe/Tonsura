import type { BindingMeta, SubKeyMeta } from "@tonsura/validators";

// Resolving a request to the upstream it should hit. Two modes:
//
//   - Feature key (meta.bindings non-empty): a single key fronts several root
//     APIs. The first path segment after /v1 is a *path alias* that selects which
//     binding; the remainder is forwarded to that binding's upstream. This is
//     what makes base-URL swap seamless — the SaaS points an SDK's baseUrl at
//     `{gateway}/v1/{alias}` and the SDK's own path (e.g. /chat/completions) is
//     appended and forwarded verbatim.
//
//   - Legacy key (meta.bindings empty): the key maps to exactly one binding (the
//     top-level meta fields) and the full path after the gateway is forwarded,
//     unchanged behavior from before feature keys existed.

export interface ResolvedRoute {
  binding: BindingMeta;
  /** Path to forward to the binding's upstream base URL. */
  upstreamPath: string;
}

// Build the implicit single binding for a legacy key from the top-level meta.
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

// Pick the binding for a feature-key request by its path alias and return the
// remainder of the path to forward upstream. Returns null when the path has no
// alias segment or no binding matches that alias (caller should 404).
//
// Path shape: /v1/{alias}[/{rest...}]  ->  forward /{rest...} (or "/" if none).
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

// Unified resolution used by the proxy. For a feature key, route by alias (null
// on a miss). For a legacy key, use the sole binding and forward the full path.
export function resolveRoute(
  meta: SubKeyMeta,
  path: string
): ResolvedRoute | null {
  if (meta.bindings.length > 0) {
    return selectBinding(meta.bindings, path);
  }
  return { binding: legacyBinding(meta), upstreamPath: path };
}
