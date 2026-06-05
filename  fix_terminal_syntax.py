#!/usr/bin/env python3
"""
Quick patch script for the JSX syntax error in app/terminal/page.tsx
Specifically targets the stray `)}> ` before `{children}` pattern.
"""


import re
import shutil
from pathlib import Path


FILE = Path("app/terminal/page.tsx")
BACKUP = FILE.with_suffix(".tsx.bak")


if not FILE.exists():
    print(f"❌ File not found: {FILE}")
    exit(1)


# Create backup
shutil.copy2(FILE, BACKUP)
print(f"📦 Backup created: {BACKUP}")


original = FILE.read_text(encoding="utf-8")


# Target the exact broken pattern from your error:
#    );
# }>
#     {children}
pattern = r'\);\s*\n\s*}>\s*\n(\s*\{children\})'


fixed = re.sub(pattern, r');\n\1', original)


if fixed == original:
    print("⚠️  No matching broken pattern found.")
    print("The error might be slightly different. Paste lines 120-150 if this doesn't fix it.")
else:
    FILE.write_text(fixed, encoding="utf-8")
    print("✅ Fixed! Removed stray `)}> ` before {children}")
    print("Now run: npm run build")
