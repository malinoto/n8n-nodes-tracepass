import type { INodeProperties } from 'n8n-workflow';

/**
 * Passport resource — operations + fields.
 *
 * Covers the Digital Product Passport lifecycle. Note the safety
 * notes in the operation descriptions: Create is billable (consumes
 * a plan DPP slot) and Archive is irreversible — the n8n user sees
 * these in the operation picker.
 */

export const passportOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: ['passport'] },
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a passport',
				description: 'Permanently archive a passport. The public QR will return 404.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/archive',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a passport',
				description: 'Create a new Digital Product Passport. Consumes a plan DPP slot.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/passports',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a passport',
				description: 'Retrieve a passport by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}',
					},
				},
			},
			{
				name: 'Get by Serial',
				value: 'getBySerial',
				action: 'Get a passport by serial',
				description: 'Retrieve a passport by its serial number',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many passports',
				description: 'List many passports',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/passports',
					},
				},
			},
			{
				name: 'Suspend',
				value: 'suspend',
				action: 'Suspend a passport',
				description: 'Suspend a published passport. Reversible. The QR shows a suspended state.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/suspend',
					},
				},
			},
			{
				name: 'Update Field',
				value: 'updateField',
				action: 'Update a passport field',
				description: 'Set the value of one field on a passport',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/fields/{{$parameter["fieldKey"]}}',
					},
				},
			},
		],
		default: 'getAll',
	},
];

export const passportFields: INodeProperties[] = [
	// ---- Passport ID -----------------------------------------------
	{
		displayName: 'Passport ID',
		name: 'passportId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 65a0f1b2c3d4e5f6a7b8c9d0',
		description: 'The TracePass ID of the passport',
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['get', 'updateField', 'suspend', 'archive'],
			},
		},
	},
	// ---- Serial number (get by serial) -----------------------------
	{
		displayName: 'Serial Number',
		name: 'serialNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. SN-2026-00042',
		description: 'The product unit serial number',
		displayOptions: {
			show: { resource: ['passport'], operation: ['getBySerial'] },
		},
	},
	// ---- Create fields ---------------------------------------------
	{
		displayName: 'Product ID',
		name: 'createProductId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 65a0f1b2c3d4e5f6a7b8c9d0',
		description: 'The product this passport belongs to',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'productId' },
		},
	},
	{
		displayName: 'GTIN',
		name: 'gtin',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 04012345678901',
		description: 'The 14-digit GS1 GTIN',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'gs1.gtin' },
		},
	},
	{
		displayName: 'Serial Number',
		name: 'createSerialNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. SN-2026-00042',
		description: 'A unique serial number for this product unit',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'gs1.serialNumber' },
		},
	},
	{
		displayName: 'Confirm Overage Charge',
		name: 'confirmOverage',
		type: 'boolean',
		default: false,
		description:
			'Whether to accept a per-passport overage charge if the account is over its plan DPP quota. Leave off to fail safely when over quota.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'confirmOverage' },
		},
	},
	// ---- Update Field ----------------------------------------------
	{
		displayName: 'Field Key',
		name: 'fieldKey',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. batteryCapacity',
		description: 'The template field key to update',
		displayOptions: {
			show: { resource: ['passport'], operation: ['updateField'] },
		},
	},
	{
		displayName: 'Value',
		name: 'fieldValue',
		type: 'string',
		default: '',
		placeholder: 'e.g. 5000',
		description: 'The new value for the field',
		displayOptions: {
			show: { resource: ['passport'], operation: ['updateField'] },
		},
		routing: {
			send: { type: 'body', property: 'value' },
		},
	},
	// ---- Get Many filters ------------------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { resource: ['passport'], operation: ['getAll'] },
		},
		options: [
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				description: 'Filter to one product\'s passports',
				routing: { send: { type: 'query', property: 'productId' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'published',
				options: [
					{ name: 'Approved', value: 'approved' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Expired', value: 'expired' },
					{ name: 'In Review', value: 'in_review' },
					{ name: 'Published', value: 'published' },
					{ name: 'Suspended', value: 'suspended' },
				],
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'query', property: 'limit' } },
			},
		],
	},
];
