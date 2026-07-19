import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  throw new Error("Standalone server is missing. Run `next build` first.");
}

// Next.js standalone output intentionally excludes static/public assets. Copying them
// into the runtime bundle prevents an HTML-only page when deployed outside a container.
const staticSource = join(root, ".next", "static");
const staticTarget = join(standalone, ".next", "static");
mkdirSync(join(standalone, ".next"), { recursive: true });
cpSync(staticSource, staticTarget, { recursive: true, force: true });

const publicSource = join(root, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, join(standalone, "public"), { recursive: true, force: true });
}

console.log("Standalone runtime assets packaged.");
