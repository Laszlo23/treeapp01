# Integration test checklist (manual / CI on VPS)

When production is online, verify:

1. **Web** — `GET https://treegens.app/` returns 200
2. **API** — `GET https://treegens.app/api/health` returns healthy
3. **ML** — on VPS: `curl http://127.0.0.1:8000/health` shows `model_loaded: true`
4. **Upload flow** — wallet login → mangrove submission → plant video upload
5. **AI display** — `PlantAiResultSummary` shows `countedMangroves` after upload
6. **Detail page** — `PlantingCountCard` shows declared vs AI count

Automated script: `scripts/e2e-check.sh`

Reference video expectations:

| Video | Manual | AI target |
|-------|--------|-----------|
| WhatsApp ~5s | 40 | 38–42 |
| MOV_0847 | ~101 | 94–104 |

Run on VPS after deploy:

```bash
./scripts/smoke-verify.sh test-videos/whatsapp.mp4 40
./scripts/eval-reference-videos.sh
```
