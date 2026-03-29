#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────
# Push workspace ke GitHub — LESAVI AM Dashboard
# Usage: bash _push-to-github.sh "commit message"
# ─────────────────────────────────────────────────────────────

COMMIT_MSG="${1:-chore: update}"
GITHUB_REPO="portodit/LESAVI-SURAMADU"
BRANCH="master"
GIT_NAME="portodit"
GIT_EMAIL="97856960+portodit@users.noreply.github.com"

# ── Cek token (prioritas: GITHUB_PAT > GITHUB_TOKEN) ───────────
TOKEN="${GITHUB_PAT:-$GITHUB_TOKEN}"
if [ -z "$TOKEN" ]; then
  echo "❌ Token belum diset. Tambahkan Replit Secret:"
  echo "   Key: GITHUB_PAT  (direkomendasikan, PAT pribadimu)"
  echo "   Key: GITHUB_TOKEN (fallback)"
  exit 1
fi
echo "✅ Token ditemukan (${#TOKEN} karakter)"

# ── Siapkan folder temp ────────────────────────────────────────
TMP_DIR="/tmp/lesavi-push-$$"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

REMOTE_URL="https://portodit:${TOKEN}@github.com/${GITHUB_REPO}.git"

echo "📥 Clone repo GitHub..."
git clone --depth=1 --branch "$BRANCH" "$REMOTE_URL" "$TMP_DIR" 2>&1 | grep -v "$TOKEN" || true

# ── Bersihkan isi repo lama (kecuali .git) ─────────────────────
find "$TMP_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} + 2>/dev/null || true

# ── Copy source code dari workspace ────────────────────────────
echo "📂 Menyalin source code..."
SRC="/home/runner/workspace"

cp -r "$SRC/." "$TMP_DIR/"

# Hapus file yang tidak perlu di-push
find "$TMP_DIR" -name 'node_modules' -type d -prune -exec rm -rf {} + 2>/dev/null || true
find "$TMP_DIR" -name 'dist' -type d -prune -exec rm -rf {} + 2>/dev/null || true
find "$TMP_DIR" -name '.cache' -type d -prune -exec rm -rf {} + 2>/dev/null || true
find "$TMP_DIR" -name '*.tsbuildinfo' -exec rm -f {} + 2>/dev/null || true
rm -f "$TMP_DIR/.replit" "$TMP_DIR/replit.nix" 2>/dev/null || true
rm -rf "$TMP_DIR/attached_assets" 2>/dev/null || true

# ── Commit dan push ────────────────────────────────────────────
cd "$TMP_DIR"
git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"

git add -A

if git diff --cached --quiet; then
  echo "✅ Tidak ada perubahan baru — repo GitHub sudah up-to-date."
  rm -rf "$TMP_DIR"
  exit 0
fi

echo "💬 Commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "🚀 Push ke github.com/${GITHUB_REPO} (branch: ${BRANCH})..."
git push origin "$BRANCH" 2>&1 | grep -v "$TOKEN" || true

echo ""
echo "✅ Berhasil push ke https://github.com/${GITHUB_REPO}"
rm -rf "$TMP_DIR"
