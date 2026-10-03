#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../../.." && pwd)"
cd "$root"

for command in curl lsof pnpm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing dependency: %s\n' "$command" >&2
    exit 1
  fi
done

printf 'Checkout: %s\nRevision: %s\npnpm: %s\n' "$root" "$(git rev-parse --short HEAD)" "$(pnpm --version)"

web_origin="${1:-http://localhost:3001}"
if [[ ! "$web_origin" =~ ^http://localhost:[0-9]+$ ]]; then
  printf "Doctor requires a localhost web origin with an explicit port.\n" >&2
  exit 1
fi
web_port="${web_origin##*:}"

for port in 3000 "$web_port"; do
  pids="$(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u || true)"
  if [[ -z "$pids" ]]; then
    printf 'Port %s has no listener. Launch the matching dev:local stage first.\n' "$port" >&2
    exit 1
  fi

  for pid in $pids; do
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2-)"
    if [[ "$cwd" != "$root" && "$cwd" != "$root/"* ]]; then
      printf 'Port %s belongs to PID %s outside this checkout. Do not drive or kill it.\n' "$port" "$pid" >&2
      exit 1
    fi
    printf 'Port %s: PID %s, cwd %s\n' "$port" "$pid" "$cwd"
  done
done

if lsof -nP -t -iTCP:4173 -sTCP:LISTEN >/dev/null 2>&1; then
  printf 'Port 4173 is occupied. Wait for its owner; do not launch a competing preview.\n' >&2
  exit 1
fi

curl --fail --silent --show-error --max-time 5 --output /dev/null http://localhost:3000/
curl --fail --silent --show-error --max-time 5 --output /dev/null "$web_origin/login"
printf 'Ready: API and login respond; preview port is free. Authentication is not checked.\n'
