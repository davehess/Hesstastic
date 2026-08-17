# hesstastic.com

A static site served by GitHub Pages from this repository. No build step, no
dependencies, no framework. Every page links one shared stylesheet and nothing
else — no external fonts, no CDN, nothing fetched at render time, so there is no
third party that can break it.

## Pages

| File | URL | What it is |
|---|---|---|
| `index.html` | `/` | Landing page — routes to About, Projects, Contact |
| `about.html` | `/about.html` | Engineering profile: the system, its scale, four worked problems |
| `projects.html` | `/projects.html` | What is running, with measured scale and a link to the live product |
| `contact.html` | `/contact.html` | Email and LinkedIn |
| `method.html` | `/method.html` | Working method: durable memory, two-tier retrieval, the audits |
| `business-case.html` | `/business-case.html` | What one AI-assisted seat returns, measured |
| `ws1home.html` | `/ws1home.html` | The page that lived here first, preserved |
| `style.css` | — | The one stylesheet, shared by all seven pages |

Nav carries Home / About / Projects / Contact / WS1. `method.html` and
`business-case.html` are deliberately **not** in the nav — they are long reads
linked from the landing page and from Projects, and putting them in the nav made
it seven items wide. They mark About as their active trail so the nav does not
look unrelated while you are reading them.

## Links are root-relative on purpose

Every internal link is written as `/about.html`, not `about.html`. That means
**the site only works at a domain root** — on the default
`davehess.github.io/Hesstastic/` project URL, every link and the stylesheet
would 404. The custom domain is load-bearing, not decorative.

## Repository setup

**Settings → Pages → Build and deployment.** Source: **Deploy from a branch**.
Branch: **`master`**, folder: **`/ (root)`**.

The `CNAME` file contains `hesstastic.com`, so the Pages custom-domain field
populates itself from it. Do not delete that file — Pages rewrites it from the
settings field, and an empty one drops the domain.

Switching the domain was done last, after the apex `A` records resolved, because
changing `CNAME` flips the Pages custom domain the moment it is pushed — doing it
before DNS existed would have left both hostnames dead in the gap.

`.nojekyll` disables Jekyll processing. Nothing here needs it, and it stops
Jekyll from ignoring any future file or folder whose name begins with `_`.

Once DNS resolves and the certificate is issued, tick **Enforce HTTPS**.

### This repo previously served mimic.hesstastic.com

The `CNAME` was changed from `mimic.hesstastic.com` to `hesstastic.com`. **A
Pages site can carry exactly one custom domain**, so the apex and `mimic` cannot
both be served from here. See the DNS section for what to do with the leftover
`mimic` record.

## DNS (Porkbun — human-only step)

There is no Porkbun integration: no MCP connector exists, no credentials live in
this repo, and `api.porkbun.com` is unreachable from cloud sessions. So records
are added by hand, in the Porkbun DNS editor for `hesstastic.com`.

**Add — four `A` records on the apex, one `CNAME` for www:**

| Type | Host | Answer | TTL |
|---|---|---|---|
| A | *(blank)* | `185.199.108.153` | 600 |
| A | *(blank)* | `185.199.109.153` | 600 |
| A | *(blank)* | `185.199.110.153` | 600 |
| A | *(blank)* | `185.199.111.153` | 600 |
| CNAME | `www` | `davehess.github.io` | 600 |

**Then deal with the old `mimic` record** — it currently points at
`davehess.github.io` but no Pages site claims that hostname any more, so it will
serve GitHub's "There isn't a GitHub Pages site here" 404. Either delete the
record, or replace it with Porkbun URL forwarding to `https://hesstastic.com`.
Leaving it as-is is the one option that looks broken.

Notes that matter:

- **All four `A` records, not one.** They are GitHub's Pages edge; publishing a
  subset works until the one you picked is the one having a bad day.
- **`A` records, not `ALIAS`.** Porkbun supports `ALIAS` at the apex and it would
  work, but the apex already carries `MX` records for Google Mail. `A` records
  sit alongside `MX` with no interaction at all, which is the boring and correct
  property here.
- **Leave the existing `MX` and `TXT` records alone.** Adding `A` records does
  not affect mail. Removing the `TXT` records would break SPF and the Google
  site verification.
- Once the Pages custom domain is the apex, GitHub serves `www` as a redirect to
  it automatically — the `CNAME` record above is all www needs.

Optional IPv6, same host, `AAAA`: `2606:50c0:8000::153`, `2606:50c0:8001::153`,
`2606:50c0:8002::153`, `2606:50c0:8003::153`.

## Verifying it landed

```sh
dig +short hesstastic.com            # expect the four 185.199.x.153 addresses
dig +short www.hesstastic.com        # expect davehess.github.io + those addresses
curl -sI https://hesstastic.com/     # expect 200, server: GitHub.com
curl -sI https://www.hesstastic.com/ # expect 301 to https://hesstastic.com/
```

If DNS resolves but Pages serves a 404, the usual cause is the Pages source
still pointing at the wrong branch or folder.

## Editing

Plain HTML and one stylesheet. Open the file, change it, commit.

```sh
python3 -m http.server 8000    # then open http://localhost:8000/
```

Serve it rather than opening files directly — the links are root-relative and
`file://` has no root.

## Content this repo shares with another

`about.html`, `method.html` and `business-case.html` originated in `resume/` in
the QuarmBossTracker monorepo, where they were built to deploy on Vercel. **This
repo is now the deployed copy.** Do not edit both — leaving two copies means
they silently diverge and the deployed one stops matching the one being edited.

## Deliberate omissions

Two things are left out of the content on purpose, and both should stay out:

- **No claim about when the work happens.** 71% of commits land outside
  09:00–17:00 ET, but 523 do not, and anyone with the repository can run that
  query. A "nights and weekends" line is the one claim on these pages that could
  be checked and found wanting, so the throughput argument rests on method
  instead.
- **No estimated figures.** Every number is counted from the git repository, the
  production database, or the assistant's own usage records. On pages whose whole
  pitch is "measured, not estimated", one estimate would undercut everything.

`projects.html` ends with a conspicuous dashed block listing the other
subdomains found in DNS. They are **not** described or linked, because what they
serve is not something this repo knows. Fill them in or delete the section.
