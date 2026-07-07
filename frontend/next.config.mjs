import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(rootEnvPath)) {
  const envConfig = fs.readFileSync(rootEnvPath, "utf-8");
  envConfig.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
}

const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      const devBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      return [
        {
          source: "/api/:path*",
          destination: `${devBackendUrl}/api/:path*`,
        },
        {
          source: "/stream/:path*",
          destination: `${devBackendUrl}/stream/:path*`,
        },
      ];
    }
    return [];
  },
}

export default nextConfig;
