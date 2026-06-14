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
				name: 'Archive by Serial',
				value: 'archiveBySerial',
				action: 'Archive a passport by serial',
				description:
					'Permanently archive a passport addressed by its serial number. The public QR will return 404. If the serial is not unique in your account (serials are unique per GTIN) the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/archive',
					},
				},
			},
			{
				name: 'Compliance',
				value: 'compliance',
				action: 'Check passport compliance',
				description:
					'Get a three-tier compliance verdict (compliant / compliant_with_warnings / incomplete) with regulation-cited findings — missing required fields/parties, format issues, and per-category conditional rules',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/compliance',
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
				name: 'Create Batch',
				value: 'createBatch',
				action: 'Create many passports in one call',
				description:
					'Create up to 100 passport SHELLS in one call (productId + GTIN + serial each). Field values are NOT set here — populate them afterwards with Update Field or AI extraction. Partial success per item; consumes one plan DPP slot per passport.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/passports/batch',
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
				name: 'Suspend by Serial',
				value: 'suspendBySerial',
				action: 'Suspend a passport by serial',
				description:
					'Suspend a published passport addressed by its serial number. Reversible. If the serial is not unique in your account the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/suspend',
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
			{
				name: 'Update Field by Serial',
				value: 'updateFieldBySerial',
				action: 'Update a passport field by serial',
				description:
					'Set the value of one field on a passport addressed by its serial number. If the serial is not unique in your account the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/fields/{{$parameter["fieldKey"]}}',
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
				operation: ['get', 'compliance', 'updateField', 'suspend', 'archive'],
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
			show: { resource: ['passport'], operation: ['getBySerial', 'archiveBySerial', 'suspendBySerial', 'updateFieldBySerial'] },
		},
	},
	{
		displayName: 'GTIN (Disambiguator)',
		name: 'serialGtin',
		type: 'string',
		default: '',
		placeholder: 'e.g. 04012345678901',
		description:
			'Optional. A serial is unique only within a GTIN, so if the same serial exists under two GTINs in your account a serial-only call returns 409. Set the GTIN here to resolve the passport exactly.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['getBySerial', 'archiveBySerial', 'suspendBySerial', 'updateFieldBySerial'] },
		},
		routing: {
			send: { type: 'query', property: 'gtin' },
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
	// ---- Create Batch ----------------------------------------------
	{
		displayName: 'Passports (JSON)',
		name: 'batchPassports',
		type: 'json',
		required: true,
		default: '=[\n  { "productId": "", "gs1": { "gtin": "", "serialNumber": "" } }\n]',
		description:
			'An array of up to 100 passports to create. Each item needs productId + gs1.gtin + gs1.serialNumber. Wire this from an upstream node (e.g. a Spreadsheet/HTTP node) by mapping its rows into this shape. Field values are not accepted here — create the shells, then set fields with Update Field.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['createBatch'] },
		},
		routing: {
			send: { type: 'body', property: 'passports' },
		},
	},
	{
		displayName: 'Confirm Overage Charge',
		name: 'batchConfirmOverage',
		type: 'boolean',
		default: false,
		description:
			'Whether to accept per-passport overage charges if the batch pushes the account over its plan DPP quota. Leave off to fail safely (402) when the whole batch would exceed quota.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['createBatch'] },
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
			show: { resource: ['passport'], operation: ['updateField', 'updateFieldBySerial'] },
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
			show: { resource: ['passport'], operation: ['updateField', 'updateFieldBySerial'] },
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
