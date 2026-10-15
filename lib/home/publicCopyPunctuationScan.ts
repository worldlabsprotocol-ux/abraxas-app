// FILE: lib/home/publicCopyPunctuationScan.ts
// Detect em/en dash and spaced hyphen punctuation in user-facing string literals.

const EM_EN_DASH = /[\u2013\u2014]/;
/** Hyphen used as clause punctuation (space-hyphen-space), not compound tokens or URLs. */
const SPACED_HYPHEN_PUNCT = /\s-\s/;

const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

const TECHNICAL_STRING =
  /^[\w./:?=&%#@+*,[\]{}|<>~^`\\-]+$|^\/|^https?:\/\//;

function stripQuotes(raw: string): string {
  const q = raw[0];
  if (q === `"` || q === "'" || q === "`") return raw.slice(1, -1);
  return raw;
}

export function extractStringLiterals(line: string): string[] {
  const out: string[] = [];
  let match: RegExpExecArray | null;
  STRING_LITERAL.lastIndex = 0;
  while ((match = STRING_LITERAL.exec(line)) !== null) {
    out.push(stripQuotes(match[0]));
  }
  const jsxText = />\s*([^<{][^<]*?)\s*</g;
  while ((match = jsxText.exec(line)) !== null) {
    const text = match[1].trim();
    if (text.length > 0) out.push(text);
  }
  return out;
}

export function isTechnicalCopyString(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return true;
  if (t.includes("${")) return true;
  if (/translateY|scale\(|px\)|calc\(|\(\s*\d+\s-\s/.test(t)) return true;
  if (/[A-Za-z_]+\s-\s\d/.test(t)) return true;
  if (TECHNICAL_STRING.test(t)) return true;
  if (/^var\(--/.test(t)) return true;
  if (/^abx-/.test(t)) return true;
  if (/^[a-z]+-[a-z]/.test(t) && !/\s/.test(t)) return true;
  return false;
}

function isLikelyJsxTextLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith("<") || t.startsWith("{")) return false;
  if (/[:={}()[\];]/.test(t)) return false;
  if (!/[a-zA-Z]{4}/.test(t)) return false;
  return true;
}

export function findProhibitedPunctuationInString(text: string): string | null {
  if (isTechnicalCopyString(text)) return null;
  if (EM_EN_DASH.test(text)) return "em_or_en_dash";
  if (SPACED_HYPHEN_PUNCT.test(text) && !/^https?:\/\//.test(text)) {
    return "spaced_hyphen_punctuation";
  }
  return null;
}

export function scanSourceLineForPublicCopyViolations(line: string): string[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return [];
  if (trimmed.startsWith("*") || trimmed.startsWith("/**") || trimmed.startsWith("*/")) return [];
  if (/^\s*\/\*.*\*\/\s*$/.test(line)) return [];
  if (line.includes("import ")) return [];
  const violations: string[] = [];
  for (const literal of extractStringLiterals(line)) {
    const kind = findProhibitedPunctuationInString(literal);
    if (kind) violations.push(`${kind}: ${literal.slice(0, 120)}`);
  }
  if (violations.length === 0 && isLikelyJsxTextLine(line)) {
    if (EM_EN_DASH.test(line)) {
      violations.push(`em_or_en_dash: ${line.trim().slice(0, 120)}`);
    } else if (SPACED_HYPHEN_PUNCT.test(line)) {
      violations.push(`spaced_hyphen_punctuation: ${line.trim().slice(0, 120)}`);
    }
  }
  return violations;
}
