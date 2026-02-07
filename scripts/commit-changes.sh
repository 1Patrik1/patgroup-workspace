#!/usr/bin/env bash
# POSIX helper to stage and commit changes in this repo.
# Run from repository root:
#   ./scripts/commit-changes.sh

if ! command -v git >/dev/null 2>&1; then
  echo "Git not found. Install Git from https://git-scm.com/ and re-run this script." >&2
  exit 1
fi

# Configure identity if not set (edit if desired)
git config --local user.name "Your Name"
git config --local user.email "you@example.com"

echo "Checking working tree..."
git status --porcelain

echo "Staging all changes..."
git add -A

echo "Committing..."
git commit -m "chore: persist test data and verification" || echo "No changes to commit or commit failed"

echo "Branch: $(git rev-parse --abbrev-ref HEAD)"
git log -1 --stat

echo "If you want to push to origin, run: git push origin HEAD"
