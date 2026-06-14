# n8n-nodes-tracepass

n8n community node for TracePass — automate EU Digital Product Passport
workflows (products, passports, EPCIS supply-chain events) over the TracePass
v1 REST API.

## Publishing — via GitHub tag push, NOT `npm publish`

**Do not run `npm publish` from a laptop.** This package is published to npm
**only** by the `Publish` GitHub Actions workflow (`.github/workflows/publish.yml`),
which triggers on a **`v*.*.*` git tag push** and authenticates via **OIDC
trusted publishing** (no `NPM_TOKEN` secret; npm provenance is signed by GitHub's
OIDC infrastructure). As of May 1 2026, n8n *requires* community nodes to be
published this way (provenance attestation), so local `npm publish` is both
unauthenticated here (`npm whoami` → `ENEEDAUTH` by design) and non-compliant.

### Release steps

The canonical path is the interactive `npm run release` (lints, builds, prompts
for a version bump, updates changelog, commits, tags, pushes — the tag push then
triggers CI). When the version bump has **already** been made by hand in
`package.json` (e.g. an agent edited it as part of a feature), don't re-bump —
just tag the release commit and push the tag:

```bash
# package.json version is already at the target, e.g. 1.0.4
git push origin master                 # land the code + version bump first
git tag v1.0.4                         # tag MUST be v-prefixed — the workflow filter is 'v*.*.*'
git push origin v1.0.4                 # this push triggers publish.yml → npm
```

Watch the run: `gh run watch` (or the Actions tab). The published version appears
at https://www.npmjs.com/package/n8n-nodes-tracepass within a minute or two of a
green run.

### Gotchas (learned the hard way — see publish.yml comments)

- **Tag prefix is `v`** (`v1.0.4`), matching the original `v1.0.0` tag and the
  workflow's `tags: ['v*.*.*']` filter. A bare `1.0.4` tag will NOT trigger it.
- **The v1.0.1 / v1.0.2 runs failed** because an empty `NODE_AUTH_TOKEN` (from a
  non-existent `NPM_TOKEN` secret) made npm send an unauthenticated request and
  bail before the OIDC code path. The fix is to leave `NODE_AUTH_TOKEN` unset
  entirely so npm falls through to OIDC. Don't add an empty token env back.
- **OIDC trusted publishing** must be configured once on npmjs.com (package
  settings → Trusted Publishers → GitHub Actions, workflow `publish.yml`).
- The version in `package.json` and `package-lock.json` must match before tagging
  — `npm install --package-lock-only` syncs the lockfile after a manual bump.

## Build & lint

```bash
npm run build      # n8n-node build — compiles TS to dist/, copies icons
npm run lint       # n8n-node lint — n8n node-spec linter (naming, display rules)
```

Both must pass before committing a node change. `npm run build` regenerates
`dist/`; the published package serves from `dist/` (see `files` in package.json).

**The n8n linter is the authority on operation `name`/`action`/description wording
— it overrides style intuition.** Two rules it enforces that bite when adding an
operation: (1) `options` must be **alphabetised by `name`** (e.g. a new "Compliance"
op sorts between "Archive" and "Create" — the linter's autofix message tells you the
exact order); (2) `action` must be **sentence-case** — it rejected a possessive
`"Check a passport's compliance"` but accepted `"Check passport compliance"`. Don't
fight it for prettier text; ship what `npm run lint` accepts. The lint pass also
covers most verified-node guideline checks (declarative, no runtime deps, naming) —
a new *action* on an existing resource doesn't risk the verified badge.

## Node structure (declarative — no hand-written `execute()`)

- `nodes/TracePass/TracePass.node.ts` — node definition. `requestDefaults.baseURL`
  comes from the credential; every operation declares its HTTP `method` + `url`
  via declarative `routing`, so there's no imperative request code.
- `nodes/TracePass/{Passport,Product,Epcis}Description.ts` — per-resource
  operations + fields. Each operation's `routing.request` maps to one v1 endpoint;
  each field's `routing.send` maps to a body/query property.
- `credentials/TracePassApi.credentials.ts` — API key (`tp_…`) + base URL.

### Operation labels stay literal (and English)

Operation `name`/`value` strings (e.g. `Create`, `Create Batch`, `Get by Serial`)
are literal node-UI identifiers. They are NOT localised and must match what the
marketing site's API docs list verbatim — `PASSPORT_OPS` in the marketing repo's
`src/data/api-docs/prose/n8n.tsx` mirrors this list. When you add/rename an
operation here, update that constant in the marketing repo in lockstep.

### Endpoint truth source

Body shapes, response shapes, and limits must match the platform's v1 routes
(`tracepass-platform/src/app/api/v1/`) and the OpenAPI spec
(`tracepass/public/openapi.yaml`). Notably: `POST /api/v1/passports/batch` creates
passport **shells** (`fields: {}`) — field values are NOT accepted in the batch
body; they're set afterwards via Update Field or AI extraction. The `Create Batch`
operation's description says so, on purpose.

---
*Part of the **TracePass workspace** (`~/projects/dpp`). Workspace-wide map, skills, and conventions live in `../.claude/` (CLAUDE.md + skills/ + agents/). Check there for cross-repo procedures (releases, category templates, locale passes, brand images) before reinventing them.*
