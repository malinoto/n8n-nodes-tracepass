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

/**
 * Every `routing` block reachable from the node's properties.
 * @returns {Array<{ method: string, url: string, owner: string }>} One entry per operation that
 *   calls the API, with the property (and option) it belongs to.
 */
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
 * @param {string} url The node's request URL expression.
 * @returns {string} The route shape, e.g. `passports/[id]/qr`.
 */
function toRouteShape(url) {
	return url
		.replace(/^=/, '')
		.replace(/^\/api\/v1\//, '')
		.replace(/\{\{[^}]*\}\}/g, '\u0000')
		.replace(/\/$/, '');
}

/**
 * The HTTP methods a platform route file exports (`export const GET = …`, or
 * the `export async function POST` form). A Next.js route answers only the
 * methods it exports, so a node operation with the right URL and the wrong
 * method gets a 405 in a user's workflow.
 * @param {string} file Absolute path of a `route.ts`.
 * @returns {Set<string>} The exported method names.
 */
function exportedMethods(file) {
	const source = readFileSync(file, 'utf8');
	const methods = new Set();
	const pattern = /^export\s+(?:const|async\s+function|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/gm;
	for (const match of source.matchAll(pattern)) methods.add(match[1]);
	return methods;
}

/**
 * The platform's real v1 routes, in the same wildcard shape.
 * @returns {Map<string, Set<string>>} One entry per `route.ts` under the platform's v1
 *   folder: its shape, and the methods it exports.
 */
function platformRouteShapes() {
	const shapes = new Map();
	const walk = (dir, segments) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				// A [param] / [...catchall] directory is a runtime substitution.
				const seg = /^\[.*\]$/.test(entry.name) ? '\u0000' : entry.name;
				walk(join(dir, entry.name), [...segments, seg]);
			} else if (entry.name === 'route.ts') {
				shapes.set(segments.join('/'), exportedMethods(join(dir, entry.name)));
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
			expect(r.url.replace(/^=/, ''), `${r.owner} routes outside /api/v1`).toMatch(/^\/api\/v1\//);
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

	it('every routed operation uses a method its platform route exports', () => {
		if (!existsSync(PLATFORM_V1)) return;

		const real = platformRouteShapes();
		for (const r of routes) {
			const methods = real.get(toRouteShape(r.url));
			if (!methods) continue; // the URL test above reports a missing route
			expect(
				methods.has(r.method.toUpperCase()),
				`${r.owner} → ${r.method} ${r.url}\n  the route exports only ${[...methods].join(', ')}`,
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
			expect(
				cred.displayOptions?.show?.authentication,
				`${cred.name} is not auth-gated`,
			).toBeTruthy();
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
			expect(send?.value, `${opt.value} routing.send.value should equal the scheme`).toBe(
				opt.value,
			);
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
		expect(r.url).toBe(
			'=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/condition-flags',
		);
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
		expect(r.url).toBe(
			'=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/condition-flags',
		);
	});

	it('passportId field is shown for getConditionFlags and setConditionFlags', () => {
		const f = props.find((p) => p.name === 'passportId');
		expect(f, 'passportId field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getConditionFlags');
		expect(f.displayOptions?.show?.operation).toContain('setConditionFlags');
	});

	it('serialNumber field is shown for getConditionFlagsBySerial and setConditionFlagsBySerial', () => {
		const f = props.find(
			(p) =>
				p.name === 'serialNumber' && p.displayOptions?.show?.operation?.includes?.('getBySerial'),
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
		// The platform checkout is a sibling locally, absent in CI (same rule as above).
		if (existsSync(PLATFORM_V1))
			expect(platformRoute('passports', '[id]', 'qr')).toContain('"symbology"');
	});

	it('Get Snapshots sends `at` from "As Of", and the platform snapshots route reads it', () => {
		const f = props.find((p) => p.name === 'snapshotAt');
		expect(f, 'snapshotAt field missing').toBeTruthy();
		expect(f.displayOptions.show.operation).toEqual(['getSnapshots']);
		expect(f.routing.send.type).toBe('query');
		expect(f.routing.send.property).toBe('at');
		if (existsSync(PLATFORM_V1))
			expect(platformRoute('passports', '[id]', 'snapshots')).toContain('searchParams.get("at")');
	});
});

describe('TracePass passport Create — battery lineage (Art. 77(7))', () => {
	const props = new TracePass().description.properties;
	const opts = props.find((p) => p.name === 'createOptions');

	it('is an optional collection on Create only, so nothing is sent unless added', () => {
		expect(opts, 'createOptions collection missing').toBeTruthy();
		expect(opts.type).toBe('collection');
		expect(opts.default).toEqual({});
		expect(opts.displayOptions?.show?.operation).toEqual(['create']);
	});

	it('Lineage (JSON) sends the body property lineage', () => {
		const l = (opts?.options ?? []).find((o) => o.name === 'lineage');
		expect(l, 'lineage option missing').toBeTruthy();
		expect(l.type).toBe('json');
		expect(l.routing?.send).toEqual({ type: 'body', property: 'lineage' });
	});
});

describe('TracePass passport — battery measurements (living record)', () => {
	const props = new TracePass().description.properties;
	const ops = props.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('passport'),
	).options;
	const byValue = (v) => ops.find((o) => o.value === v);

	it('routes capture, history and latest to the measurements endpoints', () => {
		expect(byValue('captureMeasurements').routing.request).toMatchObject({
			method: 'POST',
			url: '=/api/v1/passports/{{$parameter["passportId"]}}/measurements',
		});
		expect(byValue('captureMeasurementsBySerial').routing.request.url).toContain('/by-serial/');
		expect(byValue('getMeasurements').routing.request).toMatchObject({ method: 'GET' });
		expect(byValue('getLatestMeasurements').routing.request.url).toMatch(/\/measurements\/latest$/);
	});

	it('sends the measurements array as the body property', () => {
		const body = props.find((p) => p.name === 'measurementsBody');
		expect(body.routing.send).toEqual({ type: 'body', property: 'measurements' });
		expect(body.displayOptions.show.operation).toEqual([
			'captureMeasurements',
			'captureMeasurementsBySerial',
		]);
	});

	it('shows the passport id / serial inputs the new operations need', () => {
		const id = props.find((p) => p.name === 'passportId');
		for (const op of ['captureMeasurements', 'getLatestMeasurements', 'getMeasurements'])
			expect(id.displayOptions.show.operation).toContain(op);
		const serial = props.find((p) => p.name === 'serialNumber');
		expect(serial.displayOptions.show.operation).toContain('captureMeasurementsBySerial');
	});
});

describe('TracePass scope — Check and Get Catalogue Report', () => {
	const props = new TracePass().description.properties;
	const routes = collectRoutes();

	it('Check routes to POST /api/v1/scope/check', () => {
		const r = routes.find((r) => r.owner === 'operation:check');
		expect(r, 'check route missing').toBeTruthy();
		expect(r.method).toBe('POST');
		expect(r.url).toBe('/api/v1/scope/check');
	});

	it('Get Catalogue Report routes to GET /api/v1/scope/catalogue', () => {
		const r = routes.find((r) => r.owner === 'operation:getCatalogueReport');
		expect(r, 'getCatalogueReport route missing').toBeTruthy();
		expect(r.method).toBe('GET');
		expect(r.url).toBe('/api/v1/scope/catalogue');
	});

	it('scopeCategory sends to body.category on Check', () => {
		const f = props.find((p) => p.name === 'scopeCategory');
		expect(f, 'scopeCategory field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('check');
		expect(f.routing?.send?.type).toBe('body');
		expect(f.routing?.send?.property).toBe('category');
	});

	it('scopeRole sends to body.role on Check', () => {
		const f = props.find((p) => p.name === 'scopeRole');
		expect(f, 'scopeRole field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('check');
		expect(f.routing?.send?.type).toBe('body');
		expect(f.routing?.send?.property).toBe('role');
	});

	it('scopeFacts sends to body.facts on Check', () => {
		const f = props.find((p) => p.name === 'scopeFacts');
		expect(f, 'scopeFacts field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('check');
		expect(f.routing?.send?.type).toBe('body');
		expect(f.routing?.send?.property).toBe('facts');
	});

	it('placingDate sends to body.placedOnMarket.date on Check', () => {
		const f = props.find((p) => p.name === 'placingDate');
		expect(f, 'placingDate field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('check');
		expect(f.routing?.send?.type).toBe('body');
		expect(f.routing?.send?.property).toBe('placedOnMarket.date');
	});

	it('placingPrecision sends to body.placedOnMarket.precision on Check', () => {
		const f = props.find((p) => p.name === 'placingPrecision');
		expect(f, 'placingPrecision field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('check');
		expect(f.routing?.send?.type).toBe('body');
		expect(f.routing?.send?.property).toBe('placedOnMarket.precision');
	});

	it('scopeLocale sends to body.locale on Check', () => {
		const f = props.find((p) => p.name === 'scopeLocale');
		expect(f, 'scopeLocale field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('check');
		expect(f.routing?.send?.type).toBe('body');
		expect(f.routing?.send?.property).toBe('locale');
	});

	it('scopeLocale exposes all four supported locales', () => {
		const f = props.find((p) => p.name === 'scopeLocale');
		const values = (f?.options ?? []).map((o) => o.value);
		expect(values).toContain('en');
		expect(values).toContain('bg');
		expect(values).toContain('de');
		expect(values).toContain('it');
	});

	it('checkOptions collection is shown only for Check', () => {
		const f = props.find((p) => p.name === 'checkOptions');
		expect(f, 'checkOptions collection missing').toBeTruthy();
		expect(f.type).toBe('collection');
		expect(f.displayOptions?.show?.operation).toEqual(['check']);
	});

	it('checkOptions collection includes productId and passportId', () => {
		const f = props.find((p) => p.name === 'checkOptions');
		const names = (f?.options ?? []).map((o) => o.name);
		expect(names).toContain('productId');
		expect(names).toContain('passportId');
	});

	it('scopeCategory includes vehicles (a scope-rules-only category, not a template category)', () => {
		const f = props.find((p) => p.name === 'scopeCategory');
		const values = (f?.options ?? []).map((o) => o.value);
		expect(values).toContain('vehicles');
		expect(values).toContain('other');
		expect(values).toContain('battery');
	});

	it('catalogueClassification sends to query.classification on Get Catalogue Report', () => {
		const f = props.find((p) => p.name === 'catalogueClassification');
		expect(f, 'catalogueClassification field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getCatalogueReport');
		expect(f.routing?.send?.type).toBe('query');
		expect(f.routing?.send?.property).toBe('classification');
	});

	it('catalogueChanged sends to query.changed on Get Catalogue Report', () => {
		const f = props.find((p) => p.name === 'catalogueChanged');
		expect(f, 'catalogueChanged field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getCatalogueReport');
		expect(f.routing?.send?.type).toBe('query');
		expect(f.routing?.send?.property).toBe('changed');
	});

	it('catalogueLimit sends to query.limit and caps at 500', () => {
		const f = props.find((p) => p.name === 'catalogueLimit');
		expect(f, 'catalogueLimit field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getCatalogueReport');
		expect(f.routing?.send?.type).toBe('query');
		expect(f.routing?.send?.property).toBe('limit');
		expect(f.typeOptions?.maxValue).toBe(500);
	});

	it('catalogueCursor sends to query.cursor on Get Catalogue Report', () => {
		const f = props.find((p) => p.name === 'catalogueCursor');
		expect(f, 'catalogueCursor field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getCatalogueReport');
		expect(f.routing?.send?.type).toBe('query');
		expect(f.routing?.send?.property).toBe('cursor');
	});

	it('catalogueCategory sends to query.category on Get Catalogue Report', () => {
		const f = props.find((p) => p.name === 'catalogueCategory');
		expect(f, 'catalogueCategory field missing').toBeTruthy();
		expect(f.displayOptions?.show?.operation).toContain('getCatalogueReport');
		expect(f.routing?.send?.type).toBe('query');
		expect(f.routing?.send?.property).toBe('category');
	});

	it('catalogue classification filter covers all seven platform classification values', () => {
		const f = props.find((p) => p.name === 'catalogueClassification');
		const values = (f?.options ?? []).map((o) => o.value).filter(Boolean);
		expect(values).toContain('missing');
		expect(values).toContain('draft_only');
		expect(values).toContain('published_incomplete');
		expect(values).toContain('published');
		expect(values).toContain('not_required');
		expect(values).toContain('open_questions');
		expect(values).toContain('not_covered');
	});

	it('scope operations are only shown for the scope resource', () => {
		const scopeOps = props.find(
			(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('scope'),
		);
		expect(scopeOps, 'scope operation selector missing').toBeTruthy();
		expect(scopeOps.displayOptions?.show?.resource).toEqual(['scope']);
	});

	it('scope routes match real platform v1 routes', () => {
		if (!existsSync(PLATFORM_V1)) return;
		const real = platformRouteShapes();
		const scopeRoutes = routes.filter(
			(r) => r.owner === 'operation:check' || r.owner === 'operation:getCatalogueReport',
		);
		expect(scopeRoutes.length).toBe(2);
		for (const r of scopeRoutes) {
			const shape = toRouteShape(r.url);
			expect(
				real.has(shape),
				`${r.owner} → ${r.method} ${r.url}\n  no platform route matches shape "${shape}"`,
			).toBe(true);
		}
	});
});

describe('TracePass passport — Update Field source', () => {
	const props = new TracePass().description.properties;
	const source = props.find((p) => p.name === 'fieldSource');

	it('is offered on both update-field operations and sent as body.source', () => {
		expect(source.displayOptions.show.operation).toEqual(['updateField', 'updateFieldBySerial']);
		expect(source.routing.send).toEqual({ type: 'body', property: 'source' });
	});

	it('defaults to manual, the API default, so existing workflows send the same thing', () => {
		expect(source.default).toBe('manual');
	});

	it('offers only manual and ai_suggested', () => {
		expect(source.options.map((o) => o.value).sort()).toEqual(['ai_suggested', 'manual']);
	});

	it('offers only origins the platform accepts from API callers', () => {
		const file = join(
			HERE,
			'..',
			'..',
			'tracepass-platform',
			'src',
			'lib',
			'passports',
			'v1-claimable-sources.ts',
		);
		if (!existsSync(file)) return;
		const text = readFileSync(file, 'utf8');
		for (const o of source.options) expect(text, o.value).toContain(`"${o.value}"`);
	});
});

describe('TracePass passport — create sends no overage consent', () => {
	// Creating a passport makes a draft, which takes no plan slot: the platform
	// decides the cap and any overage at publish (dashboard only), and ignores a
	// confirmOverage on create. A toggle here would tell users create is billed.
	const properties = new TracePass().description.properties;
	const createOps = ['create', 'createBatch'];
	const onCreate = properties.filter((p) => {
		const show = p.displayOptions?.show;
		return (
			show?.resource?.includes('passport') && show?.operation?.some((o) => createOps.includes(o))
		);
	});

	it('has create properties to check', () => {
		expect(onCreate.length).toBeGreaterThan(0);
	});

	it('no create property sends confirmOverage', () => {
		const sendsOverage = (p) =>
			p.routing?.send?.property === 'confirmOverage' || (p.options ?? []).some(sendsOverage);
		expect(onCreate.filter(sendsOverage).map((p) => p.name)).toEqual([]);
	});
});

describe('TracePass passport — archive and deletion reason (battery end of passport)', () => {
	// The platform requires one of a closed set of reasons to archive a battery
	// passport, or to mark one for deletion (400 reason_required / invalid_reason),
	// and reads it from the JSON body `{ reason }`. Without this field a battery
	// passport can be neither archived nor marked for deletion from n8n.
	const props = new TracePass().description.properties;
	const reason = props.find((p) => p.name === 'archiveReason');
	const platformFile = (...segs) => join(HERE, '..', '..', 'tracepass-platform', ...segs);

	it('is offered on the archive and mark-for-deletion operations only', () => {
		expect(reason, 'archiveReason field missing').toBeTruthy();
		expect(reason.displayOptions.show.resource).toEqual(['passport']);
		expect(reason.displayOptions.show.operation).toEqual([
			'archive',
			'archiveBySerial',
			'markForDeletion',
			'markForDeletionBySerial',
		]);
	});

	it('is sent as body.reason, and omitted when left empty', () => {
		expect(reason.routing.send).toEqual({
			type: 'body',
			property: 'reason',
			value: '={{ $value || undefined }}',
		});
		expect(reason.default).toBe('');
		expect(reason.required).toBeFalsy();
	});

	it('offers exactly the three platform reasons plus empty', () => {
		expect(reason.options.map((o) => o.value).sort()).toEqual([
			'',
			'duplicate_or_error',
			'never_placed',
			'recycled',
		]);
	});

	it('offers only reasons the platform accepts, and all four routes read body.reason', () => {
		const types = platformFile('src', 'types', 'index.ts');
		if (!existsSync(types)) return;
		// The whole array literal, on one line or spread over several (Prettier wraps it).
		const declaration = /export const DELETION_REASONS\b[^=]*=\s*\[([^\]]*)\]/.exec(
			readFileSync(types, 'utf8'),
		);
		expect(declaration, 'DELETION_REASONS not found in the platform types').toBeTruthy();
		const platformReasons = [...declaration[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
		expect(platformReasons.length, 'no reasons parsed from DELETION_REASONS').toBeGreaterThan(0);
		expect(
			reason.options
				.map((o) => o.value)
				.filter(Boolean)
				.sort(),
		).toEqual(platformReasons);
		// Each route parses its body with its schema from the platform's request
		// registry and takes `reason` from the result.
		for (const route of [
			['passports', '[id]', 'archive'],
			['passports', 'by-serial', '[serial]', 'archive'],
			['passports', '[id]', 'mark-for-deletion'],
			['passports', 'by-serial', '[serial]', 'mark-for-deletion'],
		]) {
			const text = readFileSync(join(PLATFORM_V1, ...route, 'route.ts'), 'utf8');
			expect(text, route.join('/')).toMatch(/\{\s*reason\b[^}]*\}\s*=\s*requestSchema\(/);
		}
	});
});

describe('TracePass passport — Place on Market (battery EU registry entry)', () => {
	const props = new TracePass().description.properties;
	const opProp = props.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('passport'),
	);
	const op = (opProp?.options ?? []).find((o) => o.value === 'placeOnMarket');
	const platformFile = (...segs) =>
		process.env.TRACEPASS_PLATFORM_PATH
			? join(process.env.TRACEPASS_PLATFORM_PATH, ...segs)
			: join(HERE, '..', '..', 'tracepass-platform', ...segs);

	it('is a POST to the place-on-market route of the chosen passport', () => {
		expect(op, 'placeOnMarket operation missing').toBeTruthy();
		expect(op.routing.request.method).toBe('POST');
		expect(op.routing.request.url).toBe(
			'=/api/v1/passports/{{$parameter["passportId"]}}/place-on-market',
		);
	});

	it('shows the Passport ID field and sends no other parameter', () => {
		const shown = props.filter((p) => p.displayOptions?.show?.operation?.includes('placeOnMarket'));
		expect(shown.map((p) => p.name)).toEqual(['passportId']);
	});

	it('names every 409 refusal code the platform gate returns', () => {
		const pure = platformFile('src', 'lib', 'passports', 'place-on-market-pure.ts');
		if (!existsSync(pure)) return;
		const src = readFileSync(pure, 'utf8');
		const union = src.slice(
			src.indexOf('export type PlaceOnMarketGateCode'),
			src.indexOf(';', src.indexOf('export type PlaceOnMarketGateCode')),
		);
		const codes = [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).filter((c) => c !== 'ok');
		// The floor guards the parser (a broken slice would find none and pass
		// vacuously); the loop below is what checks the description. A new gate
		// code fails the loop until the description names it, without a count here.
		expect(codes.length).toBeGreaterThanOrEqual(7);
		for (const c of codes) expect(op.description, c).toContain(c);
	});
});

/**
 * Coverage against the published contract: every operation in the v1 OpenAPI
 * spec either has an n8n operation or is listed here as absent on purpose,
 * with the reason. A new platform endpoint that is documented but neither
 * added to the node nor listed fails this test, so a gap is a decision, not
 * something nobody noticed.
 *
 * The spec lives in the marketing site's repo (`public/openapi.json`), a
 * sibling checkout; `TRACEPASS_SITE_DIR` points at another copy, such as a
 * branch worktree. Like the route test above, it returns early when the spec
 * is not there, because CI clones this repo alone.
 */
const SPEC = process.env.TRACEPASS_SITE_DIR
	? join(process.env.TRACEPASS_SITE_DIR, 'public', 'openapi.json')
	: join(HERE, '..', '..', 'tracepass', 'public', 'openapi.json');

/** Spec operations the node does not offer, keyed `METHOD /path` as the spec writes them. */
const ABSENT_ON_PURPOSE = {
	'POST /api/v1/products/{id}/images':
		'A multipart file upload, which declarative routing does not send.',
	'DELETE /api/v1/products/{id}/images/{index}':
		'A product image list is managed through product Create and Update.',
	'DELETE /api/v1/products/{id}':
		'An irreversible hard delete; Archive is the path automations get.',
	'POST /api/v1/scope/reports': "Serves the DPP Assistant's channel, which has its own MCP server.",
	'GET /api/v1/company/compliance-profile':
		"Serves the DPP Assistant's channel, which has its own MCP server.",
	'PATCH /api/v1/company/compliance-profile':
		"Serves the DPP Assistant's channel, which has its own MCP server.",
	'DELETE /api/v1/company/compliance-profile':
		"Serves the DPP Assistant's channel, which has its own MCP server.",
	'GET /api/v1/regulatory/required-fields':
		"Serves the DPP Assistant's channel, which has its own MCP server; Template Get gives the field requirements.",
	'GET /api/v1/regulatory/changes':
		"Serves the DPP Assistant's channel, which has its own MCP server.",
	'GET /api/v1/regulatory/registry-guidance':
		"Serves the DPP Assistant's channel, which has its own MCP server.",
	'GET /api/exports/tenant': 'Dashboard session only; an API key or OAuth token cannot reach it.',
	'GET /api/exports/tenant/epcis':
		'Dashboard session only; the per-passport EPCIS operations cover API access.',
	'GET /api/exports/tenant/registry-batch':
		'Dashboard session only; Create Registry Upload File covers API access.',
	'POST /api/oauth/register': 'OAuth plumbing: an app is registered once in the dashboard.',
	'GET /api/oauth/authorize': 'Used by the TracePass OAuth2 credential, not an operation.',
	'POST /api/oauth/token': 'Used by the TracePass OAuth2 credential, which also refreshes tokens.',
	'POST /api/oauth/revoke': 'OAuth plumbing: access is revoked in the dashboard.',
};

/**
 * Collapse every path parameter so the spec's `{id}` and the node's
 * `{{$parameter["passportId"]}}` compare equal.
 * @param {string} method HTTP method.
 * @param {string} path A spec path or a node URL.
 * @returns {string} `METHOD /path` with each parameter as `{}`.
 */
function operationKey(method, path) {
	const shape = path
		.replace(/^=/, '')
		.replace(/\{\{[^}]*\}\}/g, '{}')
		.replace(/\{[^}]+\}/g, '{}');
	return `${method.toUpperCase()} ${shape}`;
}

describe('TracePass node — coverage of the published v1 contract', () => {
	const offered = new Set(collectRoutes().map((r) => operationKey(r.method, r.url)));
	const spec = existsSync(SPEC) ? JSON.parse(readFileSync(SPEC, 'utf8')) : null;
	const specOps = spec
		? Object.entries(spec.paths).flatMap(([path, item]) =>
				['get', 'post', 'put', 'patch', 'delete']
					.filter((m) => item[m])
					.map((m) => ({ key: `${m.toUpperCase()} ${path}`, shape: operationKey(m, path) })),
			)
		: [];

	it('every spec operation has an n8n operation or a recorded reason for its absence', () => {
		if (!spec) return;
		expect(specOps.length, 'no operations read from the spec — check the path').toBeGreaterThan(40);
		const uncovered = specOps
			.filter((op) => !offered.has(op.shape) && !(op.key in ABSENT_ON_PURPOSE))
			.map((op) => op.key);
		expect(
			uncovered,
			'add an n8n operation, or list it in ABSENT_ON_PURPOSE with the reason',
		).toEqual([]);
	});

	it('lists no absence that is stale: each one is in the spec and not offered', () => {
		if (!spec) return;
		const keys = new Set(specOps.map((op) => op.key));
		for (const key of Object.keys(ABSENT_ON_PURPOSE)) {
			expect(keys.has(key), `${key} is not in the spec any more`).toBe(true);
			const [method, path] = key.split(' ');
			expect(
				offered.has(operationKey(method, path)),
				`${key} is offered now; remove it from the list`,
			).toBe(false);
		}
	});

	it('gives every absence a reason', () => {
		for (const [key, reason] of Object.entries(ABSENT_ON_PURPOSE)) {
			expect(reason.length, key).toBeGreaterThan(20);
		}
	});
});

describe('TracePass passport — parties, deletion and by-serial measurement reads', () => {
	const props = new TracePass().description.properties;
	const prop = (name) => props.find((p) => p.name === name);
	const shownFor = (name) => prop(name)?.displayOptions?.show?.operation ?? [];
	const spec = existsSync(SPEC) ? JSON.parse(readFileSync(SPEC, 'utf8')) : null;

	it('Set Party sends the legal name as body.legalName and needs a role and a passport', () => {
		expect(prop('partyLegalName').routing.send).toEqual({ type: 'body', property: 'legalName' });
		expect(prop('partyLegalName').required).toBe(true);
		expect(shownFor('partyRole')).toEqual(['setParty', 'removeParty']);
		expect(shownFor('passportId')).toEqual(
			expect.arrayContaining(['setParty', 'removeParty', 'delete', 'markForDeletion']),
		);
	});

	it('Remove Party sends no body', () => {
		expect(shownFor('partyLegalName')).toEqual(['setParty']);
		expect(shownFor('partyFields')).toEqual(['setParty']);
	});

	it('offers exactly the party roles the spec defines', () => {
		if (!spec) return;
		expect(
			prop('partyRole')
				.options.map((o) => o.value)
				.sort(),
		).toEqual([...spec.components.schemas.PartyRoleEnum.enum].sort());
	});

	it('sends each party field to a writable property of the spec Party schema', () => {
		if (!spec) return;
		const party = spec.components.schemas.Party.properties;
		for (const option of prop('partyFields').options) {
			const property = option.routing.send.property;
			expect(option.routing.send.type, option.name).toBe('body');
			expect(party[property], `${option.name} → ${property} is not a Party property`).toBeTruthy();
			expect(party[property].readOnly, `${property} is read-only`).not.toBe(true);
		}
	});

	it('mark for deletion by serial takes the serial and the GTIN disambiguator', () => {
		for (const op of [
			'markForDeletionBySerial',
			'getMeasurementsBySerial',
			'getLatestMeasurementsBySerial',
		]) {
			expect(shownFor('serialNumber'), op).toContain(op);
			expect(shownFor('serialGtin'), op).toContain(op);
		}
	});

	it('the measurement history filters apply by id and by serial', () => {
		expect(shownFor('measurementFilters')).toEqual(['getMeasurements', 'getMeasurementsBySerial']);
	});
});

describe('TracePass scope — catalogue runs', () => {
	const props = new TracePass().description.properties;
	const runId = props.find((p) => p.name === 'catalogueRunId');

	it('Get Catalogue Run takes the run ID from Start Catalogue Run', () => {
		expect(runId.required).toBe(true);
		expect(runId.displayOptions.show).toEqual({
			resource: ['scope'],
			operation: ['getCatalogueRun'],
		});
	});

	it('Start Catalogue Run sends no parameters', () => {
		const forStart = props.filter((p) =>
			p.displayOptions?.show?.operation?.includes('startCatalogueRun'),
		);
		expect(forStart).toEqual([]);
	});
});

/**
 * The marketing site's n8n docs page lists each resource's operations
 * verbatim (`PRODUCT_OPS`, `PASSPORT_OPS`, … in its n8n prose file). Nothing
 * generates those strings, so this compares them with the node's own option
 * names. Self-skips when the site is not a sibling checkout.
 */
describe('TracePass node — the docs page lists the same operations', () => {
	const siteDir = process.env.TRACEPASS_SITE_DIR ?? join(HERE, '..', '..', 'tracepass');
	const prose = join(siteDir, 'src', 'data', 'api-docs', 'prose', 'n8n.tsx');
	const LISTS = {
		product: 'PRODUCT_OPS',
		passport: 'PASSPORT_OPS',
		epcis: 'EPCIS_OPS',
		template: 'TEMPLATE_OPS',
		scope: 'SCOPE_OPS',
	};

	it('each resource list on the page equals the node operation names, in order', () => {
		if (!existsSync(prose)) return;
		const text = readFileSync(prose, 'utf8');
		const operations = new TracePass().description.properties.filter((p) => p.name === 'operation');
		expect(operations.map((p) => p.displayOptions.show.resource[0]).sort()).toEqual(
			Object.keys(LISTS).sort(),
		);
		for (const property of operations) {
			const resource = property.displayOptions.show.resource[0];
			const declaration = new RegExp(`const ${LISTS[resource]} =\\s*"([^"]*)"`).exec(text);
			expect(declaration, `${LISTS[resource]} not found in the docs page`).toBeTruthy();
			expect(declaration[1].split(' · '), `${LISTS[resource]} on the docs page`).toEqual(
				property.options.map((o) => o.name),
			);
		}
	});
});
