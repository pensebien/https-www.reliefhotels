# Git setup — Relief Hotels

Remote repository:

`git@github.com:pensebien/https-www.reliefhotels.git`

Run these commands from your machine:

```bash
cd /Users/macbookpro/projects/hotels-website-kalu/reliefhotels

# If not already a git repo:
git init
git branch -M main

# Connect remote
git remote add origin git@github.com:pensebien/https-www.reliefhotels.git
# If remote already exists:
# git remote set-url origin git@github.com:pensebien/https-www.reliefhotels.git

git add .
git commit -m "feat: relief hotels site with phased feature modules"
git push -u origin main
```

## Optional: worktrees per phase (for parallel teammates)

After the repo exists on GitHub:

```bash
git fetch origin

git worktree add ../reliefhotels-phase-1 -b feature/phase-1-foundation origin/main
git worktree add ../reliefhotels-phase-2 -b feature/phase-2-product-expansion origin/main
git worktree add ../reliefhotels-phase-3 -b feature/phase-3-production-polish origin/main
```

Merge order recommendation:

1. `feature/phase-1-foundation`
2. `feature/phase-2-product-expansion`
3. `feature/phase-3-production-polish`
