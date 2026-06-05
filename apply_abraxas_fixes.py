#!/usr/bin/env python3
"""
Abraxas dApp Fix Script
Applies the most important fixes from the GitHub audit
"""


import shutil
from pathlib import Path
from datetime import datetime


ROOT = Path(".")
BACKUP_DIR = ROOT / "backups" / datetime.now().strftime("%Y%m%d_%H%M%S")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def backup_file(file_path: Path):
    if file_path.exists():
        dest = BACKUP_DIR / file_path.name
        shutil.copy2(file_path, dest)
        print(f"📦 Backed up: {file_path}")


def main():
    print("🚀 Starting Abraxas fixes...\n")


    # === Fix TokenizationRequestModal ===
    modal_path = ROOT / "components" / "TokenizationRequestModal.tsx"
    
    if modal_path.exists():
        backup_file(modal_path)
        content = modal_path.read_text(encoding="utf-8")


        improved_submit = '''
  const handleSubmit = async () => {
    if (!initialTier && !selectedTier) return;


    setLoading(true);
    setError(null);


    try {
      const { data, error: supabaseError } = await supabase
        .from("tokenization_requests")
        .insert({
          tier: initialTier || selectedTier,
          wallet_address: walletAddress || null,
          status: "pending",
          created_at: new Date().toISOString(),
        });


      if (supabaseError) {
        console.error("Supabase error:", supabaseError);
        throw new Error(supabaseError.message || "Failed to submit");
      }


      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1800);


    } catch (err: any) {
      console.error("Tokenization failed:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
'''


        import re
        pattern = r"const handleSubmit = async \(\) => \{[\s\S]*?\n  \};"
        
        if re.search(pattern, content):
            content = re.sub(pattern, improved_submit.strip(), content)
            modal_path.write_text(content, encoding="utf-8")
            print("✅ Improved TokenizationRequestModal with better error handling")
        else:
            print("⚠️  Could not auto-update handleSubmit. Manual edit needed.")
    else:
        print("❌ components/TokenizationRequestModal.tsx not found")


    # === Add circuit.skr wallet to .env.example ===
    env_path = ROOT / ".env.local.example"
    if env_path.exists():
        backup_file(env_path)
        env_content = env_path.read_text()
        if "CIRCUIT_WALLET" not in env_content:
            env_content += "\n# Wallet for CIRCUIT-related payments\nNEXT_PUBLIC_CIRCUIT_WALLET=circuit.skr\n"
            env_path.write_text(env_content)
            print("✅ Added NEXT_PUBLIC_CIRCUIT_WALLET to .env.local.example")


    print("\n✅ Done! Backups saved in:", BACKUP_DIR)
    print("Now run: npm run build")


if __name__ == "__main__":
    main()
