#!/usr/bin/env bash
# Run Emeka Savants on this machine and open it in the browser.
#   ./scripts/start-local.sh
# First run installs dependencies and asks for an optional Anthropic API key (kept in .env.local,
# which git ignores). Without a key the savants run on the built-in simulator.
set -euo pipefail
cd "$(dirname "$0")/.."

need_node_major=22
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ${need_node_major}+ is required: https://nodejs.org (or: brew install node)" >&2
  exit 1
fi
major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$major" -lt "$need_node_major" ]; then
  echo "Node.js ${need_node_major}+ is required; found $(node -v)." >&2
  exit 1
fi

[ -d node_modules ] || npm install

if [ ! -f .env.local ]; then
  read -r -s -p "Anthropic API key (Enter to use the simulator): " key || true
  echo
  workspace=""
  if [ -n "${key:-}" ]; then
    read -r -p "Anthropic workspace ID, if the key is not scoped to one (Enter to skip): " workspace || true
  fi
  umask 077
  {
    echo "ANTHROPIC_API_KEY=${key:-}"
    echo "ANTHROPIC_WORKSPACE_ID=${workspace:-}"
  } > .env.local
fi

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"
( for _ in $(seq 1 60); do
    if curl -fs "${URL}/api/state" >/dev/null 2>&1; then
      if command -v open >/dev/null 2>&1; then open "$URL"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"; fi
      echo "Savants is running at ${URL} (voice needs Chrome or Edge)."
      break
    fi
    sleep 1
  done ) &

# Bind to loopback only: the workspace has no login yet.
exec npx next dev -H 127.0.0.1 -p "$PORT"
