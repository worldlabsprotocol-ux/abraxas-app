#!/bin/bash
# Abraxas — fix all prerender failures in one shot
# Run from project root: bash patch_prerender.sh

set -e
PATCHED=0
SKIPPED=0

patch_page() {
  local FILE="$1"
  if [ ! -f "$FILE" ]; then
    echo "  SKIP (missing): $FILE"
    ((SKIPPED++)) || true
    return
  fi
  if grep -q 'force-dynamic' "$FILE"; then
    echo "  ALREADY OK:    $FILE"
    ((SKIPPED++)) || true
    return
  fi
  # Write a temp file with the dynamic export injected on line 1
  # (before any other code — works whether or not "use client" is present)
  python3 - "$FILE" << 'PY'
import sys
path = sys.argv[1]
lines = open(path).read().splitlines(keepends=True)
insert = 'export const dynamic = "force-dynamic";\n'
# Find position: after "use client" if present on first 3 lines, else line 0
pos = 0
for i, l in enumerate(lines[:3]):
    if '"use client"' in l or "'use client'" in l:
        pos = i + 1
        break
if insert not in ''.join(lines):
    lines.insert(pos, insert)
    open(path, 'w').writelines(lines)
    print(f"  PATCHED:       {path}")
PY
  ((PATCHED++)) || true
}

echo "=== Patching prerender-failing pages ==="

# External template pages (useAuth / useToast / wagmi hooks)
patch_page "app/access/page.tsx"
patch_page "app/dashboard/page.tsx"
patch_page "app/formations/page.tsx"
patch_page "app/formations/begin/page.tsx"
patch_page "app/list/page.tsx"
patch_page "app/login/page.tsx"
patch_page "app/operator/page.tsx"
patch_page "app/stake/page.tsx"
patch_page "app/withdraw/positionId/page.tsx"

# Our pages — wallet context accessed without provider during SSR
patch_page "app/protect/page.tsx"
patch_page "app/tokenize/page.tsx"   # bundled with protect; also needs guard

echo ""
echo "Done — patched $PATCHED pages, skipped $SKIPPED"
echo ""
echo "Next: git add -A && git commit -m 'fix: add dynamic=force-dynamic to prerender-failing pages' && git push"