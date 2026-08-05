# Security Policy

## Reporting a vulnerability

Please report security issues privately to **support@tracepass.eu** rather than
opening a public issue. Include enough detail to reproduce — the workflow shape
or a request/response pair is ideal.

You should get an acknowledgement within **3 working days**. TracePass is a small
team, so please allow reasonable time for a fix before public disclosure; we will
tell you when a patch ships and credit you unless you'd rather stay anonymous.

## Supported versions

Only the **latest published version** of `n8n-nodes-tracepass` receives security
fixes. Older versions are not patched — upgrade before reporting an issue you can
only reproduce on an old release.

## Scope

This is a **declarative** n8n community node: it has no `execute()` method, so it
does not run custom code inside your n8n instance. It describes HTTP requests and
n8n's own HTTP layer performs them.

**In scope** — credential handling, an operation whose routing does not match its
stated description, or a dependency vulnerability.

**Out of scope** — the hosted TracePass API and platform, and n8n itself. Report
TracePass API issues to the same address; they aren't fixed by a release of this
node.

## Credentials

Your TracePass API key is stored in **n8n's own credential store** and sent as a
`Bearer` token on each request. This node never writes it to disk, logs it, or
transmits it anywhere other than the TracePass API host you configure.

Because the node is declarative, every call is an ordinary authenticated request
against the public v1 API — subject to the same authorisation, plan-gating and
rate limits as any other client. There is no privileged path through this node.
