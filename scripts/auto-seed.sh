#!/usr/bin/env bash
# Auto-seed the finance dashboard database when it is empty.
# Called by the SessionStart Claude Code hook.
# Safe to run multiple times — exits without changes if data already exists.

set -euo pipefail

API="http://localhost:3001/api"

# Check server is reachable
if ! curl -sf "$API/categories" > /dev/null 2>&1; then
  echo "[auto-seed] Server not running — skipping seed."
  exit 0
fi

# Check transaction count
TX_COUNT=$(curl -sf "$API/transactions" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")

if [ "$TX_COUNT" -gt 0 ] 2>/dev/null; then
  echo "[auto-seed] Database already has $TX_COUNT transaction(s) — skipping seed."
  exit 0
fi

echo "[auto-seed] Empty database detected — seeding with demo data…"

# Compute month labels for the last 3 months
M0=$(date +%Y-%m)
M1=$(date -d "1 month ago" +%Y-%m 2>/dev/null || date -v-1m +%Y-%m)
M2=$(date -d "2 months ago" +%Y-%m 2>/dev/null || date -v-2m +%Y-%m)

post() { curl -sf -X POST -H "Content-Type: application/json" -d "$2" "$API/$1"; }
put()  { curl -sf -X PUT  -H "Content-Type: application/json" -d "$2" "$API/$1"; }

# -- Categories --
FOOD=$(post "categories" '{"name":"Food & Groceries","color":"#10b981"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
TRAN=$(post "categories" '{"name":"Transport","color":"#3b82f6"}'        | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
ENTE=$(post "categories" '{"name":"Entertainment","color":"#8b5cf6"}'    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
UTIL=$(post "categories" '{"name":"Utilities","color":"#f59e0b"}'        | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
HLTH=$(post "categories" '{"name":"Health","color":"#ef4444"}'           | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# -- Budgets --
put "budgets/$FOOD" '{"monthly_limit":600}'
put "budgets/$TRAN" '{"monthly_limit":200}'
put "budgets/$ENTE" '{"monthly_limit":150}'
put "budgets/$UTIL" '{"monthly_limit":180}'
put "budgets/$HLTH" '{"monthly_limit":100}'

# Helper to post a transaction
tx() {
  # tx <type> <amount> <desc> <category_id> <date>
  post "transactions" "{\"type\":\"$1\",\"amount\":$2,\"description\":\"$3\",\"category_id\":$4,\"date\":\"$5\"}" > /dev/null
}

# -- Transactions: 2 months ago --
tx income  3200 "Monthly salary"       "null"  "${M2}-01"
tx income   750 "Freelance project"    "null"  "${M2}-05"
tx expense   88 "Supermarket"          "$FOOD" "${M2}-03"
tx expense   14 "Coffee shop"          "$FOOD" "${M2}-08"
tx expense   52 "Restaurant dinner"    "$FOOD" "${M2}-14"
tx expense   62 "Monthly bus pass"     "$TRAN" "${M2}-02"
tx expense   18 "Uber ride"            "$TRAN" "${M2}-11"
tx expense   15 "Netflix"              "$ENTE" "${M2}-01"
tx expense   30 "Cinema tickets"       "$ENTE" "${M2}-19"
tx expense   92 "Electricity bill"     "$UTIL" "${M2}-05"
tx expense   45 "Internet"             "$UTIL" "${M2}-10"
tx expense   38 "Pharmacy"             "$HLTH" "${M2}-07"
tx expense   40 "Gym membership"       "$HLTH" "${M2}-01"

# -- Transactions: last month --
tx income  3200 "Monthly salary"       "null"  "${M1}-01"
tx expense   95 "Supermarket"          "$FOOD" "${M1}-04"
tx expense   12 "Coffee shop"          "$FOOD" "${M1}-09"
tx expense   67 "Restaurant dinner"    "$FOOD" "${M1}-16"
tx expense   22 "Uber ride"            "$TRAN" "${M1}-06"
tx expense   62 "Monthly bus pass"     "$TRAN" "${M1}-02"
tx expense   15 "Netflix"              "$ENTE" "${M1}-01"
tx expense   85 "Electricity bill"     "$UTIL" "${M1}-07"
tx expense   45 "Internet"             "$UTIL" "${M1}-12"
tx expense   40 "Gym membership"       "$HLTH" "${M1}-01"
tx expense   25 "Pharmacy"             "$HLTH" "${M1}-20"

# -- Transactions: current month --
tx income  3200 "Monthly salary"       "null"  "${M0}-01"
tx expense   82 "Supermarket"          "$FOOD" "${M0}-02"
tx expense   15 "Coffee shop"          "$FOOD" "${M0}-05"
tx expense   62 "Monthly bus pass"     "$TRAN" "${M0}-02"
tx expense   15 "Netflix"              "$ENTE" "${M0}-01"
tx expense   45 "Internet"             "$UTIL" "${M0}-08"
tx expense   88 "Electricity bill"     "$UTIL" "${M0}-03"
tx expense   40 "Gym membership"       "$HLTH" "${M0}-01"

echo "[auto-seed] Done — 5 categories, 5 budgets, and 36 transactions created."
