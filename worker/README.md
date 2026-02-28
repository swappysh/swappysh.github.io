# saves-worker

Cloudflare Worker backing the `/saves` page. Stores links in Workers KV.

## New machine setup

**Worker**
```bash
cd worker && npm install
npx wrangler secret put WRITE_SECRET   # write key (phone + laptop)
npx wrangler secret put READ_SECRET    # read key (must match GitHub secret)
npx wrangler deploy
```

KV namespace IDs are already in `wrangler.toml` — no need to recreate them.

**Local dev**
```bash
echo 'WRITE_SECRET=...' > .dev.vars
echo 'READ_SECRET=...'  >> .dev.vars
npx wrangler dev
```

**GitHub secret** (required for `/saves` page to load)
Repo → Settings → Secrets → Actions → `SAVES_READ_TOKEN` = your READ_SECRET

**iPhone Shortcut**
Share Sheet → POST to `https://saves-worker.swappysh.workers.dev/api/save`
- Header: `Authorization: Bearer <WRITE_SECRET>`
- Body (JSON): `url`, `title` (Name of Shortcut Input), `source: shortcut`

**Arc extension (laptop)**
Paste bookmarklet JS into https://sandbox.self.li/bookmarklet-to-extension, load unpacked in Arc.
Bookmarklet JS is in `layouts/saves/single.html` — replace `fetch(...)` call with the standalone version and add your WRITE_SECRET.
