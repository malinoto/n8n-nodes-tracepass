# Contributing

Thanks for taking the time. This is a small project maintained by one person, so
the most useful thing you can do before writing code is **open an issue first** —
especially for a new operation. It may already be a deliberate decision, and it's
cheaper to find that out before you build it.

## Where a change belongs

This node is a **declarative** n8n community node over the TracePass v1 REST API.
It has no `execute()` method: each operation describes an HTTP request via
`routing`, and n8n's own HTTP layer performs it. The API owns authentication,
plan-gating, the overage flow and rate limits.

That means:

- **A field the API doesn't return can't be added here.** The change starts in the
  TracePass platform; this node only exposes what v1 already serves.
- **Bugs in API *behaviour*** (wrong data, wrong status code) are platform issues.
  Report them to support@tracepass.eu — a release of this node won't fix them.
- **Bugs in *this* node** — wrong URL, a field routed to the wrong place, a
  description that doesn't match what the operation does — belong here.

## Setup

```bash
npm ci
npm run build
```

Node 20.15 or newer (`engines` in `package.json`).

`npm run dev` runs the node against a local n8n instance. Use credentials from a
**Free-plan account**: creating passports is billable and some operations are
irreversible.

## Before opening a PR

```bash
npm run lint && npm run build
```

Both must pass. `npm run lint:fix` handles most style issues automatically. There
is currently **no CI on pull requests**, so please run them locally — a maintainer
will otherwise find out at release time.

## Adding an operation

1. Add the option to the resource's `*Description.ts` (e.g. `ProductDescription.ts`),
   with `routing.request` naming the method and URL.
2. **Keep the options alphabetical by `name`** — the n8n linter enforces this and
   will fail the build otherwise.
3. Add any fields the operation needs, with `displayOptions.show` scoped to that
   `resource` + `operation` so they only appear when relevant, and `routing.send`
   placing the value in the query string or body.
4. If the operation reuses an existing field (like `productId`), add your operation
   to that field's `displayOptions.show.operation` array rather than duplicating it.
5. Write the `description` so it states the risk: whether it is billable,
   irreversible, or blocked under some condition. That text is all a workflow author
   sees before clicking.

Mirror an existing operation on the other resource where one exists — product
`Archive` deliberately reads like passport `Archive`, so the two feel the same in
the editor.

## Releasing

Maintainer-only, and **never** `npm publish` from a laptop: publishing goes through
a `v*.*.*` git tag push, which triggers the CI workflow with provenance
attestation.

## Security

Please don't open a public issue for a vulnerability — see
[SECURITY.md](SECURITY.md).

## Licence

By contributing you agree your contributions are licensed under the MIT Licence
that covers this project.
