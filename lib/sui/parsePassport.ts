// FILE: lib/sui/parsePassport.ts
import { bitmaskToStampIds } from "@/lib/passport/stamps";

export interface ParsedSuiPassport {
  objectId: string;
  version: string | number;
  subject: string;
  stampBitmask: number;
  stampIds: ReturnType<typeof bitmaskToStampIds>;
  passportVersion: number;
  nonce: number;
  revoked: boolean;
  expiresAt: number;
  authorityHex: string | null;
  objectType: string;
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v, 10);
  return 0;
}

function bytesToHex(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    return v.map(b => Number(b).toString(16).padStart(2, "0")).join("");
  }
  if (typeof v === "string") return v.replace(/^0x/, "");
  return null;
}

/** Unwrap Sui SDK nested struct: content.fields.root.fields */
function extractRootFields(content: Record<string, unknown>): Record<string, unknown> | undefined {
  const fields = content.fields as Record<string, unknown> | undefined;
  const rootRaw = content.root ?? fields?.root;
  if (!rootRaw || typeof rootRaw !== "object") return undefined;

  const rootObj = rootRaw as Record<string, unknown>;
  if (rootObj.fields && typeof rootObj.fields === "object") {
    return rootObj.fields as Record<string, unknown>;
  }
  return rootObj;
}

/** Parse Sui JSON-RPC object response (sui client object or REST shape) */
export function parseSuiPassportObject(
  objectId: string,
  raw: Record<string, unknown>,
): ParsedSuiPassport | null {
  const data = raw.data as Record<string, unknown> | undefined;
  const content = (raw.content ?? data?.content) as Record<string, unknown> | undefined;
  if (!content) return null;

  const fields = content.fields as Record<string, unknown> | undefined;
  const root = extractRootFields(content);
  const subject = String(content.subject ?? fields?.subject ?? "");
  const objType = String(raw.objType ?? data?.type ?? raw.type ?? "");

  if (!root || !objType.includes("::passport::Passport")) return null;

  const stampBitmask = num(root.stamps);
  return {
    objectId,
    version: String(raw.version ?? data?.version ?? "?"),
    subject,
    stampBitmask,
    stampIds: bitmaskToStampIds(stampBitmask),
    passportVersion: num(root.version),
    nonce: num(root.nonce),
    revoked: num(root.revoked) === 1,
    expiresAt: num(root.expires_at),
    authorityHex: bytesToHex(root.authority),
    objectType: objType,
  };
}
