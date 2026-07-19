#!/usr/bin/env bash
# Live API smoke E2E against a running boxd instance.
# Flow: login → read config → mutate experimental marker → save → verify status + app logs.
set -euo pipefail

base_url="${BOXD_BASE_URL:-http://127.0.0.1:9091}"
username="${BOXD_USERNAME:-admin}"
password="${BOXD_PASSWORD:-}"

usage() {
  cat <<'USAGE'
Usage: e2e-live.sh [--base-url URL] [--username NAME] [--password PASS]

Environment:
  BOXD_BASE_URL   default http://127.0.0.1:9091
  BOXD_USERNAME   default admin
  BOXD_PASSWORD   required unless --password is set

Steps:
  1. health check
  2. login
  3. get config and service status
  4. write a temporary experimental.cache_file.cache_id marker via config PUT
  5. verify marker persisted
  6. restore previous config
  7. verify service status and app-log stream
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) base_url="$2"; shift 2 ;;
    --username) username="$2"; shift 2 ;;
    --password) password="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ -z "$password" ]]; then
  echo "password is required via --password or BOXD_PASSWORD" >&2
  exit 2
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing $1" >&2; exit 2; }; }
need curl
need python3

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

unwrap_json() {
  python3 - "$1" <<'PY'
import json,sys
from pathlib import Path
payload=json.loads(Path(sys.argv[1]).read_text())
if isinstance(payload, dict) and "data" in payload and "status" in payload:
    print(json.dumps(payload["data"]))
else:
    print(json.dumps(payload))
PY
}

echo "==> health"
curl -fsS "$base_url/health" >"$tmp/health.json"
python3 -c 'import json,sys; print("health:", json.load(open(sys.argv[1])))' "$tmp/health.json"

echo "==> login"
python3 -c 'import json,sys; print(json.dumps({"username":sys.argv[1],"password":sys.argv[2]}))' "$username" "$password" >"$tmp/login.json"
curl -fsS -H 'Content-Type: application/json' -d @"$tmp/login.json" "$base_url/api/auth/login" >"$tmp/auth.json"
token=$(python3 -c 'import json,sys; payload=json.load(open(sys.argv[1])); data=payload.get("data", payload); print(data["token"])' "$tmp/auth.json")
auth="Authorization: Bearer $token"
echo "login ok"

echo "==> service status"
curl -fsS -H "$auth" "$base_url/api/service/status" >"$tmp/status.raw.json"
unwrap_json "$tmp/status.raw.json" >"$tmp/status.json"
python3 -c 'import json,sys; status=json.load(open(sys.argv[1])); assert "running" in status, status; print("service running=", status.get("running"), "uptime=", status.get("uptime"))' "$tmp/status.json"

echo "==> get config"
curl -fsS -H "$auth" "$base_url/api/config/" >"$tmp/config.raw.json"
unwrap_json "$tmp/config.raw.json" >"$tmp/config.json"
python3 -c '
import json, time
from pathlib import Path
import sys
cfg=json.loads(Path(sys.argv[1]).read_text())
Path(sys.argv[2]).write_text(json.dumps(cfg))
experimental=cfg.get("experimental")
if not isinstance(experimental, dict):
    experimental={}
cache=experimental.get("cache_file")
if not isinstance(cache, dict):
    cache={}
marker=f"e2e-{int(time.time())}"
cache=dict(cache)
cache["cache_id"]=marker
experimental=dict(experimental)
experimental["cache_file"]=cache
cfg=dict(cfg)
cfg["experimental"]=experimental
Path(sys.argv[3]).write_text(json.dumps(cfg))
Path(sys.argv[4]).write_text(marker)
print("marker=", marker)
' "$tmp/config.json" "$tmp/config.original.json" "$tmp/config.mutated.json" "$tmp/marker.txt"

echo "==> put mutated config"
curl -fsS -X PUT -H "$auth" -H 'Content-Type: application/json' --data-binary @"$tmp/config.mutated.json" "$base_url/api/config/" >"$tmp/put.json"
python3 -c 'import json,sys; resp=json.load(open(sys.argv[1])); assert resp.get("status") != "rolled_back", resp; print("put status=", resp.get("status", resp))' "$tmp/put.json"

echo "==> verify marker"
curl -fsS -H "$auth" "$base_url/api/config/" >"$tmp/config.after.raw.json"
unwrap_json "$tmp/config.after.raw.json" >"$tmp/config.after.json"
python3 -c '
import json,sys
from pathlib import Path
cfg=json.loads(Path(sys.argv[1]).read_text())
marker=Path(sys.argv[2]).read_text().strip()
experimental=cfg.get("experimental") or {}
cache=experimental.get("cache_file") or {}
got=cache.get("cache_id")
assert got==marker, (got, marker)
print("marker verified")
' "$tmp/config.after.json" "$tmp/marker.txt"

echo "==> restore original config"
curl -fsS -X PUT -H "$auth" -H 'Content-Type: application/json' --data-binary @"$tmp/config.original.json" "$base_url/api/config/" >"$tmp/restore.json"
python3 -c 'import json,sys; resp=json.load(open(sys.argv[1])); assert resp.get("status") != "rolled_back", resp; print("restore status=", resp.get("status"))' "$tmp/restore.json"

echo "==> status after restore"
curl -fsS -H "$auth" "$base_url/api/service/status" >"$tmp/status2.raw.json"
unwrap_json "$tmp/status2.raw.json" >"$tmp/status2.json"
python3 -c 'import json,sys; status=json.load(open(sys.argv[1])); assert "running" in status; print("service running=", status.get("running"))' "$tmp/status2.json"

echo "==> app logs stream sample"
python3 -c '
import sys, urllib.request
base, token = sys.argv[1], sys.argv[2]
req=urllib.request.Request(base + "/api/stats/app-logs", headers={"Authorization":"Bearer " + token, "Accept":"text/event-stream"})
with urllib.request.urlopen(req, timeout=5) as resp:
    chunk=resp.read(256)
    assert chunk, "empty app log stream"
    print("app-log bytes=", len(chunk))
' "$base_url" "$token"

echo "==> memory baseline sample"
curl -fsS -H "$auth" "$base_url/api/runtime/memory" >"$tmp/memory.raw.json"
unwrap_json "$tmp/memory.raw.json" >"$tmp/memory.json"
python3 -c '
import json,sys
mem=json.load(open(sys.argv[1]))
for key in ("alloc","sys","num_gc","heap_inuse","stack_inuse","num_goroutine"):
    assert key in mem, mem
print("memory ok goroutines=", mem["num_goroutine"], "alloc=", mem["alloc"])
' "$tmp/memory.json"

echo "E2E_LIVE_PASS"
