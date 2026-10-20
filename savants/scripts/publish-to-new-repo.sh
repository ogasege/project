#!/usr/bin/env bash
# Publish the savants/ folder (with its full commit history) as the root of a new GitHub repo.
#
# 1. Create an EMPTY repo on GitHub, e.g. https://github.com/new  →  ogasege/savants (no README).
# 2. From the root of the repo that contains this folder, run:
#      ./savants/scripts/publish-to-new-repo.sh git@github.com:ogasege/savants.git
set -euo pipefail

REMOTE="${1:?usage: publish-to-new-repo.sh <new-repo-git-url>}"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PREFIX="savants"
BRANCH="savants-export-$$"

git subtree split --prefix="$PREFIX" -b "$BRANCH"
git push "$REMOTE" "$BRANCH:main"
git branch -D "$BRANCH"
echo "Published $PREFIX/ to $REMOTE (branch main)."
