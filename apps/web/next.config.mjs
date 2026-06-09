/** @type {import('next').NextConfig} */
const config = {
  // Self-contained server bundle for VPS deployment (node .next/standalone).
  output: "standalone",
  transpilePackages: ["@tonsura/db", "@tonsura/crypto", "@tonsura/validators"],
  experimental: {
    serverComponentsExternalPackages: ["postgres"],
  },
};

export default config;
