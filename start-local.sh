#!/bin/bash
# Load .env
set -a
source .env
set +a

echo "=== DATABASE: $DATABASE_URL ==="
echo ""

case "$1" in
  db:push)
    echo "[DB] Pushing schema to database..."
    export PATH="$PATH:/c/Users/USER/AppData/Roaming/npm"
    pnpm --filter @workspace/db run push
    ;;
  seed)
    echo "[SEED] Seeding database..."
    export PATH="$PATH:/c/Users/USER/AppData/Roaming/npm"
    pnpm --filter @workspace/api-server run seed
    ;;
  api)
    echo "[API] Starting backend on port 8080..."
    export PATH="$PATH:/c/Users/USER/AppData/Roaming/npm"
    PORT=8080 pnpm --filter @workspace/api-server run dev
    ;;
  frontend)
    echo "[FRONTEND] Starting frontend on port 5000..."
    export PATH="$PATH:/c/Users/USER/AppData/Roaming/npm"
    PORT=5000 BASE_PATH=/ pnpm --filter @workspace/telkom-am-dashboard run dev
    ;;
  *)
    echo "Usage: bash start-local.sh [db:push|seed|api|frontend]"
    ;;
esac
