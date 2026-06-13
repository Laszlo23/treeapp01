# Server recovery status

**Last checked:** 2026-05-19

## Phase 0 outcome: Path B required

SSH to production VPS (`treegens-vps` / `72.62.48.212`) **timed out** (`Operation timed out` on port 22).

| Check | Result |
|-------|--------|
| SSH connectivity | Failed — host unreachable |
| Path A (recover in place) | Blocked until provider restores network/VM |
| Path B (fresh deploy) | **Active path** — use this repo + deploy scripts |

## When the VPS is back online

```bash
# 1. Verify survivors
ssh treegens-vps 'ls -la /root/treegens-app/ /root/treegens-app/models/best.pt'
ssh treegens-vps 'docker ps -a; pm2 list'

# 2. If treegens-app exists on disk, rsync into repo (one-time)
rsync -avz treegens-vps:/root/treegens-app/server/ ./treegens-app/server/

# 3. Or deploy from git (preferred)
cd treegens-app
cp .env.example .env   # fill secrets
./scripts/deploy-vps.sh

# 4. Smoke test
./scripts/smoke-verify.sh /path/to/whatsapp.mp4 40
```

## Fresh VPS bootstrap

See [DEPLOY.md](./DEPLOY.md) for full stack (Mongo, Node API, Next.js, ML API, nginx).
