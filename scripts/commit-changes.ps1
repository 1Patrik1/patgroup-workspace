<#
PowerShell helper to stage and commit changes in this repo.
Run from repository root:
  .\scripts\commit-changes.ps1

This script checks for `git` and then runs the standard commands.
Edit the user.name / user.email lines if needed.
#>

try {
    $git = Get-Command git -ErrorAction Stop
} catch {
    Write-Error "Git not found. Install Git from https://git-scm.com/ and re-run this script."
    exit 1
}

# Configure identity if not set (comment/uncomment to enforce)
git config --local user.name "Your Name"
git config --local user.email "you@example.com"

Write-Output "Checking working tree..."
git status --porcelain

Write-Output "Staging all changes..."
git add -A

Write-Output "Committing..."
git commit -m "chore: persist test data and verification" || Write-Output "No changes to commit or commit failed"

Write-Output "Branch: $(git rev-parse --abbrev-ref HEAD)"
git log -1 --stat

Write-Output "If you want to push to origin, run: git push origin HEAD"
