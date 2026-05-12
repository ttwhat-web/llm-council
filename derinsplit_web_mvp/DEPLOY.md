# DerinSplit Web MVP — Deploy

## ✅ The one method: Vercel CLI

This is a Next.js 14 App Router app with a dynamic route (`/urun/[id]`),
client-side state, and persistence. Vercel auto-detects all of it; no
config changes needed beyond the bundled `vercel.json`.

```bash
cd derinsplit_web_mvp
npx vercel --prod
```

First run only:

1. CLI asks for login → press `y` to open the browser, log in.
2. CLI asks "Set up and deploy?" → press `y`.
3. CLI asks for scope (your team or personal) → pick one.
4. CLI asks "Link to existing project?" → press `n` for a new one.
5. CLI asks project name → accept the default (`derinsplit-web-mvp`).
6. CLI asks "In which directory is your code?" → press enter (`./`).
7. CLI auto-detects "Next.js" framework → press enter.

Subsequent deploys: `npx vercel --prod` again — single command, ~30 s.

Output:
```
🔍  Inspect: https://vercel.com/<scope>/derinsplit-web-mvp/<id>
✅  Production: https://derinsplit-web-mvp-<hash>.vercel.app
```

Open the production URL → you land on the cream-luxury home, the navbar
floats at the top, the gold "+ ÜRÜN EKLE" CTA on the right takes you
straight to `/admin/products/new`. No login, no onboarding.

## Alternative: Netlify (via Git import)

A `netlify.toml` is bundled in this directory. The simplest path:

1. Push the repo (already done — branch `claude/derinsplit-flutter-mvp-SKkVB`).
2. Go to <https://app.netlify.com/start> → "Import from Git".
3. Pick this repo.
4. Netlify reads `netlify.toml` and picks up:
   - base dir: `derinsplit_web_mvp`
   - build cmd: `npm run build`
   - publish dir: `.next`
   - the `@netlify/plugin-nextjs` adapter
5. Click "Deploy site". Initial build runs `npm install` + `next build`,
   then publishes. URL is `https://<random>.netlify.app`.

> **Why not Netlify Drop?** Netlify Drop is static-only. This app has a
> dynamic route + client state; the Vercel CLI or Netlify-Git path
> handles both correctly. If you absolutely need a drop-and-go, ask and
> I'll produce a static export at the cost of breaking detail pages for
> products that admin adds after deploy.

## Verification before deploy

```bash
cd derinsplit_web_mvp
npm install
npm run build              # ✓ Compiled successfully (9 routes)
npm run test:live-update   # ✓ 13/13 checks passed
```
