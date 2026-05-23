# n8n-nodes-tracepass — pre-submission smoke test

A focused checklist to run before submitting to the n8n community-
node registry. **All boxes ticked = submit. Any box failing = fix
first, rerun checklist.** Takes ~20 min.

## 0. Setup (one-time, ~3 min)

```bash
# Build the node
npm run build

# Mint a local TracePass API key against the Vantony seed company
# (paid plan, no v1/day caps). Re-run any time — prior keys with
# this label are auto-revoked so the apiKeys collection stays clean.
docker exec tracepass-platform npx tsx scripts/mint-smoke-test-key.ts
# → prints a single `tp_…` line. Copy it; the plaintext is gone after.

# Bring up the smoke-test n8n
docker compose -f docker-compose.smoke-test.yml up -d

# Wait ~10s for n8n to start, then:
#   Open http://localhost:5678
#   Set up the local owner account on the first-boot wizard
#     (any email/password — only used locally)
```

**Credential values for n8n** (Step 2):
- **API Key**: paste the `tp_…` from the mint script above
- **Base URL**: `http://tracepass-platform:3000` (NOT `http://172.70.0.10:3000`
  — the n8n container reaches the platform via the in-network hostname,
  not the IP)

## 1. Node discovery (the most likely failure point)

- [ ] In n8n, click the **+** to add a node, type `TracePass` — the
      node appears in the picker
- [ ] The node icon renders (light theme: black→orange gradient TP
      icon; switch to dark theme and confirm the dark icon swaps)
- [ ] Hovering the node shows the description copy
- [ ] No console errors in the browser devtools when the picker
      opens, and no errors in `docker logs tracepass-n8n-smoke`
      mentioning `n8n-nodes-tracepass`

## 2. Credential (Settings → Credentials)

- [ ] **+ Create credential** → search "TracePass API" — it appears
- [ ] Form shows two fields: API Key (password type) + Base URL
      (with default `https://app.tracepass.eu`)
- [ ] Change Base URL to `http://tracepass-platform:3000`, paste
      the `tp_…` key, click **Save**
- [ ] Click **Test** — green check (the credential.test endpoint
      is `GET /api/v1/products?limit=1`, so this exercises the
      Bearer auth path)
- [ ] Re-open the credential — API key field is masked (only
      `••••` shown), not the raw value

## 3. Product resource

For each, drop a TracePass node, select Resource = **Product**,
pick the operation, fill in fields, click **Execute step**.

- [ ] **Create** — minimal payload: name, gtin, category. Returns
      201 with the new product ID. Note the returned `_id` for
      later steps
- [ ] **Get** — paste the product ID from the previous step. Returns
      the full product object with the same name
- [ ] **Get Many** — no filters. Returns an array including the
      product just created
- [ ] **Get Many** with filter: search = (the product name).
      Returns a filtered array containing only that product
- [ ] **Update** — same product ID, change the name. Returns 200,
      the new name is reflected in a subsequent **Get**

## 4. Passport resource

- [ ] **Create** — productId = (the product ID), gtin = a valid
      14-digit GTIN, serialNumber = a unique string,
      confirmOverage = **off** (default). Returns 201 with the
      passport ID. Note the ID
- [ ] **Get** — paste the passport ID. Returns the passport
- [ ] **Get by Serial** — paste the serial number. Returns the
      same passport
- [ ] **Get Many** — productId filter set to the product ID.
      Returns an array containing the passport just created
- [ ] **Update Field** — passport ID + fieldKey =
      (any field key from your template, e.g. "model") + value =
      something new. Returns 200, the field shows the new value on
      a subsequent **Get**
- [ ] **Suspend** — passport ID. Returns 200. Get the passport →
      status is `suspended`
- [ ] **Archive** — passport ID. Returns 200. Get the passport →
      404 (or status `archived` depending on platform behaviour)

      **Safety re-read:** confirm the Archive operation's
      description in the operation picker reads "irreversible —
      the public QR will permanently 404" BEFORE you click Execute.

## 5. EPCIS Event resource

- [ ] **Export** — passportId = (a passport ID, ideally one that
      already has at least one event captured). Returns an EPCIS
      2.0 JSON-LD document with `@context`, `type: EPCISDocument`,
      and `epcisBody.eventList`
- [ ] **Capture** — passportId + a minimal EPCIS event payload
      (ObjectEvent with eventTime / action / bizStep / epcList).
      Returns 202 with a capture-job ID. Note the job ID
- [ ] **Get Capture Job** — paste the capture-job ID. Returns the
      job's status (success / running / failed)
- [ ] **Query** — pass an `EQ_bizStep` filter (e.g. `shipping`).
      Returns matching events (may be empty if you haven't
      captured anything with that bizStep — that's fine, just
      confirm 200 with an empty array)

## 6. Workflow sanity — wire two nodes

- [ ] Add a **Schedule** trigger → TracePass (Resource = Passport,
      Operation = Get Many, Limit = 5)
- [ ] Click **Execute workflow**
- [ ] Output panel shows up to 5 passport items, each rendering as
      a structured JSON object (not a string blob)

## 7. Error paths

- [ ] In credential, change API key to `tp_invalid` → save → Test
      → expect a red error message that names the auth failure
- [ ] Restore the real key
- [ ] In a TracePass node, try **Get** on Product with a fake ID
      `000000000000000000000000` → execute → expect a clean error
      surfaced to the workflow ("404 Not Found" or similar), NOT a
      crash or a node exception with stack trace

## 8. Final tidy

- [ ] Workflow runs are idempotent (re-running Create with the
      same Idempotency-Key behavior — n8n auto-generates one per
      execution; you don't need to verify this manually but
      confirm no duplicate-key 409s on re-runs)
- [ ] Console log of `docker logs tracepass-n8n-smoke 2>&1 | tail
      -50` has no unexpected stack traces

```bash
docker compose -f docker-compose.smoke-test.yml down -v
```

## After everything passes

Move on to the registry submission steps (separate doc).
