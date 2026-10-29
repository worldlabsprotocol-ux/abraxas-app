# Cloud agent PR delivery

Before creating or updating a pull request:

1. Run `gh pr view <number> --json state,mergedAt` (or check GitHub) and confirm the PR is **OPEN**.
2. If the previous build PR is **MERGED**, create a new branch from current `main` and open a **new** PR. Do not push new product commits onto the merged branch and do not describe an merged PR as the delivery vehicle.
3. If commits landed on a stale branch after merge, **cherry-pick** only unmerged commits onto a fresh branch from `main`.

Every completed engineering delivery must have a valid, open PR that contains its actual changes.
