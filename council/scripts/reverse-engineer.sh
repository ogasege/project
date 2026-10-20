#!/usr/bin/env bash
# Reproduce the REA (https://github.com/morluto/rea) analysis behind docs/REVERSE_ENGINEERING.md.
# Downloads the JavaScript that Linear and Notion ship on npm into an isolated work directory and
# runs REA's static JavaScript application analysis on each. Nothing is executed from the packages.
#
#   ./scripts/reverse-engineer.sh [workdir]
set -euo pipefail

WORK="${1:-$(mktemp -d)}"
mkdir -p "$WORK/targets" "$WORK/evidence"
PACKAGES=("@linear/sdk@98.0.0" "@notionhq/client@5.27.1" "notion-client@8.0.8" "notion-types@8.0.8")

for spec in "${PACKAGES[@]}"; do
  dir="$WORK/targets/$(echo "$spec" | tr '@/' '__')"
  mkdir -p "$dir"
  (cd "$dir" && tarball="$(npm pack "$spec" --silent | tail -1)" && tar xzf "$tarball")
done

for spec in "${PACKAGES[@]:0:3}"; do
  name="$(echo "$spec" | tr '@/' '__')"
  # Run REA from the work dir, never from inside a downloaded package.
  (cd "$WORK" && npx -y rea-agents@latest analyze-javascript-application "$WORK/targets/$name/package" --json \
    > "$WORK/evidence/$name.json" 2> "$WORK/evidence/$name.progress")
  echo "REA evidence: $WORK/evidence/$name.json"
done
