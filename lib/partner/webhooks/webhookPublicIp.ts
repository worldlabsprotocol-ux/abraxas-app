// FILE: lib/partner/webhooks/webhookPublicIp.ts
// RFC-based public IP classifier for webhook SSRF defense.
// Blocks all non-globally-routable, reserved, documentation, multicast, and broadcast ranges.

import { isIP } from "net";

const IPV4_ONES = 0xffffffff;

function ipv4ToInt(address: string): number {
  const parts = address.split(".").map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function inIpv4Range(address: string, base: string, prefixLength: number): boolean {
  const ip = ipv4ToInt(address);
  const network = ipv4ToInt(base);
  const mask = prefixLength === 0 ? 0 : (IPV4_ONES << (32 - prefixLength)) >>> 0;
  return (ip & mask) === (network & mask);
}

/** Non-public IPv4 CIDR blocks (RFC 1122, 1918, 6598, 3927, 5735, 5737, 2544, 1112, 919). */
const BLOCKED_IPV4_RANGES: Array<{ base: string; prefix: number; label: string }> = [
  { base: "0.0.0.0", prefix: 8, label: "this-network" },
  { base: "10.0.0.0", prefix: 8, label: "private" },
  { base: "100.64.0.0", prefix: 10, label: "cgnat" },
  { base: "127.0.0.0", prefix: 8, label: "loopback" },
  { base: "169.254.0.0", prefix: 16, label: "link-local" },
  { base: "172.16.0.0", prefix: 12, label: "private" },
  { base: "192.0.0.0", prefix: 24, label: "ietf-protocol" },
  { base: "192.0.2.0", prefix: 24, label: "documentation" },
  { base: "192.168.0.0", prefix: 16, label: "private" },
  { base: "198.18.0.0", prefix: 15, label: "benchmark" },
  { base: "198.51.100.0", prefix: 24, label: "documentation" },
  { base: "203.0.113.0", prefix: 24, label: "documentation" },
  { base: "224.0.0.0", prefix: 4, label: "multicast" },
  { base: "240.0.0.0", prefix: 4, label: "reserved" },
];

function normalizeIpv6(address: string): string {
  return address.trim().toLowerCase();
}

function expandIpv6Hextets(address: string): number[] | null {
  const normalized = normalizeIpv6(address);
  if (normalized.includes(".")) {
    return null;
  }

  const [head, tail] = normalized.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];
  const missing = 8 - headParts.length - tailParts.length;
  if (missing < 0) return null;

  const parts = [
    ...headParts,
    ...Array.from({ length: missing }, () => "0"),
    ...tailParts,
  ];

  if (parts.length !== 8) return null;

  try {
    return parts.map(part => parseInt(part, 16));
  } catch {
    return null;
  }
}

function inIpv6Range(address: string, prefixBase: string, prefixLength: number): boolean {
  const hextets = expandIpv6Hextets(address);
  const baseHextets = expandIpv6Hextets(prefixBase);
  if (!hextets || !baseHextets) return false;

  const bits = prefixLength;
  const fullWords = Math.floor(bits / 16);
  const remainder = bits % 16;

  for (let i = 0; i < fullWords; i += 1) {
    if (hextets[i] !== baseHextets[i]) return false;
  }

  if (remainder === 0) return true;

  const mask = (0xffff << (16 - remainder)) & 0xffff;
  return (hextets[fullWords]! & mask) === (baseHextets[fullWords]! & mask);
}

function extractIpv4Mapped(address: string): string | null {
  const lower = normalizeIpv6(address);
  if (lower.startsWith("::ffff:")) {
    const suffix = lower.slice("::ffff:".length);
    if (isIP(suffix) === 4) return suffix;
  }
  return null;
}

function isBlockedIpv4(address: string): boolean {
  if (address === "255.255.255.255") return true;
  return BLOCKED_IPV4_RANGES.some(range => inIpv4Range(address, range.base, range.prefix));
}

function isBlockedIpv6(address: string): boolean {
  const lower = normalizeIpv6(address);

  if (lower === "::") return true;
  if (lower === "::1") return true;

  const mapped = extractIpv4Mapped(lower);
  if (mapped) return isBlockedIpv4(mapped);

  const blockedRanges: Array<{ base: string; prefix: number }> = [
    { base: "fe80::", prefix: 10 },   // link-local
    { base: "fc00::", prefix: 7 },     // unique local
    { base: "2001:db8::", prefix: 32 }, // documentation
    { base: "ff00::", prefix: 8 },    // multicast
    { base: "100::", prefix: 64 },    // discard
    { base: "2002::", prefix: 16 },   // 6to4
    { base: "64:ff9b::", prefix: 96 }, // local-use NAT64
  ];

  return blockedRanges.some(range => inIpv6Range(lower, range.base, range.prefix));
}

/** Returns true only for globally routable public addresses safe for webhook delivery. */
export function isPublicWebhookIp(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return !isBlockedIpv4(address);
  if (version === 6) return !isBlockedIpv6(address);
  return false;
}

/** @internal Exported for tests documenting blocked range labels. */
export function blockedIpv4RangeLabel(address: string): string | null {
  if (address === "255.255.255.255") return "broadcast";
  const match = BLOCKED_IPV4_RANGES.find(range => inIpv4Range(address, range.base, range.prefix));
  return match?.label ?? null;
}
