import type { INodeProperties } from 'n8n-workflow';

/**
 * Scope resource — operations + fields.
 *
 * Two operations expose the platform's scope-services v1 API:
 *
 *   - **Check** (`POST /api/v1/scope/check`) answers "does this product type
 *     need a Digital Product Passport, from when, at which level, and what must
 *     each role do?". Available on every plan including Free. Counted against the
 *     company's scope-answer cap (≈100/day, 30/min); 429 `scope_answer_cap` past
 *     it, with `Retry-After`. Not counted against the v1 daily read/write caps.
 *
 *   - **Get Catalogue Report** (`GET /api/v1/scope/catalogue`) returns the
 *     company-wide scope status: for every product (and every distinct fact set
 *     among its passports), whether a passport is needed, from when, at which
 *     level and which act. Requires Growth plan or above
 *     (`scopeCatalogueEnabled`); 403 `plan_upgrade_required` below that.
 *     Consumes one v1 daily read per page.
 *
 * Auth: an API key (`tp_…`) or an OAuth2 token with `passports:read` (or
 * additionally `regulatory:read` for Check). See the TracePass API docs.
 *
 * Response shapes follow `src/lib/scope/http.ts` and `src/lib/scope/envelope.ts`
 * in the platform; the field names here are the contract, not this comment.
 */

// ── Scope categories (extraction-core scope-rules/categories.yaml keys + 'other') ──────────────
// NOTE: 'vehicles' is a scope-rules category (End-of-Life Vehicles Regulation (EU) 2026/1738) and is
// NOT a DPP template category. Do not confuse it with template category options.
const SCOPE_CATEGORY_OPTIONS = [
	{ name: 'Battery', value: 'battery' },
	{ name: 'Construction', value: 'construction' },
	{ name: 'Detergents', value: 'detergents' },
	{ name: 'Electronics', value: 'electronics' },
	{ name: 'FMCG', value: 'fmcg' },
	{ name: 'Furniture', value: 'furniture' },
	{ name: 'Jewelry', value: 'jewelry' },
	{ name: 'Other', value: 'other' },
	{ name: 'Packaging', value: 'packaging' },
	{ name: 'Paints and Coatings', value: 'paints-coatings' },
	{ name: 'Steel', value: 'steel' },
	{ name: 'Textile', value: 'textile' },
	{ name: 'Toys', value: 'toys' },
	{ name: 'Tyres', value: 'tyres' },
	{ name: 'Vehicles', value: 'vehicles' },
];

export const scopeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: ['scope'] },
		},
		options: [
			{
				name: 'Check',
				value: 'check',
				action: 'Check product scope',
				description:
					'Ask what EU law says for a product type matching the facts given: whether it needs a Digital Product Passport, from when, at which level, under which act and article, and the duties of each role. Not legal advice. Every plan, Free included. Counted against the scope-answer cap (≈100/day), not the v1 daily read cap.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/scope/check',
					},
				},
			},
			{
				name: 'Get Catalogue Report',
				value: 'getCatalogueReport',
				action: 'Get scope catalogue report',
				description:
					"Get the company-wide scope report: for every product and every distinct fact set among its passports, whether a passport is needed, from when, at which level and under which act. Growth plan and above. One v1 daily read per page. Use the returned nextCursor to page through the full report.",
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/scope/catalogue',
					},
				},
			},
		],
		default: 'check',
	},
];

export const scopeFields: INodeProperties[] = [
	// ────────────────────────────────────────────────────────────────────────────
	// Check — body fields
	// ────────────────────────────────────────────────────────────────────────────

	{
		displayName: 'Category',
		name: 'scopeCategory',
		type: 'options',
		default: '',
		description:
			'The product category to check. Omit to let the platform infer the category from the productId or passportId.',
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		options: [{ name: '(None)', value: '' }, ...SCOPE_CATEGORY_OPTIONS],
		routing: {
			send: {
				type: 'body',
				property: 'category',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Role',
		name: 'scopeRole',
		type: 'string',
		default: '',
		placeholder: 'manufacturer',
		description:
			"Your role in the act's terms: manufacturer, importer, distributor, authorised_representative or fulfilment_service_provider. Selling under your own name is manufacturer plus the fact ownBrand: true. Omit to see the duties of every role.",
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		routing: {
			send: {
				type: 'body',
				property: 'role',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Facts (JSON)',
		name: 'scopeFacts',
		type: 'json',
		default: '{}',
		description:
			'Additional product-specific facts the scope rules may need, as a JSON object. Keys are namespaced per act (e.g. <code>battery.use</code>). Omit or pass an empty object to answer based on category and role alone. Unknown keys return 400.',
		typeOptions: {
			alwaysOpenEditWindow: false,
		},
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		routing: {
			send: {
				type: 'body',
				property: 'facts',
				value: '={{ Object.keys(JSON.parse($value || "{}")||{}).length ? JSON.parse($value) : undefined }}',
			},
		},
	},
	{
		displayName: 'Placing Date',
		name: 'placingDate',
		type: 'string',
		default: '',
		placeholder: '2026, 2026-03, or 2026-03-15',
		description:
			'When the product was or will be placed on the market, as YYYY, YYYY-MM, or YYYY-MM-DD. Together with Placing Precision, this resolves which deadlines apply.',
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		routing: {
			send: {
				type: 'body',
				property: 'placedOnMarket.date',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Placing Precision',
		name: 'placingPrecision',
		type: 'options',
		default: '',
		description:
			'The precision of the placing date. Must match the date format: "day" for YYYY-MM-DD, "month" for YYYY-MM, "year" for YYYY. Omit to let the platform infer it.',
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		options: [
			{ name: '(None)', value: '' },
			{ name: 'Day', value: 'day' },
			{ name: 'Month', value: 'month' },
			{ name: 'Year', value: 'year' },
		],
		routing: {
			send: {
				type: 'body',
				property: 'placedOnMarket.precision',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Locale',
		name: 'scopeLocale',
		type: 'options',
		default: 'en',
		description:
			'Language for the returned text (questions, labels, disclaimer). Defaults to en.',
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		options: [
			{ name: 'Bulgarian (Bg)', value: 'bg' },
			{ name: 'English (En)', value: 'en' },
			{ name: 'German (De)', value: 'de' },
			{ name: 'Italian (It)', value: 'it' },
		],
		routing: {
			send: { type: 'body', property: 'locale' },
		},
	},
	{
		displayName: 'Additional Options',
		name: 'checkOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: { resource: ['scope'], operation: ['check'] },
		},
		options: [
			{
				displayName: 'Passport ID',
				name: 'passportId',
				type: 'string',
				default: '',
				description:
					'A 24-character passport ID. When provided, the platform reads approved field values from the passport as fact sources (lower precedence than the Facts body field).',
				routing: {
					send: {
						type: 'body',
						property: 'passportId',
						value: '={{ $value || undefined }}',
					},
				},
			},
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				description:
					'A 24-character product ID. When provided, saved scope facts for that product are used as fact sources.',
				routing: {
					send: {
						type: 'body',
						property: 'productId',
						value: '={{ $value || undefined }}',
					},
				},
			},
		],
	},

	// ────────────────────────────────────────────────────────────────────────────
	// Get Catalogue Report — query params
	// ────────────────────────────────────────────────────────────────────────────

	{
		displayName: 'Changed Only',
		name: 'catalogueChanged',
		type: 'boolean',
		default: false,
		description:
			'Whether to return only rows whose scope answer changed in the most recent run (useful for detecting law-change impact on your catalogue)',
		displayOptions: {
			show: { resource: ['scope'], operation: ['getCatalogueReport'] },
		},
		routing: {
			send: {
				type: 'query',
				property: 'changed',
				value: '={{ $value ? "true" : undefined }}',
			},
		},
	},
	{
		displayName: 'Classification',
		name: 'catalogueClassification',
		type: 'options',
		default: '',
		description: 'Filter by passport status. &lt;strong&gt;Missing&lt;/strong&gt; — in scope, no passport at all. &lt;strong&gt;Draft only&lt;/strong&gt; — in scope, none published. &lt;strong&gt;Published incomplete&lt;/strong&gt; — published with incomplete warnings. &lt;strong&gt;Published&lt;/strong&gt; — published and complete. &lt;strong&gt;Not required&lt;/strong&gt; — out of scope or no duty yet. &lt;strong&gt;Open questions&lt;/strong&gt; — verdict depends on unanswered facts. &lt;strong&gt;Not covered&lt;/strong&gt; — outside the rules or under review.',
		displayOptions: {
			show: { resource: ['scope'], operation: ['getCatalogueReport'] },
		},
		options: [
			{ name: '(All)', value: '' },
			{ name: 'Draft Only', value: 'draft_only' },
			{ name: 'Missing', value: 'missing' },
			{ name: 'Not Covered', value: 'not_covered' },
			{ name: 'Not Required', value: 'not_required' },
			{ name: 'Open Questions', value: 'open_questions' },
			{ name: 'Published', value: 'published' },
			{ name: 'Published Incomplete', value: 'published_incomplete' },
		],
		routing: {
			send: {
				type: 'query',
				property: 'classification',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Category',
		name: 'catalogueCategory',
		type: 'options',
		default: '',
		description: 'Filter the report to one product category',
		displayOptions: {
			show: { resource: ['scope'], operation: ['getCatalogueReport'] },
		},
		options: [{ name: '(All)', value: '' }, ...SCOPE_CATEGORY_OPTIONS],
		routing: {
			send: {
				type: 'query',
				property: 'category',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Cursor',
		name: 'catalogueCursor',
		type: 'string',
		default: '',
		description:
			'Pagination cursor from a previous response\'s <code>nextCursor</code> field. Omit for the first page.',
		displayOptions: {
			show: { resource: ['scope'], operation: ['getCatalogueReport'] },
		},
		routing: {
			send: {
				type: 'query',
				property: 'cursor',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'catalogueLimit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1, maxValue: 500 },
		description: 'Max number of rows to return per page (1–500, default 50)',
		displayOptions: {
			show: { resource: ['scope'], operation: ['getCatalogueReport'] },
		},
		routing: {
			send: { type: 'query', property: 'limit' },
		},
	},
];
