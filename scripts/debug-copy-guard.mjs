const text = "This is premium copy — not acceptable.";
const checks = [
  [!/\s/.test(text), "no space"],
  [/^\/[a-z]/.test(text), "path"],
  [/px|rem|em\b|solid|var\(--|JetBrains|Inter|ease-in-out/.test(text), "css"],
  [/[A-Z][A-Z0-9_]{4,}/.test(text), "SCREAMING"],
];
for (const [v, n] of checks) if (v) console.log("technical:", n);
console.log("prose", /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(text));
console.log("em", text.includes("—"));
