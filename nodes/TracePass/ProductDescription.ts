import type { INodeProperties } from 'n8n-workflow';

/**
 * Product resource — operations + fields.
 *
 * Each operation's `routing.request` maps it to a TracePass v1
 * endpoint; each field's `routing.send` places its value into the
 * query string or JSON body. n8n's HTTP layer executes the call.
 */

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: ['product'] },
		},
		options: [
			{
				name: 'Archive',
				value: 'archive',
				action: 'Archive a product',
				description:
					'Soft-archive a product. Reversible, and NOT deletion. Blocked with 409 while any non-archived passport still references the product \u2014 archive those passports first.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/products/{{$parameter["productId"]}}/archive',
					},
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a product',
				description: 'Create a new product in the catalogue',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/products',
					},
				},
			},
			{
				name: 'Create Batch',
				value: 'createBatch',
				action: 'Create many products in one call',
				description:
					'Create up to 100 products in one call. Partial success per item, so some can be created while others error. The whole batch consumes N writes upfront \u2014 if that would exceed your daily cap NOTHING is created (429). Products are not billable on their own.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/products/batch',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a product',
				description: 'Retrieve a product by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/products/{{$parameter["productId"]}}',
					},
				},
			},
			{
				name: 'Get Links',
				value: 'getLinks',
				action: 'Get the passport links of a product',
				description:
					"Every published passport of the product with its serial, passport URL and status, plus the product's model page URL. The answer to a dealer or web shop asking for the links to a product's passports. Format JSON is paged; CSV and ZIP arrive as a binary file. JSON also carries a QR API URL that needs your API credentials. Counts as one passport read against the daily cap.",
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/products/{{$parameter["productId"]}}/links',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many products',
				description: 'List many products',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/products',
					},
				},
			},
			{
				name: 'Get Model QR',
				value: 'getModelQr',
				action: 'Get the QR code of the model page of a product',
				description:
					"Render the QR code of the product's public model page (the GS1 address without a serial). The model page shows only what is true of every unit. Arrives as a binary file. Counts as one passport read against the daily cap.",
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/products/{{$parameter["productId"]}}/links/model-qr',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Update one or more product fields',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/products/{{$parameter["productId"]}}',
					},
				},
			},
		],
		default: 'getAll',
	},
];

export const productFields: INodeProperties[] = [
	// ---- Create Batch ----------------------------------------------
	{
		displayName: 'Products (JSON)',
		name: 'batchProducts',
		type: 'json',
		required: true,
		default: '=[\n  { "name": "", "model": "", "category": "battery" }\n]',
		description:
			'An array of up to 100 products to create. Each item needs name + model + category. Wire this from an upstream node (e.g. a Spreadsheet or HTTP node) by mapping its rows into this shape.',
		displayOptions: {
			show: { resource: ['product'], operation: ['createBatch'] },
		},
		routing: {
			send: { type: 'body', property: 'products' },
		},
	},

	// ---- Product ID (get / update) ----------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 65a0f1b2c3d4e5f6a7b8c9d0',
		description: 'The TracePass ID of the product',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['archive', 'get', 'getLinks', 'getModelQr', 'update'],
			},
		},
	},
	// ---- Get Links -------------------------------------------------
	{
		displayName: 'Format',
		name: 'linksFormat',
		type: 'options',
		default: 'json',
		description: 'The output format. CSV and ZIP are returned as a binary file.',
		options: [
			{
				name: 'CSV',
				value: 'csv',
				description: 'Every published passport as serial, passport_url, status',
				routing: {
					request: { encoding: 'arraybuffer', json: false },
					output: {
						postReceive: [{ type: 'binaryData', properties: { destinationProperty: 'data' } }],
					},
				},
			},
			{ name: 'JSON', value: 'json', description: 'Paged JSON with the model page URL' },
			{
				name: 'ZIP',
				value: 'zip',
				description:
					'A passports.csv, a short message to forward and the model page QR (refused above 50,000 published passports; use CSV)',
				routing: {
					request: { encoding: 'arraybuffer', json: false },
					output: {
						postReceive: [{ type: 'binaryData', properties: { destinationProperty: 'data' } }],
					},
				},
			},
		],
		displayOptions: {
			show: { resource: ['product'], operation: ['getLinks'] },
		},
		routing: {
			send: { type: 'query', property: 'format' },
		},
	},
	{
		displayName: 'Limit',
		name: 'linksLimit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 5000 },
		default: 1000,
		description: 'Max number of passports per page',
		displayOptions: {
			show: { resource: ['product'], operation: ['getLinks'], linksFormat: ['json'] },
		},
		routing: {
			send: { type: 'query', property: 'limit' },
		},
	},
	{
		displayName: 'Cursor',
		name: 'linksCursor',
		type: 'string',
		default: '',
		description:
			"Optional. The previous page's nextCursor, to fetch the next page. Leave empty for the first page.",
		displayOptions: {
			show: { resource: ['product'], operation: ['getLinks'], linksFormat: ['json'] },
		},
		routing: {
			send: { type: 'query', property: 'cursor', value: '={{ $value || undefined }}' },
		},
	},

	// ---- Get Model QR ----------------------------------------------
	{
		displayName: 'Format',
		name: 'modelQrFormat',
		type: 'options',
		default: 'svg',
		description: 'The QR output format. Returned as a binary file.',
		options: [
			{
				name: 'PNG',
				value: 'png',
				routing: {
					request: { encoding: 'arraybuffer', json: false },
					output: {
						postReceive: [{ type: 'binaryData', properties: { destinationProperty: 'data' } }],
					},
				},
			},
			{
				name: 'SVG',
				value: 'svg',
				routing: {
					request: { encoding: 'arraybuffer', json: false },
					output: {
						postReceive: [{ type: 'binaryData', properties: { destinationProperty: 'data' } }],
					},
				},
			},
		],
		displayOptions: {
			show: { resource: ['product'], operation: ['getModelQr'] },
		},
		routing: {
			send: { type: 'query', property: 'format' },
		},
	},
	{
		displayName: 'GTIN',
		name: 'modelQrGtin',
		type: 'string',
		default: '',
		placeholder: 'e.g. 09506000134369',
		description:
			"Optional, 14 digits. Needed only when the product's published passports carry more than one GTIN (400 gtin_required otherwise).",
		displayOptions: {
			show: { resource: ['product'], operation: ['getModelQr'] },
		},
		routing: {
			send: { type: 'query', property: 'gtin', value: '={{ $value || undefined }}' },
		},
	},

	// ---- Create fields ---------------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Acme Cordless Drill',
		description: 'Name of the product',
		displayOptions: {
			show: { resource: ['product'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'name' },
		},
	},
	{
		displayName: 'Model',
		name: 'model',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. ACD-2024-PRO',
		description: 'Model or SKU identifier of the product',
		displayOptions: {
			show: { resource: ['product'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'model' },
		},
	},
	{
		displayName: 'Category',
		name: 'category',
		type: 'options',
		required: true,
		default: 'battery',
		description: 'Product category — determines the DPP template',
		options: [
			{ name: 'Battery', value: 'battery' },
			{ name: 'Construction', value: 'construction' },
			{ name: 'Detergents', value: 'detergents' },
			{ name: 'Electronics', value: 'electronics' },
			{ name: 'FMCG', value: 'fmcg' },
			{ name: 'Furniture', value: 'furniture' },
			{ name: 'Jewelry', value: 'jewelry' },
			{ name: 'Packaging', value: 'packaging' },
			{ name: 'Paints and Coatings', value: 'paints-coatings' },
			{ name: 'Steel', value: 'steel' },
			{ name: 'Textile', value: 'textile' },
			{ name: 'Toys', value: 'toys' },
			{ name: 'Tyres', value: 'tyres' },
		],
		displayOptions: {
			show: { resource: ['product'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'category' },
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		placeholder: 'e.g. 18V brushless cordless drill with two-speed transmission',
		description: 'Optional description of the product',
		displayOptions: {
			show: { resource: ['product'], operation: ['create'] },
		},
		routing: {
			send: { type: 'body', property: 'description' },
		},
	},
	// ---- Update fields ---------------------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['product'], operation: ['update'] },
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'name' } },
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'model' } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
		],
	},
	// ---- Get Many filters ------------------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { resource: ['product'], operation: ['getAll'] },
		},
		options: [
			{
				displayName: 'Category',
				name: 'category',
				type: 'string',
				default: '',
				description: 'Filter by category key',
				routing: { send: { type: 'query', property: 'category' } },
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search over product name and model',
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
