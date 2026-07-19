#!/usr/bin/env bash
# BoxUI runtime soak sampler.
# Samples /api/runtime/memory under light API load and checks growth gates.
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: soak-runtime.sh [options]

Options:
  --base-url URL          BoxUI base URL (default: http://127.0.0.1:9091)
  --username NAME         Login username (default: $BOXUI_USERNAME or admin)
  --password PASS         Login password (default: $BOXUI_PASSWORD)
  --duration SEC          Total sample window seconds (default: 300)
  --interval SEC          Sample interval seconds (default: 10)
  --load-every N          Issue light load every N samples (default: 1)
  --max-alloc-growth-mb N Max allowed alloc growth in MiB (default: 64)
  --max-sys-growth-mb N   Max allowed sys growth in MiB (default: 96)
  --max-goroutine-growth N Max allowed goroutine growth (default: 40)
  --output PATH           CSV output path (default: ./soak-runtime.csv)
  --help                  Show this help

Pass criteria (default for 5-minute smoke soak):
  1) HTTP health and authenticated memory API remain available
  2) alloc growth <= --max-alloc-growth-mb
  3) sys growth <= --max-sys-growth-mb
  4) goroutine growth <= --max-goroutine-growth

Recommended longer soak before GA:
  --duration 86400 --interval 60 --max-alloc-growth-mb 128 --max-sys-growth-mb 192 --max-goroutine-growth 80
USAGE
}

base_url="${BOXUI_BASE_URL:-http://127.0.0.1:9091}"
username="${BOXUI_USERNAME:-admin}"
password="${BOXUI_PASSWORD:-}"
duration=300
interval=10
load_every=1
max_alloc_growth_mb=64
max_sys_growth_mb=96
max_goroutine_growth=40
output="./soak-runtime.csv"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) base_url="$2"; shift 2 ;;
    --username) username="$2"; shift 2 ;;
    --password) password="$2"; shift 2 ;;
    --duration) duration="$2"; shift 2 ;;
    --interval) interval="$2"; shift 2 ;;
    --load-every) load_every="$2"; shift 2 ;;
    --max-alloc-growth-mb) max_alloc_growth_mb="$2"; shift 2 ;;
    --max-sys-growth-mb) max_sys_growth_mb="$2"; shift 2 ;;
    --max-goroutine-growth) max_goroutine_growth="$2"; shift 2 ;;
    --output) output="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$password" ]]; then
  echo "password is required via --password or BOXUI_PASSWORD" >&2
  exit 2
fi

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "missing command: $1" >&2; exit 2; }; }
need_cmd curl
need_cmd python3

json_get() {
  local body="$1" key="$2"
  python3 - "$body" "$key" <<'PY'
import json,sys
data=json.loads(sys.argv[1])
key=sys.argv[2]
value=data
for part in key.split("."):
    value=value[part]
print(value)
PY
}

echo "Checking health at $base_url/health"
curl -fsS "$base_url/health" >/dev/null

login_body=$(python3 - <<PY
import json
print(json.dumps({"username":"$username","password":"$password"}))
PY
)
token=$(curl -fsS -H 'Content-Type: application/json' -d "$login_body" "$base_url/api/auth/login" | python3 -c 'import json,sys; payload=json.load(sys.stdin); data=payload.get("data", payload); print(data["token"])')
auth_header="Authorization: Bearer $token"

sample_memory() {
  curl -fsS -H "$auth_header" "$base_url/api/runtime/memory" | python3 -c 'import json,sys; payload=json.load(sys.stdin); data=payload.get("data", payload); print(json.dumps(data))'
}

light_load() {
  curl -fsS -H "$auth_header" "$base_url/api/service/status" >/dev/null
  curl -fsS -H "$auth_header" "$base_url/api/config/" >/dev/null
  curl -fsS -H "$auth_header" "$base_url/api/runtime/version" >/dev/null
  curl -fsS -H "$auth_header" "$base_url/api/runtime/memory" >/dev/null
}

echo "timestamp,elapsed_s,alloc,total,sys,num_gc,heap_inuse,stack_inuse,num_goroutine" > "$output"

start_ts=$(date +%s)
sample_index=0
first_alloc=""
first_sys=""
first_goroutines=""
max_alloc=0
max_sys=0
max_goroutines=0

while true; do
  now=$(date +%s)
  elapsed=$((now - start_ts))
  if (( elapsed > duration )); then
    break
  fi
  if (( sample_index % load_every == 0 )); then
    light_load
  fi
  body=$(sample_memory)
  alloc=$(json_get "$body" alloc)
  total=$(json_get "$body" total)
  sys=$(json_get "$body" sys)
  num_gc=$(json_get "$body" num_gc)
  heap_inuse=$(json_get "$body" heap_inuse)
  stack_inuse=$(json_get "$body" stack_inuse)
  num_goroutine=$(json_get "$body" num_goroutine)
  ts=$(date -Iseconds)
  echo "$ts,$elapsed,$alloc,$total,$sys,$num_gc,$heap_inuse,$stack_inuse,$num_goroutine" >> "$output"

  if [[ -z "$first_alloc" ]]; then
    first_alloc=$alloc
    first_sys=$sys
    first_goroutines=$num_goroutine
  fi
  (( alloc > max_alloc )) && max_alloc=$alloc
  (( sys > max_sys )) && max_sys=$sys
  (( num_goroutine > max_goroutines )) && max_goroutines=$num_goroutine

  sample_index=$((sample_index + 1))
  remaining=$((duration - elapsed))
  if (( remaining <= 0 )); then
    break
  fi
  sleep_for=$interval
  if (( remaining < interval )); then
    sleep_for=$remaining
  fi
  sleep "$sleep_for"
done

python3 - "$output" "$first_alloc" "$first_sys" "$first_goroutines" "$max_alloc" "$max_sys" "$max_goroutines" \
  "$max_alloc_growth_mb" "$max_sys_growth_mb" "$max_goroutine_growth" <<'PY'
import sys
from pathlib import Path

path, first_alloc, first_sys, first_go, max_alloc, max_sys, max_go, lim_alloc, lim_sys, lim_go = sys.argv[1:]
first_alloc=int(first_alloc); first_sys=int(first_sys); first_go=int(first_go)
max_alloc=int(max_alloc); max_sys=int(max_sys); max_go=int(max_go)
lim_alloc=float(lim_alloc); lim_sys=float(lim_sys); lim_go=int(lim_go)
rows=Path(path).read_text().strip().splitlines()
print(f"samples={len(rows)-1} output={path}")
alloc_growth_mb=(max_alloc-first_alloc)/1024/1024
sys_growth_mb=(max_sys-first_sys)/1024/1024
go_growth=max_go-first_go
print(f"alloc: first={first_alloc} peak={max_alloc} growth_mib={alloc_growth_mb:.2f} limit={lim_alloc}")
print(f"sys: first={first_sys} peak={max_sys} growth_mib={sys_growth_mb:.2f} limit={lim_sys}")
print(f"goroutine: first={first_go} peak={max_go} growth={go_growth} limit={lim_go}")
failed=[]
if alloc_growth_mb > lim_alloc: failed.append("alloc growth")
if sys_growth_mb > lim_sys: failed.append("sys growth")
if go_growth > lim_go: failed.append("goroutine growth")
if failed:
    print("SOAK_FAIL: " + ", ".join(failed))
    raise SystemExit(1)
print("SOAK_PASS")
PY
