#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/_backups"
DATE_TAG="$(date +"%Y-%m-%d_%H-%M-%S")"

FIREBASE_PROJECT_ID_DEV="growgram-backend"
GCS_BUCKET="gs://growgram-backups"   # optional

mkdir -p "${BACKUP_DIR}/${DATE_TAG}"

echo "==> 1) Code-Zip erstellen"
pushd "${PROJECT_ROOT}" >/dev/null
zip -r "${BACKUP_DIR}/${DATE_TAG}/GrowGramMobile_${DATE_TAG}.zip" "GrowGramMobile" -x "**/node_modules/**" "**/.expo/**" "**/.git/**"
zip -r "${BACKUP_DIR}/${DATE_TAG}/GrowGramBackend_${DATE_TAG}.zip" "GrowGramBackend" -x "**/node_modules/**" "**/dist/**" "**/.git/**"
popd >/dev/null

echo "==> 2) Firebase Functions Config exportieren"
pushd "${PROJECT_ROOT}/GrowGramBackend" >/dev/null
firebase functions:config:get --project "${FIREBASE_PROJECT_ID_DEV}" > "${BACKUP_DIR}/${DATE_TAG}/functions.config.dev.json"
popd >/dev/null

echo "==> 3) Firebase Rules exportieren"
pushd "${PROJECT_ROOT}/GrowGramBackend" >/dev/null
firebase firestore:rules:get --project "${FIREBASE_PROJECT_ID_DEV}" > "${BACKUP_DIR}/${DATE_TAG}/firestore.rules.dev"
firebase storage:rules:get   --project "${FIREBASE_PROJECT_ID_DEV}" > "${BACKUP_DIR}/${DATE_TAG}/storage.rules.dev"
popd >/dev/null

echo "==> 4) firebase.json und .firebaserc sichern"
cp "${PROJECT_ROOT}/GrowGramBackend/firebase.json" "${BACKUP_DIR}/${DATE_TAG}/firebase.json" || true
cp "${PROJECT_ROOT}/GrowGramBackend/.firebaserc"   "${BACKUP_DIR}/${DATE_TAG}/.firebaserc"   || true

echo "==> 5) (Optional) Firestore Export in GCS"
if command -v gcloud >/dev/null 2>&1; then
  if gsutil ls "${GCS_BUCKET}" >/dev/null 2>&1; then
    gcloud config set project "${FIREBASE_PROJECT_ID_DEV}" >/dev/null
    gcloud firestore export "${GCS_BUCKET}/firestore_${DATE_TAG}" --async
    echo "   -> Firestore Export gestartet."
  else
    echo "   ! GCS Bucket ${GCS_BUCKET} nicht erreichbar – übersprungen."
  fi
else
  echo "   ! 'gcloud' nicht installiert – übersprungen."
fi

echo "==> 6) Checksums erzeugen"
pushd "${BACKUP_DIR}/${DATE_TAG}" >/dev/null
shasum -a 256 *.zip > SHA256SUMS.txt
popd >/dev/null

echo "==> Backup fertig in: ${BACKUP_DIR}/${DATE_TAG}"
