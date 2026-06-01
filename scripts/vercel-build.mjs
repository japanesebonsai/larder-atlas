import { createWriteStream, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const logPath = join(process.cwd(), ".vercel-build.log");
const nextCliPath = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

const log = createWriteStream(logPath, { flags: "w" });
const child = spawn(process.execPath, [nextCliPath, "build", "--webpack"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.pipe(log);
child.stderr.pipe(log);

const exitCode = await new Promise((resolve) => {
  child.on("close", resolve);
});

await new Promise((resolve) => log.end(resolve));

const buildLog = readFileSync(logPath, "utf8");
process.stdout.write(buildLog);

if (exitCode !== 0) {
  process.exit(exitCode ?? 1);
}
