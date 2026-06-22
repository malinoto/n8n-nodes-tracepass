# n8n-nodes-tracepass

This is an n8n community node. It lets you automate
**[TracePass](https://www.tracepass.eu)** — the EU Digital Product
Passport platform — in your n8n workflows.

TracePass generates compliant Digital Product Passports (DPPs) for EU
regulations (ESPR, the Battery Regulation, and more). This node lets
you create and manage products, passports, and GS1 EPCIS 2.0
supply-chain events directly from n8n — no code.

[n8n](https://n8n.io) is a fair-code licensed workflow automation
platform.

[Installation](#installation) ·
[Operations](#operations) ·
[Credentials](#credentials) ·
[Example workflows](#example-workflows) ·
[Resources](#resources)

## Installation

Follow the
[community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
in the n8n documentation.

In n8n: **Settings → Community Nodes → Install**, then enter
`n8n-nodes-tracepass`.

## Operations

### Product

- **Create** — add a product to the catalogue
- **Get** — retrieve a product by ID
- **Get Many** — list products, with category / search filters
- **Update** — update a product's name, model, or description

### Passport

- **Create** — create a Digital Product Passport (consumes a plan
  DPP slot — billable; opt in to overage with *Confirm Overage
  Charge*)
- **Get** / **Get by Serial** — retrieve a passport by ID or by its
  serial number
- **Get Many** — list passports, with status / product filters
- **Get QR** / **Get QR by Serial** — render the passport QR code
  (SVG / PNG / JSON), optionally in the company brand colour or an
  explicit colour, by ID or by serial
- **Compliance** — get a three-tier compliance verdict (compliant /
  compliant_with_warnings / incomplete) with regulation-cited findings —
  missing required fields/parties, format issues, and per-category
  conditional rules
- **Update Field** / **Update Field by Serial** — set the value of one
  passport field, by ID or by serial
- **Suspend** / **Suspend by Serial** — suspend a published passport
  (reversible), by ID or by serial
- **Archive** / **Archive by Serial** — archive a passport
  (**irreversible** — the public QR permanently 404s), by ID or by serial

The **by-serial** operations address a passport by your own serial number.
A serial is unique only *within a GTIN*, so if the same serial exists under
two GTINs in your account a serial-only call returns **409** — set the
optional **GTIN (Disambiguator)** field to resolve the passport exactly.

### EPCIS Event

- **Export** / **Export by Serial** — export a passport's events as a
  GS1 EPCIS 2.0 document, by ID or by serial (included on Starter plans
  and up; the by-serial form takes the same optional GTIN disambiguator)
- **Capture** — submit EPCIS 2.0 events (requires the EPCIS add-on)
- **Get Capture Job** — poll an async capture job
- **Query** — query the EPCIS event store with the standard EPCIS
  query filters (requires the EPCIS add-on)

### Template

- **Get Many** — list the DPP category templates with their field
  count, required-field count, governing regulation and version
- **Get** — get the full regulatory field schema for one category
  (every field with its key, label, type, required flag, access
  level and governing regulation reference)

Templates are read-only reference data — use them to discover what a
compliant passport in a category requires *before* creating products
and passports.

## Credentials

The node supports both of TracePass's auth methods. On the node, pick
one in the **Authentication** dropdown — n8n then shows the matching
credential type (you only fill in the one you chose):

| **Authentication** | Credential type | Best for |
|---|---|---|
| **Access Token** | TracePass API | A key you own — single user, server-to-server automation |
| **OAuth2** | TracePass OAuth2 API | Acting on a specific user's behalf, with scoped + revocable access |

**Access Token (API key)** — the simplest. In the TracePass dashboard,
go to **Developer → API Keys**, create a key (it starts with `tp_`),
then create a **TracePass API** credential in n8n and paste it. Use
**Test** to verify the key before building a workflow. The whole
workspace is reachable (all-or-nothing).

**OAuth2** — for when the workflow should act as a particular user with
only the access they granted. Register an OAuth app in the TracePass
dashboard under **Developer → OAuth Apps** (a public/PKCE client works —
no secret needed), then create a **TracePass OAuth2 API** credential in
n8n and click **Connect**: you approve the requested scopes on a
TracePass consent screen, and n8n stores + auto-refreshes the tokens.
Request only the scopes the workflow needs (e.g.
`passports:read passports:write offline_access` — keep `offline_access`
so n8n can refresh). The user can revoke the connection any time under
**Developer → OAuth Apps → Connected Apps**.

For both, the *Base URL* defaults to `https://app.tracepass.eu` —
change it only for a self-hosted or staging deployment.

## Example workflows

**Shopify → TracePass** — on a new Shopify order, create a passport
(product mapped by SKU, serial = order ID), then email the QR code
to the customer.

**Daily analytics digest** — a Schedule trigger lists yesterday's
passports and posts a summary to Slack.

**CSV → passports** — read a CSV of serial numbers and create a
passport per row.

**Supplier follow-up** — a Schedule trigger lists supplier requests
older than seven days and sends reminder emails.

## Compatibility

Requires n8n 1.x. Tested against the current n8n community-node API
(`n8nNodesApiVersion: 1`).

## Resources

- [TracePass API documentation](https://www.tracepass.eu/docs)
- [TracePass](https://www.tracepass.eu)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
