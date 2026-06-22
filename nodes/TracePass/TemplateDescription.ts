import type { INodeProperties } from 'n8n-workflow';

/**
 * Template resource — operations + fields.
 *
 * DPP category templates are the regulatory field schemas (battery,
 * textile, electronics, …): they describe WHAT a compliant passport in
 * a category must contain — field count, required-field count, the
 * governing regulation, and (for a single category) every field with
 * its key, label, type, required flag and access level. Reference data:
 * read-only, global (not company-scoped), API-key auth. Use it to
 * discover requirements BEFORE creating products/passports.
 */

export const templateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: ['template'] },
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a category template',
				description:
					'Get the full regulatory field schema for one DPP category — every field with its key, label, type, required flag, access level and (where known) the governing regulation article/annex',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/templates/{{$parameter["category"]}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many category templates',
				description:
					'List the available DPP category templates with their field count, required-field count, governing regulation and version',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/templates',
					},
				},
			},
		],
		default: 'getAll',
	},
];

export const templateFields: INodeProperties[] = [
	{
		displayName: 'Category',
		name: 'category',
		type: 'options',
		required: true,
		default: 'battery',
		description: 'The DPP product category to fetch the schema for',
		displayOptions: {
			show: { resource: ['template'], operation: ['get'] },
		},
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
	},
];
