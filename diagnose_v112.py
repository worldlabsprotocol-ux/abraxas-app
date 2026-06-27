#!/usr/bin/env python3
"""diagnose_v112.py — checks the actual state of package.json and the
lockfile on your machine, and prints exactly what's there, instead of
guessing again at why Vercel can't resolve tailwindcss. Run this
first, before anything else, and send me the output."""
import json
import os
import sys

if not os.path.exists("app"):
    sys.exit("run from project root")

print("=== package.json dependencies ===")
with open("package.json", "r", encoding="utf-8") as f:
    pkg = json.load(f)
deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
for name in ["tailwindcss", "@tailwindcss/postcss"]:
    print(f"{name}: {deps.get(name, 'NOT FOUND IN package.json')}")

print()
print("=== package-lock.json ===")
if not os.path.exists("package-lock.json"):
    print("package-lock.json DOES NOT EXIST, this alone could be the whole problem")
else:
    with open("package-lock.json", "r", encoding="utf-8") as f:
        lock = json.load(f)
    found = [k for k in lock.get("packages", {}).keys() if "tailwindcss" in k]
    print(f"tailwindcss-related entries in lockfile: {found if found else 'NONE FOUND'}")

print()
print("=== postcss.config.mjs ===")
print("exists" if os.path.exists("postcss.config.mjs") else "DOES NOT EXIST")

print()
print("=== node_modules check ===")
print("tailwindcss installed locally:" , os.path.exists("node_modules/tailwindcss"))

print()
print("=== git status, is anything uncommitted? ===")
os.system("git status --short")
