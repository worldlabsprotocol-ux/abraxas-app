#!/usr/bin/env python3
"""
Run this from your project root:
  python3 fix_issuance.py

This patches components/IssuanceEngine.tsx in-place.
No copy-paste required.
"""
import re, sys

path = "components/IssuanceEngine.tsx"
try:
    content = open(path).read()
except FileNotFoundError:
    print(f"ERROR: {path} not found. Run from project root.")
    sys.exit(1)

original = content
fixes_applied = []

# FIX 1: Ensure React and CSSProperties are imported correctly
old_react = 'import { useState, useCallback, useRef }    from "react";'
new_react = 'import React, { useState, useCallback, useRef, type CSSProperties } from "react";'
if old_react in content:
    content = content.replace(old_react, new_react, 1)
    fixes_applied.append("Added React default import + CSSProperties type")

# Also handle variant without extra spaces
old_react2 = 'import { useState, useCallback, useRef } from "react";'
if old_react2 in content and 'import React,' not in content:
    content = content.replace(old_react2, new_react, 1)
    fixes_applied.append("Added React default import + CSSProperties type (compact)")

# Remove duplicate "use client" — keep only the first one
use_client_count = content.count('"use client";')
if use_client_count > 1:
    # Keep first occurrence, remove all others
    first_idx = content.index('"use client";')
    rest = content[first_idx + len('"use client";'):]
    rest = rest.replace('"use client";', '')
    content = content[:first_idx + len('"use client";')] + rest
    fixes_applied.append(f"Removed {use_client_count-1} duplicate 'use client'")

# Ensure "use client" is the very first line
lines = content.splitlines()
if lines[0] != '"use client";':
    # Find first "use client" and move it to top
    for i, l in enumerate(lines):
        if l.strip() == '"use client";':
            lines.pop(i)
            lines.insert(0, '"use client";')
            content = "\n".join(lines) + "\n"
            fixes_applied.append("Moved 'use client' to line 1")
            break

# FIX 2: Replace React.CSSProperties with CSSProperties
if 'React.CSSProperties' in content:
    count = content.count('React.CSSProperties')
    content = content.replace('React.CSSProperties', 'CSSProperties')
    fixes_applied.append(f"Replaced {count} React.CSSProperties with CSSProperties")

# FIX 3: Change export function to export default function
if 'export function IssuanceEngine' in content:
    content = content.replace(
        'export function IssuanceEngine',
        'export default function IssuanceEngine',
        1
    )
    fixes_applied.append("Changed to export default function")

# FIX 4: Fix labelStyle — ensure return object is properly closed
# Pattern: return {fontSize:...,letterSpacing:...,marginBottom:...}; or missing };
lines = content.splitlines()
for i, line in enumerate(lines):
    if 'function labelStyle' in line:
        # Look ahead for the return line
        for j in range(i+1, min(i+8, len(lines))):
            if 'return {' in lines[j] or 'return{' in lines[j]:
                # Find the closing of this return — should have };
                # Check if the return spans multiple lines without a };
                combined = ""
                end_j = j
                for k in range(j, min(j+6, len(lines))):
                    combined += lines[k]
                    if '};' in lines[k] and k > j:
                        end_j = k
                        break
                    if '};' in lines[k] and k == j:
                        end_j = k
                        break
                
                # If marginBottom is on a line that doesn't end with };
                for k in range(j, end_j+2):
                    if k < len(lines) and 'marginBottom' in lines[k] and '};' not in lines[k]:
                        if lines[k].rstrip().endswith(','):
                            lines[k] = lines[k].rstrip().rstrip(',') + '};'
                            fixes_applied.append(f"Fixed labelStyle return closing at line {k+1}")
                        elif not lines[k].rstrip().endswith('};'):
                            lines[k] = lines[k].rstrip() + '};'
                            fixes_applied.append(f"Added }; to labelStyle return at line {k+1}")
                break
        break

content = "\n".join(lines) + "\n"

# Write back
if content != original:
    open(path, "w").write(content)
    print(f"✅ Fixed {path}")
    for fix in fixes_applied:
        print(f"   • {fix}")
else:
    print("⚠️  No changes needed — file may already be correct OR may need manual fix")
    print("   Try running: cat -n components/IssuanceEngine.tsx | head -20")

# Validate: check no import inside JSX
lines = content.splitlines()
stray = [(i+1, l) for i,l in enumerate(lines) if i > 25 and l.strip().startswith("import ")]
if stray:
    print(f"\n⚠️  WARNING: {len(stray)} imports still found inside JSX:")
    for ln, l in stray: print(f"   Line {ln}: {l.strip()[:60]}")
else:
    print("✅ No stray imports found")

use_client_count = content.count('"use client"')
print(f"{'✅' if use_client_count == 1 else '⚠️'} 'use client' count: {use_client_count}")

has_react = 'import React,' in content
print(f"{'✅' if has_react else '⚠️'} React default import: {has_react}")