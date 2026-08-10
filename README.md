# mimic.hesstastic.com

A static site served by GitHub Pages from this repository. No build step, no
dependencies, no framework. Every page links one shared stylesheet and nothing
else — no external fonts, no CDN, nothing fetched at render time.

## Pages

| File | URL | What it is |
|---|---|---|
| `index.html` | `/` | Landing page — routes to the three reference documents |
| `profile.html` | `/profile.html` | Engineering profile: the system, its scale, four worked problems |
| `method.html` | `/method.html` | Working method: durable memory, two-tier retrieval, the audits |
| `business-case.html` | `/business-case.html` | What one AI-assisted seat returns, measured |
| `ws1home.html` | `/ws1home.html` | The page that lived here first, preserved |
| `style.css` | — | The one stylesheet, shared by all five pages |

The three reference documents originated in `resume/` in the QuarmBossTracker
monorepo, where they were built to deploy on Vercel. This repo is now the
deployed copy. **Do not edit both** — leaving two copies means they silently
diverge and the deployed one stops matching the one being edited.

## Links are root-relative on purpose

Every internal link is written as `/method.html`, not `method.html`. That means
**the site only works at a domain root** — on the default
`davehess.github.io/Hesstastic/` project URL, every link and the stylesheet
would 404. The custom domain is load-bearing, not decorative.

## Repository setup (one time)

1. Merge this branch to the default branch (`master`).
2. **Settings → Pages → Build and deployment.** Source: **Deploy from a
   branch**. Branch: **`master`**, folder: **`/ (root)`**. Save.
3. The `CNAME` file in this repo already contains `mimic.hesstastic.com`, so the
   Pages custom-domain field populates itself from it. Do not delete that file —
   Pages rewrites it from the settings field, and an empty one drops the domain.
4. `.nojekyll` disables Jekyll processing. Nothing here needs it, and it stops
   Jekyll from ignoring any future file or folder whose name begins with `_`.
5. Once DNS resolves and the certificate is issued, tick **Enforce HTTPS**.

## DNS (Porkbun — human-only step)

There is no Porkbun integration: no MCP connector exists, no credentials live in
this repo, and `api.porkbun.com` is unreachable from cloud sessions. So the
record is added by hand, in the Porkbun DNS editor for `hesstastic.com`:

| Type | Host | Answer | TTL |
|---|---|---|---|
| CNAME | `mimic` | `davehess.github.io` | 600 |

Notes that matter:

- The answer is the **account** host, `davehess.github.io` — not
  `davehess.github.io/Hesstastic`, and not the repo name in any form. A CNAME
  answers with a hostname only; a path in that field is invalid.
- This is a subdomain, so **no `A` records are needed.** The four
  `185.199.108–111.153` addresses are only for pointing an apex domain
  (`hesstastic.com`), which this setup does not do.
- Porkbun may append the trailing dot itself. Either form is fine.
- If Porkbun's editor refuses the record because a default `ALIAS` or `A` on
  `mimic` already exists, delete that conflicting record first — a host can only
  have one address-type answer.

Propagation is usually minutes. GitHub then issues the TLS certificate
automatically; **Enforce HTTPS** stays greyed out until it does.

## Verifying it landed

```sh
dig +short mimic.hesstastic.com          # expect davehess.github.io + GitHub IPs
curl -sI https://mimic.hesstastic.com/   # expect 200 and server: GitHub.com
```

If DNS resolves but Pages serves a 404, the usual cause is the Pages source
still pointing at the wrong branch or folder.

## Editing

Plain HTML and one stylesheet. Open the file, change it, commit. To check it
locally before pushing:

```sh
python3 -m http.server 8000    # then open http://localhost:8000/
```

Serving over `http.server` rather than opening the files directly matters: the
root-relative links resolve against a server root, and `file://` has none.

## Deliberate omissions in the content

Two things are left out of the reference pages on purpose, and both should stay
out:

- **No claim about when the work happens.** 71% of commits land outside
  09:00–17:00 ET, but 523 do not, and anyone with the repository can run that
  query. A "nights and weekends" line is the one claim on those pages that could
  be checked and found wanting, so the throughput argument rests on method
  instead.
- **No estimated figures.** Every number is counted from the git repository, the
  production database, or the assistant's own usage records. On pages whose
  whole pitch is "measured, not estimated", one estimate would undercut
  everything around it.

`profile.html` still carries a "To fill in" block — title, contact, employment
history, education. It is styled to be conspicuous. Delete that whole
`<section>` once those are filled in.
