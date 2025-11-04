#!/usr/bin/env bash
set -euo pipefail

# ====== ENV ======
if [[ -z "${API:-}" ]]; then
  echo "ERROR: Bitte export API='https://<region>-<project>.cloudfunctions.net/api' und nochmal starten."
  exit 1
fi

EMAIL="${TEST_EMAIL:-}"
PASS="${TEST_PASSWORD:-Passw0rd!}"

# ====== Helpers ======
have_jq() { command -v jq >/dev/null 2>&1; }
pp() { if have_jq; then jq .; else cat; fi; }

say() {
  echo
  echo "================================ $* ================================"
}

# Kleine PNG (1x1) für Upload (Base64)
one_px_png_b64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='

# Parse JSON helper (jq oder sed fallback)
json_get() {
  local payload="$1" key="$2"
  if have_jq; then
    echo "$payload" | jq -r "$key // empty"
  else
    # sehr grober Fallback (nur für einfache Felder wie "token","id","verificationUrl")
    echo "$payload" | sed -n "s/.*\"${key//./\\.}\":\"\\([^\"]*\\)\".*/\\1/p"
  fi
}

AUTH_HEADER() { echo "Authorization: Bearer $1"; }

# ====== 1) HEALTH ======
say "1) HEALTH"
curl -sS "$API/healthz" && echo

# ====== 2) VERSION ======
say "2) VERSION"
curl -sS "$API/version" | pp

# ====== 3) TAXONOMY ======
say "3) TAXONOMY"
curl -sS "$API/meta/taxonomy" | pp

# ====== 4) REGISTER (immer OK dank frischer Mail, außer TEST_EMAIL vorgegeben) ======
say "4) REGISTER"
if [[ -z "$EMAIL" ]]; then
  TS=$(date +%s)
  EMAIL="ggtest+${TS}@example.com"
fi
FIRST="GG"
LAST="Tester"
CITY="Berlin"
BIRTH="1990-01-01"

REG_RES=$(curl -sS -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"$FIRST\",\"lastName\":\"$LAST\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"birthDate\":\"$BIRTH\",\"city\":\"$CITY\"}")

echo "$REG_RES" | pp

# Hole verificationUrl (falls geliefert)
VERIFY_URL=$(json_get "$REG_RES" '.verificationUrl')

# ====== 4b) VERIFY (wenn URL vorhanden) ======
say "4b) VERIFY (falls verificationUrl vorhanden)"
if [[ -n "$VERIFY_URL" ]]; then
  curl -sS "$VERIFY_URL" | pp
else
  echo "Keine verificationUrl im Register-Response – evtl. schon verifiziert oder anderes Setup. Weiter…"
fi

# ====== 5) LOGIN ======
say "5) LOGIN"
LOGIN_RES=$(curl -sS -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
echo "$LOGIN_RES" | pp

TOKEN=$(json_get "$LOGIN_RES" '.token')
if [[ -z "$TOKEN" ]]; then
  echo "Kein JWT erhalten – Abbruch."
  exit 1
fi
AUTH="$(AUTH_HEADER "$TOKEN")"

# ====== 6) /auth/me ======
say "6) /auth/me"
curl -sS -H "$AUTH" "$API/auth/me" | pp

# ====== 7) Profil-Update (PATCH /users/me) – nur Demo ======
say "7) PATCH /users/me (Bio kurz setzen)"
curl -sS -X PATCH "$API/users/me" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"bio":"hello from env_tests.sh"}' | pp

# ====== 8) Medien-Upload (POST /posts/upload-binary) ======
say "8) POST /posts/upload-binary"
echo "$one_px_png_b64" | base64 --decode > /tmp/1x1.png
UP_RES=$(curl -sS -X POST "$API/posts/upload-binary?filename=test.png&folder=uploads&visibility=public&text=hello+world&tags=%5B%22indica%22%2C%22haze%22%5D" \
  -H "$AUTH" -H "Content-Type: image/png" --data-binary @/tmp/1x1.png)
echo "$UP_RES" | pp

POST_ID=$(json_get "$UP_RES" '.id')
MEDIA_PATH=$(json_get "$UP_RES" '.path')
if [[ -z "$POST_ID" ]]; then echo "Kein Post-ID vom Upload – überspringe Like/Comment."; else

  # ====== 9) LIKE / UNLIKE ======
  say "9) LIKE"
  curl -sS -X POST "$API/posts/$POST_ID/like" -H "$AUTH" | pp

  say "9b) UNLIKE"
  curl -sS -X POST "$API/posts/$POST_ID/unlike" -H "$AUTH" | pp

  # ====== 10) COMMENT add + list ======
  say "10) COMMENT add"
  ADD_C=$(curl -sS -X POST "$API/posts/$POST_ID/comments" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d '{"text":"hello from test script"}')
  echo "$ADD_C" | pp

  say "10b) COMMENTS list"
  curl -sS "$API/posts/$POST_ID/comments" | pp
fi

# ====== 11) /posts/mine ======
say "11) /posts/mine"
curl -sS -H "$AUTH" "$API/posts/mine?limit=5" | pp

# ====== 12) Signed URL (wenn Pfad vorhanden) ======
if [[ -n "${MEDIA_PATH:-}" ]]; then
  say "12) files/signed-get (60s)"
  CURL_SIGN=$(printf "%s" "$MEDIA_PATH" | jq -sRr @uri 2>/dev/null || printf "%s" "$MEDIA_PATH")
  curl -sS -H "$AUTH" "$API/files/signed-get?path=$CURL_SIGN&expires=60" | pp
fi

echo
echo "✅ DONE – getestet mit:"
echo "   API:        $API"
echo "   TEST_EMAIL: $EMAIL"
echo "   APP_URL:    ${APP_URL:-<unset>}"