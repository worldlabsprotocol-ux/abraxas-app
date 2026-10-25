import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type PendingVerification = {
  verify_request: string;
  handoff_ref: string;
  created_at: string;
};

type StoreFile = {
  schema: "abraxas_external_partner_pending/1.0.0";
  by_verify_request: Record<string, PendingVerification>;
};

const DEFAULT_PATH = join(process.cwd(), ".data", "pending-verifications.json");

async function load(path: string): Promise<StoreFile> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as StoreFile;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { schema: "abraxas_external_partner_pending/1.0.0", by_verify_request: {} };
    }
    throw err;
  }
}

async function save(path: string, store: StoreFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tmp, path);
}

export async function putPending(
  pending: PendingVerification,
  path: string = DEFAULT_PATH,
): Promise<void> {
  const store = await load(path);
  store.by_verify_request[pending.verify_request] = pending;
  await save(path, store);
}

export async function getPending(
  verifyRequest: string,
  path: string = DEFAULT_PATH,
): Promise<PendingVerification | null> {
  const store = await load(path);
  return store.by_verify_request[verifyRequest] ?? null;
}
