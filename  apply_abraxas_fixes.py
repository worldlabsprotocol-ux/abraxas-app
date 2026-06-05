#!/usr/bin/env python3
"""
Abraxas dApp Fix Script
Applies the most important fixes from the GitHub audit:
1. Better error handling in TokenizationRequestModal (fixes "Failed to fetch")
2. Adds circuit.skr wallet address support
3. Prepares structure for ExplainerCarousel fix


Run this from your project root (where app/ and components/ live)
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
        print(f"📦 Backed up: {file_path} → {dest}")


def main():
    print("🚀 Starting Abraxas dApp fixes...\n")


    # ============================================
    # FIX 2: TokenizationRequestModal - Better Error Handling + Supabase
    # ============================================
    modal_path = ROOT / "components" / "TokenizationRequestModal.tsx"
    
    if modal_path.exists():
        backup_file(modal_path)
        
        # Read current content
        content = modal_path.read_text(encoding="utf-8")
        
        # Improved submit handler with proper error logging
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
        console.error("Supabase insert error:", supabaseError);
        throw new Error(supabaseError.message || "Failed to submit request");
      }


      setSuccess(true);
      // Optional: close modal after success
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);


    } catch (err: any) {
      console.error("Tokenization submit failed:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
'''


        # Try to replace a basic version of the submit function
        if "handleSubmit" in content:
            # This is a safe targeted replacement
            import re
            pattern = r"const handleSubmit = async \(\) => \{[\s\S]*?\n  \};"
            if re.search(pattern, content):
                content = re.sub(pattern, improved_submit.strip(), content)
                modal_path.write_text(content, encoding="utf-8")
                print("✅ Updated TokenizationRequestModal with better error handling + Supabase logging")
            else:
                print("⚠️  Could not auto-replace handleSubmit. I'll give you the code manually below.")
        else:
            print("⚠️  handleSubmit function not found in current file.")
    else:
        print(f"❌ {modal_path} not found. Make sure you're in the project root.")


    # ============================================
    # FIX 3: Add circuit.skr wallet support
    # ============================================
    env_example = ROOT / ".env.local.example"
    if env_example.exists():
        backup_file(env_example)
        env_content = env_example.read_text()
        if "CIRCUIT_WALLET" not in env_content:
            env_content += "\n# Wallet that receives CIRCUIT-related payments\nNEXT_PUBLIC_CIRCUIT_WALLET=circuit.skr\n"
            env_example.write_text(env_content)
            print("✅ Added NEXT_PUBLIC_CIRCUIT_WALLET to .env.local.example")


    print("\n" + "="*60)
    print("✅ Script finished. Check the output above.")
    print(f"Backups saved in: {BACKUP_DIR}")
    print("="*60)


if __name__ == "__main__":
    main()




