// FILE: scripts/demo/lib/demoProvisionerSecrets.ts
// Hidden stdin prompts for provisioner secrets — never persisted.

import { createInterface } from "node:readline";

export type DemoProvisionerSecretKey =
  | "DEMO_SUPABASE_DATABASE_URL"
  | "ABRAXAS_SIGNING_KEY";

export async function promptHiddenSecret(
  label: string,
  options?: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream },
): Promise<string> {
  const input = options?.input ?? process.stdin;
  const output = options?.output ?? process.stderr;

  if (!input.isTTY) {
    throw new Error(`${label} requires an interactive TTY for hidden input`);
  }

  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input,
      output,
      terminal: true,
    });

    const stdin = input as NodeJS.ReadStream;
    const previousRawMode = stdin.isTTY ? stdin.isRaw : false;

    const cleanup = () => {
      if (stdin.isTTY) stdin.setRawMode(previousRawMode);
      rl.close();
    };

    output.write(`${label}: `);

    if (stdin.isTTY) stdin.setRawMode(true);

    let value = "";

    const onData = (chunk: Buffer | string) => {
      const char = chunk.toString();

      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.off("data", onData);
        output.write("\n");
        cleanup();
        resolve(value);
        return;
      }

      if (char === "\u0003") {
        stdin.off("data", onData);
        cleanup();
        reject(new Error("Input cancelled"));
        return;
      }

      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    };

    stdin.on("data", onData);
    stdin.resume();
  });
}

export function unsetProvisionerSecrets(env: NodeJS.ProcessEnv): void {
  delete env.DEMO_SUPABASE_DATABASE_URL;
  delete env.ABRAXAS_SIGNING_KEY;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function promptDatabaseUrlIfNeeded(
  env: Record<string, string | undefined>,
  options?: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream },
): Promise<string> {
  const existing = env.DEMO_SUPABASE_DATABASE_URL?.trim();
  if (existing) return existing;
  const value = await promptHiddenSecret("Demo DEMO_SUPABASE_DATABASE_URL", options);
  env.DEMO_SUPABASE_DATABASE_URL = value;
  return value;
}

export async function promptSigningKeyIfNeeded(
  env: Record<string, string | undefined>,
  options?: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream },
): Promise<string> {
  const existing = env.ABRAXAS_SIGNING_KEY?.trim();
  if (existing) return existing;
  const value = await promptHiddenSecret("Demo ABRAXAS_SIGNING_KEY", options);
  env.ABRAXAS_SIGNING_KEY = value;
  return value;
}
