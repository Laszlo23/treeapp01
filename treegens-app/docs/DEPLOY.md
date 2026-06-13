# VPS full-stack deployment

## Prerequisites

- Ubuntu 22.04+, 8GB RAM, 4 vCPU, 50GB disk
- Docker, docker compose, Node 22, PM2, nginx, ffmpeg, git

## 1. ML API (this directory)

```bash
cd treegens-app
cp .env.example .env
# Place best.pt in models/
chmod +x scripts/*.sh
./scripts/deploy-vps.sh
```

Verify: `./scripts/smoke-verify.sh /path/to/video.mp4 40`

## 2. Node backend

```bash
cd treegens-backend-main
cp .env.example .env
# Set:
#   AI_PROVIDER=treegens_ml
#   PLANTING_VERIFICATION_API_URL=http://127.0.0.1:8000
#   PLANTING_VERIFICATION_INTERNAL_KEY=<same as INTERNAL_API_KEY>
yarn install && yarn build
pm2 start dist/server.js --name treegens-api
```

## 3. Next.js web

```bash
cd treegens-web-main
yarn install && yarn build
pm2 start npm --name treegens-web -- start -- -p 3020
```

## 4. nginx

Proxy `treegens.app` → web `:3020`, `/api` → backend `:5000`.

Ensure backend `PORT=5000` matches nginx upstream.

## 5. Secrets sync checklist

| Backend | ML API |
|---------|--------|
| `PLANTING_VERIFICATION_INTERNAL_KEY` | `INTERNAL_API_KEY` |

## Recovery from down server

See [RECOVERY.md](./RECOVERY.md).
