# Push your CMN photos to GitHub (Windows)

Your `cmn1.jpg` … `cmn29.jpg` files are **only on your PC** until you commit and push.  
The agent and Vercel cannot see files that are not on GitHub.

## One-time setup (if VS Code asks for Git)

1. Install **Git for Windows**: https://git-scm.com/download/win  
2. Open **Git Bash** (Start menu → type `Git Bash`)  
3. Set your name/email (once):

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

## Every time you add photos

Open **Git Bash** and run these lines **one at a time**.  
Change the path if your project folder is different.

```bash
cd "/c/Users/deant/OneDrive/Desktop/abraxas-app-main/abraxas-app-main"
```

```bash
git status
```

You should see `public/assets/cmn-designs/cmn*.jpg` listed.

```bash
git checkout cursor/cmn-pokemon-registry-d541
```

If that branch does not exist locally:

```bash
git fetch origin
git checkout -b cursor/cmn-pokemon-registry-d541 origin/cursor/cmn-pokemon-registry-d541
```

```bash
git add public/assets/cmn-designs/*.jpg
```

```bash
git commit -m "Add CMN Designs slab photos"
```

```bash
git push -u origin cursor/cmn-pokemon-registry-d541
```

If push asks for login, use a **GitHub Personal Access Token** as the password (not your GitHub password).  
Create one: GitHub → Settings → Developer settings → Personal access tokens.

## After push

1. Open the PR on GitHub (branch `cursor/cmn-pokemon-registry-d541`)  
2. Merge it, or wait for Vercel preview on that branch  
3. Check homepage registry — **CMN Designs · PSA Pokémon Vault** should appear with slideshow

## Photo folder (reminder)

```
public/assets/cmn-designs/
  cmn1.jpg … cmn29.jpg   (no cmn8.jpg)
  cmn21.jpg = main hero image
```

## VS Code alternative (no Git Bash)

1. Open VS Code → **Source Control** icon (left sidebar, branch icon)  
2. You should see changed files under `public/assets/cmn-designs/`  
3. Click **+** next to each file (or **Stage All Changes**)  
4. Type commit message: `Add CMN Designs slab photos`  
5. Click **Commit**  
6. Click **Sync Changes** or **Publish Branch**  

If Sync fails, you still need GitHub login configured once in VS Code (Accounts icon → Sign in to GitHub).
