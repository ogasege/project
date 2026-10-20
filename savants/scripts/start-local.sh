#!/usr/bin/env bash
# Run Emeka Savants on this machine and open it in the browser.
#   ./scripts/start-local.sh
# Installs dependencies (again whenever the lockfile changes), asks for an Anthropic API key if
# .env.local has none (Enter skips it and uses the built-in simulator), and saves
# ANTHROPIC_WORKSPACE_ID when you pass it in:
#   ANTHROPIC_WORKSPACE_ID=wrkspc_… ./scripts/start-local.sh
# .env.local is git-ignored and readable only by you.
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

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm install
fi

umask 077
touch .env.local
chmod 600 .env.local
env_get() { grep -E "^$1=" .env.local | tail -n 1 | cut -d= -f2- || true; }
env_set() {
  { grep -v -E "^$1=" .env.local || true; echo "$1=$2"; } > .env.local.tmp
  mv .env.local.tmp .env.local
}

if [ -z "$(env_get ANTHROPIC_API_KEY)" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  read -r -s -p "Anthropic API key (Enter to use the simulator): " key || true
  echo
  env_set ANTHROPIC_API_KEY "${key:-}"
fi
if [ -n "${ANTHROPIC_WORKSPACE_ID:-}" ]; then
  env_set ANTHROPIC_WORKSPACE_ID "$ANTHROPIC_WORKSPACE_ID"
elif [ -z "$(env_get ANTHROPIC_WORKSPACE_ID)" ] && [[ "$(env_get ANTHROPIC_API_KEY)" == sk-ant-usr-* ]]; then
  read -r -p "This key needs a workspace ID (wrkspc_…): " workspace || true
  env_set ANTHROPIC_WORKSPACE_ID "${workspace:-}"
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
