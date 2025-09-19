#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-https://europe-west3-growgram-backend.cloudfunctions.net/api}"
EMAIL="${TEST_EMAIL:?TEST_EMAIL fehlt in .env}"
PASSWORD="${TEST_PASSWORD:?TEST_PASSWORD fehlt in .env}"

echo "🔐 Login…"
TOKEN=$(curl -sS -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "❌ Login fehlgeschlagen"; exit 1
fi

IMG="functions/scripts/sample.jpg"
if [[ ! -f "$IMG" ]]; then
  printf '\xff\xd8\xff\xd9' > "$IMG"   # Mini-JPEG
fi

echo "⬆️  Upload…"
RESP=$(curl -sS -w "\nHTTP:%{http_code}\n" -X POST "$API_BASE/posts/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$IMG;type=image/jpeg" \
  -F 'text=Upload-Test via curl' \
  -F 'tags=["kush","homegrow"]' \
  -F 'visibility=public')

echo "$RESP"