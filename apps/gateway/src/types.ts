import type { SubKeyMeta } from "@tonsura/validators";

export type HonoVariables = {
  subKeyMeta: SubKeyMeta;
};

export type AppEnv = { Variables: HonoVariables };
