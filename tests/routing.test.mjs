import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TracePass } from '../nodes/TracePass/TracePass.node';

/**
 * This node is DECLARATIVE: there is no hand-written `execute()`. Every
 * operation is a `routing` block that hands n8n a method and a URL, and n8n's
 * own HTTP layer makes the call. That is what keeps the package
 * dependency-free for n8n's community-node verification — and it is also why
 * nothing here fails loudly when the v1 API moves underneath it.
 *
 * A renamed or removed platform route does not break a build, a lint or a
 * type-check in this repo. It breaks at runtime, in a user's workflow, after
 * the package is published to npm. These tests are the only thing standing
 * between that and a release.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
// Allow overriding the platform path via env (e.g. when using a worktree that has
// routes not yet merged to the main checkout): TRACEPASS_PLATFORM_PATH=/path/to/wt npm test
const PLATFORM_V1 = process.env.TRACEPASS_PLATFORM_PATH
	? join(process.env.TRACEPASS_PLATFORM_PATH, 'src', 'app', 'api', 'v1')
	: join(HERE, '..', '..', 'tracepass-platform', 'src', 'app', 'api', 'v1');

/** Every `routing` block reachable from the node's properties. */
function collectRoutes() {
	const found = [];

	// `owner` tracks the nearest enclosing PROPERTY name (e.g. "operation"),
	// which an option object does not carry itself — an option only has
	// `value`. Carrying it down is what lets a routed option be reported as
	// "operation:archive" rather than as a bare value with no context.
	const walk = (node, owner) => {
		if (Array.isArray(node)) {
			for (const item of node) walk(item, owner);
			return;
		}
		if (!node || typeof node !== 'object') return;

		const obj = node;
		// Only a real property node renames the owner. An option carries `value`
		// and often a display `name` too ("Archive"), so keying on `name` alone
		// would relabel the owner to the human caption and lose the property.
		const isProperty = typeof obj.name === 'string' && !('value' in obj);
		const nextOwner = isProperty ? obj.name : owner;

		const routing = obj.routing;
		const request = routing?.request;
		if (request && typeof request.url === 'string') {
			found.push({
				method: typeof request.method === 'string' ? request.method : 'GET',
				url: request.url,
				owner: typeof obj.value === 'string' ? `${owner}:${obj.value}` : owner,
			});
		}

		for (const [key, value] of Object.entries(obj)) {
			if (key === 'routing') continue;
			walk(value, nextOwner);
		}
	};

	walk(TracePass.prototype ? new TracePass().description.properties : [], 'root');
	return found;
}

/**
 * Turn a node URL into the platform's filesystem route shape:
 *   '=/api/v1/passports/{{$parameter["passportId"]}}/qr'  →  'passports/[id]/qr'
 * The leading '=' marks an n8n expression; `{{…}}` is a runtime substitution,
 * which on disk is a `[param]` segment. Parameter NAMES differ by design
 * (`passportId` vs `[id]`), so every substitution collapses to a single
 * wildcard and only the route SHAPE is compared.
 */
function toRouteShape(url) {
	return url
		.replace(/^=/, '')
		.replace(/^\/api\/v1\//, '')
		.replace(/\{\{[^}]*\}\}/g, '\u0000')
		.replace(/\/$/, '');
}

/** The platform's real v1 routes, in the same wildcard shape. */
function platformRouteShapes() {
	const shapes = new Set();
	const walk = (dir, segments) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				// A [param] / [...catchall] directory is a runtime substitution.
				const seg = /^\[.*\]$/.test(entry.name) ? '\u0000' : entry.name;
				walk(join(dir, entry.name), [...segments, seg]);
			} else if (entry.name === 'route.ts') {
				shapes.add(segments.join('/'));
			}
		}
	};
	walk(PLATFORM_V1, []);
	return shapes;
}

describe('TracePass node — declarative routing', () => {
	const routes = collectRoutes();

	it('exposes routed operations at all', () => {
		// Guards against a refactor that empties the properties tree: without
		// this, every assertion below would pass vacuously over an empty list.
		expect(routes.length).toBeGreaterThan(20);
	});

	it('every routed URL targets the v1 API', () => {
		for (const r of routes) {
			expect(r.url.replace(/^=/, ''), `${r.owner} routes outside /api/v1`).toMatch(
				/^\/api\/v1\//,
			);
		}
	});

	it('uses only real HTTP methods', () => {
		const allowed = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
		for (const r of routes) {
			expect(allowed.has(r.method.toUpperCase()), `${r.owner} uses ${r.method}`).toBe(true);
		}
	});

	it('leaves no unresolved n8n expression in a URL', () => {
		for (const r of routes) {
			// A URL containing `{{…}}` MUST be an expression (leading '='), or
			// n8n ships the braces literally and the request 404s.
			if (r.url.includes('{{')) {
				expect(r.url.startsWith('='), `${r.owner}: has {{…}} but no leading '='`).toBe(true);
			}
		}
	});

	/**
	 * THE ONE THAT MATTERS: the node is a thin client over the platform's v1
	 * API, and nothing links the two repos. A route renamed on the platform
	 * leaves this node pointing at a 404 with every local check still green.
	 *
	 * Cross-repo, so it runs only when the platform is a sibling checkout and
	 * returns early otherwise — CI clones this repo alone. That makes it a
	 * local/pre-release guard, which is where a release is actually cut.
	 */
	it('every routed URL matches a real platform v1 route', () => {
		if (!existsSync(PLATFORM_V1)) return;

		const real = platformRouteShapes();
		expect(real.size, 'platform route scan found nothing — check the path').toBeGreaterThan(10);

		for (const r of routes) {
			const shape = toRouteShape(r.url);
			expect(
				real.has(shape),
				`${r.owner} → ${r.method} ${r.url}\n  no platform route matches shape "${shape}"`,
			).toBe(true);
		}
	});
});

describe('TracePass node — description integrity', () => {
	const node = new TracePass();
	const d = node.description;

	it('declares both credential types, each gated on its auth mode', () => {
		const names = (d.credentials ?? []).map((c) => c.name);
		expect(names).toContain('tracePassApi');
		expect(names).toContain('tracePassOAuth2Api');

		// Both are `required: true`; only displayOptions stop n8n demanding
		// both at once. If that gating is lost the node becomes unusable.
		for (const cred of d.credentials ?? []) {
			expect(cred.displayOptions?.show?.authentication, `${cred.name} is not auth-gated`).toBeTruthy();
		}
	});

	it('every resource option has at least one operation', () => {
		const resourceProp = d.properties.find((p) => p.name === 'resource');
		expect(resourceProp, 'no resource selector').toBeTruthy();

		const resources = (resourceProp?.options ?? []).map((o) =>
			'value' in o ? String(o.value) : '',
		);
		expect(resources.length).toBeGreaterThan(0);

		for (const res of resources) {
			const ops = d.properties.filter(
				(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(res),
			);
			expect(ops.length, `resource "${res}" has no operation selector`).toBeGreaterThan(0);
		}
	});

	it('has a routed request for every operation option', () => {
		// An operation the user can pick but that routes nowhere is a dead
		// menu entry — it looks supported and silently does nothing.
		const routedOwners = new Set(collectRoutes().map((r) => r.owner));
		for (const prop of d.properties.filter((p) => p.name === 'operation')) {
			for (const opt of prop.options ?? []) {
				if (!('value' in opt)) continue;
				expect(
					routedOwners.has(`operation:${String(opt.value)}`),
					`operation "${String(opt.value)}" has no routing block`,
				).toBe(true);
			}
		}
	});
});

describe('TracePass passport Create — EN 18219 identifier schemes', () => {
	const props = new TracePass().description.properties;

	// ── identifierScheme options and routing ──────────────────────────────────

	it('has an identifierScheme field for the create operation', () => {
		const f = props.find((p) => p.name === 'identifierScheme');
		expect(f, 'identifierScheme field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('create');
		expect(f.default).toBe('gs1');
	});

	it('identifierScheme exposes all five EN 18219 scheme values', () => {
		const f = props.find((p) => p.name === 'identifierScheme');
		const values = (f?.options ?? []).map((o) => o.value);
		expect(values).toContain('gs1');
		expect(values).toContain('iso15459');
		expect(values).toContain('iec61406');
		expect(values).toContain('did');
		expect(values).toContain('doi');
	});

	it('each non-GS1 scheme option sends identifier.scheme to the request body', () => {
		const f = props.find((p) => p.name === 'identifierScheme');
		const nonGs1 = (f?.options ?? []).filter((o) => o.value !== 'gs1');
		expect(nonGs1.length).toBeGreaterThan(0);
		for (const opt of nonGs1) {
			const send = opt.routing?.send;
			expect(send?.type, `${opt.value} routing.send.type`).toBe('body');
			expect(send?.property, `${opt.value} routing.send.property`).toBe('identifier.scheme');
			expect(send?.value, `${opt.value} routing.send.value should equal the scheme`).toBe(opt.value);
		}
	});

	it('GS1 option has no option-level routing (uses legacy gs1.* fields)', () => {
		const f = props.find((p) => p.name === 'identifierScheme');
		const gs1Opt = (f?.options ?? []).find((o) => o.value === 'gs1');
		expect(gs1Opt, 'gs1 option missing').toBeTruthy();
		expect(gs1Opt.routing, 'GS1 option must not send identifier.scheme').toBeUndefined();
	});

	// ── legacy GS1 fields gated on gs1 scheme (backward compat) ──────────────

	it('gtin field is shown only when identifierScheme is gs1', () => {
		// Find the gtin field on the create operation (there is also a gtin field
		// used as a disambiguator on *_by_serial operations — exclude that one).
		const f = props.find(
			(p) => p.name === 'gtin' && p.displayOptions?.show?.operation?.includes?.('create'),
		);
		expect(f, 'gtin create field missing').toBeTruthy();
		expect(f.displayOptions?.show?.identifierScheme).toEqual(['gs1']);
	});

	it('createSerialNumber field is shown only when identifierScheme is gs1', () => {
		const f = props.find((p) => p.name === 'createSerialNumber');
		expect(f, 'createSerialNumber field missing').toBeTruthy();
		expect(f.displayOptions?.show?.identifierScheme).toEqual(['gs1']);
	});

	// ── per-scheme fields — each gated on its own scheme ─────────────────────

	const schemeFields = {
		iso15459: ['iso15459Iac', 'iso15459PrimaryId', 'iso15459Serial'],
		iec61406: ['iec61406Uri'],
		did: ['didValue', 'didMethod'],
		doi: ['doiValue'],
	};

	for (const [scheme, fieldNames] of Object.entries(schemeFields)) {
		it(`${scheme} fields are shown only when identifierScheme is ${scheme}`, () => {
			for (const name of fieldNames) {
				const f = props.find((p) => p.name === name);
				expect(f, `${name} field missing`).toBeTruthy();
				expect(
					f.displayOptions?.show?.identifierScheme,
					`${name} must be gated on identifierScheme: ['${scheme}']`,
				).toEqual([scheme]);
			}
		});
	}

});

describe('TracePass passport — condition flags operations', () => {
	const props = new TracePass().description.properties;
	const routes = collectRoutes();

	it('getConditionFlags routes to the correct GET endpoint', () => {
		const r = routes.find((r) => r.owner === 'operation:getConditionFlags');
		expect(r, 'getConditionFlags route missing').toBeTruthy();
		expect(r.method).toBe('GET');
		expect(r.url).toBe('=/api/v1/passports/{{$parameter["passportId"]}}/condition-flags');
	});

	it('getConditionFlagsBySerial routes to the correct GET by-serial endpoint', () => {
		const r = routes.find((r) => r.owner === 'operation:getConditionFlagsBySerial');
		expect(r, 'getConditionFlagsBySerial route missing').toBeTruthy();
		expect(r.method).toBe('GET');
		expect(r.url).toBe('=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/condition-flags');
	});

	it('setConditionFlags routes to the correct PATCH endpoint', () => {
		const r = routes.find((r) => r.owner === 'operation:setConditionFlags');
		expect(r, 'setConditionFlags route missing').toBeTruthy();
		expect(r.method).toBe('PATCH');
		expect(r.url).toBe('=/api/v1/passports/{{$parameter["passportId"]}}/condition-flags');
	});

	it('setConditionFlagsBySerial routes to the correct PATCH by-serial endpoint', () => {
		const r = routes.find((r) => r.owner === 'operation:setConditionFlagsBySerial');
		expect(r, 'setConditionFlagsBySerial route missing').toBeTruthy();
		expect(r.method).toBe('PATCH');
		expect(r.url).toBe('=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/condition-flags');
	});

	it('passportId field is shown for getConditionFlags and setConditionFlags', () => {
		const f = props.find((p) => p.name === 'passportId');
		expect(f, 'passportId field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getConditionFlags');
		expect(f.displayOptions?.show?.operation).toContain('setConditionFlags');
	});

	it('serialNumber field is shown for getConditionFlagsBySerial and setConditionFlagsBySerial', () => {
		const f = props.find(
			(p) => p.name === 'serialNumber' && p.displayOptions?.show?.operation?.includes?.('getBySerial'),
		);
		expect(f, 'serialNumber field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getConditionFlagsBySerial');
		expect(f.displayOptions?.show?.operation).toContain('setConditionFlagsBySerial');
	});

	it('conditionFlagsBody field is shown for set operations only', () => {
		const f = props.find((p) => p.name === 'conditionFlagsBody');
		expect(f, 'conditionFlagsBody field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('setConditionFlags');
		expect(f.displayOptions?.show?.operation).toContain('setConditionFlagsBySerial');
		expect(f.displayOptions?.show?.operation).not.toContain('getConditionFlags');
		expect(f.displayOptions?.show?.operation).not.toContain('getConditionFlagsBySerial');
	});

	it('conditionFlagsBody sends to the request body', () => {
		const f = props.find((p) => p.name === 'conditionFlagsBody');
		expect(f, 'conditionFlagsBody field missing').toBeTruthy();
		expect(f.routing?.send?.type).toBe('body');
	});
});

describe('TracePass passport — Data Matrix and point-in-time snapshots', () => {
	const props = new TracePass().description.properties;
	const platformRoute = (...segs) => readFileSync(join(PLATFORM_V1, ...segs, 'route.ts'), 'utf8');

	it('QR options send symbology (qr | datamatrix), and the platform QR route reads it', () => {
		const opts = props.find((p) => p.name === 'qrOptions');
		const sym = opts.options.find((o) => o.name === 'symbology');
		expect(sym, 'symbology option missing').toBeTruthy();
		expect(sym.routing.send).toEqual({ type: 'query', property: 'symbology' });
		expect(sym.options.map((o) => o.value).sort()).toEqual(['datamatrix', 'qr']);
		expect(platformRoute('passports', '[id]', 'qr')).toContain('"symbology"');
	});

	it('Get Snapshots sends `at` from "As Of", and the platform snapshots route reads it', () => {
		const f = props.find((p) => p.name === 'snapshotAt');
		expect(f, 'snapshotAt field missing').toBeTruthy();
		expect(f.displayOptions.show.operation).toEqual(['getSnapshots']);
		expect(f.routing.send.type).toBe('query');
		expect(f.routing.send.property).toBe('at');
		expect(platformRoute('passports', '[id]', 'snapshots')).toContain('searchParams.get("at")');
	});
});
