/**
 * Free port 3456 from stale demo-dashboard containers, then start the dashboard.
 * Usage: npm run demo:dashboard:fresh
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const compose = ["compose", "-f", "docker/docker-compose.yml"];

spawnSync("docker", [...compose, "down", "--remove-orphans"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const r = spawnSync(npmCmd, ["run", "demo:dashboard"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
process.exit(r.status ?? 1);
