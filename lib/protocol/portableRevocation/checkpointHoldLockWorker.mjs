import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { hostname } from "node:os";
import { open, unlink } from "node:fs/promises";

const keepAlive = setInterval(() => {}, 2 ** 31 - 1);

async function main() {
  const lockPath = process.argv[2];
  if (!lockPath) process.exit(2);

  const token = randomUUID();
  const handle = await open(lockPath, "wx");
  await handle.writeFile(
    JSON.stringify({
      token,
      pid: process.pid,
      hostname: hostname(),
      acquired_at: new Date().toISOString(),
    }),
  );
  await handle.sync();

  await Promise.race([once(process, "SIGTERM"), once(process, "SIGINT")]);
  clearInterval(keepAlive);
  try {
    await handle.close();
  } catch {
    /* ignore */
  }
  try {
    await unlink(lockPath);
  } catch {
    /* ignore */
  }
}

main().catch((error) => {
  clearInterval(keepAlive);
  console.error(error);
  process.exit(1);
});
