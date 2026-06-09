import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Self-hosted config: read .env from the repo root (walking up from cwd) so
// `pnpm dev` works from anywhere, without overriding anything already set in
// the real environment (systemd units, docker, CI all win over the file).
function loadDotEnv(): void {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const file = join(dir, ".env");
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const idx = line.indexOf("=");
        if (idx <= 0 || line.startsWith("#")) continue;
        const key = line.slice(0, idx).trim();
        if (!/^[A-Z0-9_]+$/.test(key) || process.env[key]) continue;
        process.env[key] = line
          .slice(idx + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadDotEnv();

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return v;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  MASTER_ENCRYPTION_SECRET: required("MASTER_ENCRYPTION_SECRET"),
  PORT: parseInt(process.env["GATEWAY_PORT"] ?? "8787", 10),
};
