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
				name: 'Get',
				value: 'get',
				action: 'Get a product',
				description: 'Retrieve a single product by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/products/{{$parameter["productId"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many products',
				description: 'Retrieve a list of products',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/products',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Update an existing product',
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
	// ---- Product ID (get / update) ----------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		type: 'string',
		required: true,
		default: '',
		description: 'The TracePass ID of the product',
		displayOptions: {
			show: { resource: ['product'], operation: ['get', 'update'] },
		},
	},
	// ---- Create fields ---------------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
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
			{ name: 'Chemicals', value: 'chemicals' },
			{ name: 'Construction', value: 'construction' },
			{ name: 'Electronics', value: 'electronics' },
			{ name: 'FMCG', value: 'fmcg' },
			{ name: 'Furniture', value: 'furniture' },
			{ name: 'Jewelry', value: 'jewelry' },
			{ name: 'Packaging', value: 'packaging' },
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
