# Netlify Deployment — Relief Hotels

Get the site live on **`*.netlify.app` first**, then attach **`www.reliefhotelsandsuites.com.ng`**.

---

## ⚠️ Before Netlify can build correctly

These files must be **committed and pushed** to the branch Netlify deploys:

- `netlify.toml` (build command, Node 20, Next.js plugin)
- Your app code on that same branch

Right now `netlify.toml` is only local until you push it. Connecting the repo in Netlify is not enough.

```bash
git add netlify.toml docs/deploy/NETLIFY.md
git commit -m "Add Netlify deploy config"
git push origin <your-branch>
```

---

## Step 1 — You connected GitHub (done)

Repo: `pensebien/https-www.reliefhotels`  
App lives at the **repository root** — not in a subfolder.

---

## Step 2 — Build settings (Netlify UI)

**Site configuration → Build & deploy → Continuous deployment → Build settings → Edit**

| Setting | Value |
|---------|--------|
| **Branch to deploy** | `main` **or** your feature branch (e.g. `features/production-ready-with-domain`) — must match the branch you pushed |
| **Base directory** | *(leave empty)* |
| **Build command** | `npm run build` |
| **Publish directory** | `.next` |
| **Node version** | `20` (also set in `netlify.toml`) |

Click **Save**, then **Deploys → Trigger deploy → Deploy project**.

### First success looks like

- Deploy log ends with **Published** / **Site is live**
- Netlify gives you a URL like `https://something-random.netlify.app`
- Opening `/en` returns the homepage

**Do not add the custom domain until this URL works.**

---

## Step 3 — Environment variables

**Site configuration → Environment variables → Add a variable → Production**

Add at minimum:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_APP_URL` | `https://<your-site>.netlify.app` *(use the real Netlify URL first; change to custom domain later)* |
| `DEMO_DASHBOARD_KEY` | `relief-demo-2026` |
| `DEMO_MODE` | `true` |
| `NOTIFY_CHANNEL` | `console` |

After saving → **Deploys → Trigger deploy → Deploy project** (env vars only apply on the next build).

Optional for full booking demo: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Paystack test keys, Resend keys (see `docs/ENV_MATRIX.md`).

---

## Step 4 — Custom domain (`reliefhotelsandsuites.com.ng`)

Only after Step 2 works on `*.netlify.app`.

1. **Site configuration → Domain management → Add a domain**
2. Enter `reliefhotelsandsuites.com.ng`
3. Netlify shows DNS records — add them at your **registrar or Cloudflare**:

   | Host | Type | Points to |
   |------|------|-----------|
   | `www` | CNAME | `<your-site>.netlify.app` |
   | `@` | A | Netlify apex IPs *(shown in Netlify UI)* |

4. Wait until domain shows **Verified** and SSL is active
5. Set **Primary domain** to `www.reliefhotelsandsuites.com.ng`
6. Update env var: `NEXT_PUBLIC_APP_URL` = `https://www.reliefhotelsandsuites.com.ng`
7. **Trigger deploy** again

---

## Step 5 — Smoke test

```bash
# Phase A — Netlify default URL
BASE=https://YOUR-SITE.netlify.app

# Phase B — after DNS (custom domain)
BASE=https://www.reliefhotelsandsuites.com.ng

curl -s -o /dev/null -w "%{http_code}" "$BASE/en"        # 200
curl -s -o /dev/null -w "%{http_code}" "$BASE/en/rooms"  # 200
```

Browser: homepage, rooms, `/demo?key=relief-demo-2026`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Build runs but site 404 | `netlify.toml` not pushed | Commit + push; redeploy |
| Build uses wrong folder | Base directory set wrongly | Clear base directory (repo root **is** the app) |
| Old code deploys | Wrong branch | Set **Branch to deploy** to the branch you push |
| Build fails on `npm run build` | Node version | Set Node **20** in UI and `netlify.toml` |
| Deploy OK, blank/errors | Missing env | Set `NEXT_PUBLIC_APP_URL` to the live URL; redeploy |
| Custom domain stuck | DNS not propagated | Wait 24–48h; confirm CNAME at registrar |
| Paystack fails | Callback mismatch | Paystack callback = `{NEXT_PUBLIC_APP_URL}/payment/callback` |

### Read the deploy log

**Deploys → click latest deploy → Deploy log**

- `npm ERR!` / `ENOENT` → build command or base directory wrong
- `Plugin "@netlify/plugin-nextjs"` → should resolve automatically from `netlify.toml`
- Copy the last 20 lines if you need help debugging

---

## Netlify vs Render

| | Netlify (this guide) | Render (production, ADR-004) |
|--|----------------------|------------------------------|
| Purpose | Show domain to Kalu early | Long-term production |
| DNS | Point domain to Netlify now | Repoint to Render later |

Use **one host per domain** at a time.

---

## Optional: Netlify CLI

```bash
npm install -g netlify-cli
cd reliefhotels
netlify link
netlify deploy --build   # draft URL
netlify deploy --prod    # production branch deploy
```
