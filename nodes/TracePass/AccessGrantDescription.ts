import type { INodeProperties } from 'n8n-workflow';

/**
 * Access Grant resource — operations + fields.
 *
 * An access grant lets a named partner (a repairer, a recycler, a purchaser, …)
 * read the restricted data of passports through a secret `pa_` token. Each
 * operation maps to a TracePass v1 `/api/v1/access-grants` route.
 *
 * Auth: an OAuth2 token with `access_grants:read` (reads) or `access_grants:write`
 * (writes, as an admin user), or an API key whose owner switched on "May manage
 * access grants" for that key (403 `access_grants_not_enabled` otherwise).
 * Authority roles (market surveillance, notified body, commission, customs) are
 * dashboard-only (400 `role_dashboard_only`).
 *
 * The raw token is in the Create response ONCE (`token`); an idempotent replay
 * carries `tokenDelivered: true` and no token.
 */

/** Roles an operator can name through the API; the authority roles are dashboard-only. */
const GRANT_ROLE_OPTIONS = [
	{ name: 'ELV Treatment', value: 'elv_treatment' },
	{ name: 'Other', value: 'other' },
	{ name: 'Purchaser', value: 'purchaser' },
	{ name: 'Purchaser Agent', value: 'purchaser_agent' },
	{ name: 'Recycler', value: 'recycler' },
	{ name: 'Remanufacturer', value: 'remanufacturer' },
	{ name: 'Repairer', value: 'repairer' },
	{ name: 'Repurposer', value: 'repurposer' },
	{ name: 'Training Centre', value: 'training_centre' },
	{ name: 'Waste Treatment', value: 'waste_treatment' },
	{ name: 'WEEE Treatment', value: 'weee_treatment' },
];

const SCOPE_KIND_OPTIONS = [
	{ name: 'Chosen Passports', value: 'passports' },
	{ name: 'Chosen Products', value: 'products' },
	{ name: 'Whole Company', value: 'company' },
];

const EVIDENCE_TYPE_OPTIONS = [
	{ name: 'Authority Letter', value: 'authority_letter' },
	{ name: 'Contract', value: 'contract' },
	{ name: 'Invoice', value: 'invoice' },
	{ name: 'Other', value: 'other' },
	{ name: 'Register Entry', value: 'register_entry' },
];

/** `a, b` -> `['a','b']`; empty -> undefined (so the field is left out). */
const IDS_VALUE =
	'={{ $value ? $value.split(",").map((s) => s.trim()).filter((s) => s) : undefined }}';

export const accessGrantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: ['accessGrant'] },
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an access grant',
				description:
					'Share restricted passport data with a partner. The response carries the secret pa_ token in the token field ONCE: hand it to the recipient straight away, do not log or store it, it cannot be shown again (if lost, revoke the grant and create a new one). Authority roles are dashboard-only.',
				routing: {
					request: { method: 'POST', url: '/api/v1/access-grants' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an access grant',
				description: 'Retrieve one access grant. Never returns the token.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/access-grants/{{$parameter["accessGrantId"]}}',
					},
				},
			},
			{
				name: 'Get Activity',
				value: 'getActivity',
				action: 'Get the access log of an access grant',
				description: 'The access-log rows of the grant: when and through which surface it was used',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/access-grants/{{$parameter["accessGrantId"]}}/activity',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many access grants',
				description:
					'List the access grants of the company, paged by cursor. Never returns a token.',
				routing: {
					request: { method: 'GET', url: '/api/v1/access-grants' },
				},
			},
			{
				name: 'Revoke',
				value: 'revoke',
				action: 'Revoke an access grant',
				description: 'End the grant at once. Safe to repeat.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/v1/access-grants/{{$parameter["accessGrantId"]}}',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an access grant',
				description: 'Change the label, purpose, evidence, expiry or scope of a grant',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/access-grants/{{$parameter["accessGrantId"]}}',
					},
				},
			},
		],
		default: 'getAll',
	},
];

export const accessGrantFields: INodeProperties[] = [
	{
		displayName: 'Access Grant ID',
		name: 'accessGrantId',
		type: 'string',
		required: true,
		default: '',
		description: 'The TracePass ID of the access grant',
		displayOptions: {
			show: {
				resource: ['accessGrant'],
				operation: ['get', 'getActivity', 'revoke', 'update'],
			},
		},
	},

	// ---- Create ----------------------------------------------------
	{
		displayName: 'Role',
		name: 'grantRole',
		type: 'options',
		required: true,
		default: 'recycler',
		description:
			'What the recipient is. The role decides which restricted data it sees (for batteries, which Annex XIII points). Authority roles can be issued only in the dashboard.',
		options: GRANT_ROLE_OPTIONS,
		displayOptions: { show: { resource: ['accessGrant'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'role' } },
	},
	{
		displayName: 'Label',
		name: 'grantLabel',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme Recycling',
		description: 'Who the grant is for, as shown in the dashboard (max 120 characters)',
		displayOptions: { show: { resource: ['accessGrant'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'label' } },
	},
	{
		displayName: 'Scope',
		name: 'grantScopeKind',
		type: 'options',
		required: true,
		default: 'company',
		description: 'Which passports the grant covers',
		options: SCOPE_KIND_OPTIONS,
		displayOptions: { show: { resource: ['accessGrant'], operation: ['create'] } },
		routing: { send: { type: 'body', property: 'scope.kind' } },
	},
	{
		displayName: 'Scope IDs',
		name: 'grantScopeIds',
		type: 'string',
		required: true,
		default: '',
		description: 'Comma-separated product or passport IDs the grant covers (up to 500)',
		displayOptions: {
			show: {
				resource: ['accessGrant'],
				operation: ['create'],
				grantScopeKind: ['products', 'passports'],
			},
		},
		routing: { send: { type: 'body', property: 'scope.ids', value: IDS_VALUE } },
	},
	{
		displayName: 'Additional Fields',
		name: 'grantCreateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['accessGrant'], operation: ['create'] } },
		options: [
			{
				displayName: 'Evidence Note',
				name: 'evidenceNote',
				type: 'string',
				default: '',
				description: 'A note on the evidence (max 500 characters)',
				routing: {
					send: { type: 'body', property: 'evidence.note', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Evidence Reference',
				name: 'evidenceReference',
				type: 'string',
				default: '',
				description:
					'Reference of the recorded basis for the grant (e.g. a contract number). Set the evidence type too.',
				routing: { send: { type: 'body', property: 'evidence.reference' } },
			},
			{
				displayName: 'Evidence Type',
				name: 'evidenceType',
				type: 'options',
				default: 'contract',
				description: 'The kind of recorded basis for the grant. Set the evidence reference too.',
				options: EVIDENCE_TYPE_OPTIONS,
				routing: { send: { type: 'body', property: 'evidence.type' } },
			},
			{
				displayName: 'Expires in Days',
				name: 'expiresInDays',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1825 },
				default: 365,
				description: 'Days until the grant expires. Left out, the default is 12 months.',
				routing: { send: { type: 'body', property: 'expiresInDays' } },
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'string',
				default: '',
				description: 'Why the data is shared (max 500 characters)',
				routing: {
					send: { type: 'body', property: 'purpose', value: '={{ $value || undefined }}' },
				},
			},
		],
	},

	// ---- Update ----------------------------------------------------
	{
		displayName: 'Update Fields',
		name: 'grantUpdateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'At least one field is needed',
		displayOptions: { show: { resource: ['accessGrant'], operation: ['update'] } },
		options: [
			{
				displayName: 'Evidence Note',
				name: 'evidenceNote',
				type: 'string',
				default: '',
				description: 'A note on the evidence (max 500 characters)',
				routing: {
					send: { type: 'body', property: 'evidence.note', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Evidence Reference',
				name: 'evidenceReference',
				type: 'string',
				default: '',
				description: 'Reference of the recorded basis for the grant. Set the evidence type too.',
				routing: { send: { type: 'body', property: 'evidence.reference' } },
			},
			{
				displayName: 'Evidence Type',
				name: 'evidenceType',
				type: 'options',
				default: 'contract',
				description: 'The kind of recorded basis for the grant. Set the evidence reference too.',
				options: EVIDENCE_TYPE_OPTIONS,
				routing: { send: { type: 'body', property: 'evidence.type' } },
			},
			{
				displayName: 'Expires in Days',
				name: 'expiresInDays',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1825 },
				default: 365,
				description: 'Days until the grant expires',
				routing: { send: { type: 'body', property: 'expiresInDays' } },
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				default: '',
				description: 'Who the grant is for (max 120 characters)',
				routing: { send: { type: 'body', property: 'label' } },
			},
			{
				displayName: 'Purpose',
				name: 'purpose',
				type: 'string',
				default: '',
				description: 'Why the data is shared (max 500 characters)',
				routing: { send: { type: 'body', property: 'purpose' } },
			},
			{
				displayName: 'Scope IDs',
				name: 'scopeIds',
				type: 'string',
				default: '',
				description:
					'Comma-separated product or passport IDs. Set the scope kind too; not needed for the whole company.',
				routing: { send: { type: 'body', property: 'scope.ids', value: IDS_VALUE } },
			},
			{
				displayName: 'Scope Kind',
				name: 'scopeKind',
				type: 'options',
				default: 'company',
				description: 'Which passports the grant covers',
				options: SCOPE_KIND_OPTIONS,
				routing: { send: { type: 'body', property: 'scope.kind' } },
			},
		],
	},

	// ---- Get Many / Get Activity -----------------------------------
	{
		displayName: 'Limit',
		name: 'grantLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 100 },
		default: 50,
		description: 'Max number of results per page',
		displayOptions: { show: { resource: ['accessGrant'], operation: ['getAll', 'getActivity'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Cursor',
		name: 'grantCursor',
		type: 'string',
		default: '',
		description:
			"Optional. The previous page's next cursor, to fetch the next page. Leave empty for the first page.",
		displayOptions: { show: { resource: ['accessGrant'], operation: ['getAll', 'getActivity'] } },
		routing: { send: { type: 'query', property: 'cursor', value: '={{ $value || undefined }}' } },
	},
	{
		displayName: 'Filters',
		name: 'grantFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['accessGrant'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Passport ID',
				name: 'passportId',
				type: 'string',
				default: '',
				description: 'Only grants that cover this passport',
				routing: { send: { type: 'query', property: 'passportId' } },
			},
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				description: 'Only grants that cover this product',
				routing: { send: { type: 'query', property: 'productId' } },
			},
			{
				displayName: 'Role',
				name: 'role',
				type: 'string',
				default: '',
				description: 'Only grants with this role, e.g. recycler',
				routing: { send: { type: 'query', property: 'role' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				description: 'Only grants in this state',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Expired', value: 'expired' },
					{ name: 'Revoked', value: 'revoked' },
				],
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
];
