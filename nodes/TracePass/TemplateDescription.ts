import type { INodeProperties } from 'n8n-workflow';

/**
 * Template resource — operations + fields.
 *
 * DPP category templates are the regulatory field schemas (battery,
 * textile, electronics, …): they describe WHAT a compliant passport in
 * a category must contain — field count, required-field count, the
 * governing regulation, and (for a single category) every field with
 * its key, label, type, required flag and access level.
 *
 * `required` is the category-agnostic default. Where a field's
 * applicability varies by product category the response also carries
 * `requiredBy` (e.g. battery, keyed by `batteryCategory`:
 * `{ EV: "required", LMT: "notApplicable", … }`) plus a top-level
 * `requiredFieldCountByCategory`. Resolve effective required-ness as:
 *
 *   1. For a battery, check SCOPE first. Only `EV`, `LMT` and
 *      `industrial_gt_2kwh` owe a battery passport (Art. 77(1) of
 *      Reg (EU) 2023/1542). For `portable`, `SLI` or
 *      `industrial_lte_2kwh` NOTHING is required — those batteries
 *      have no passport obligation at all.
 *   2. Otherwise `requiredBy[category]` when present,
 *   3. falling back to `required`.
 *
 * Skipping step 1 is not a rounding error: `requiredBy` is keyed only by
 * the three in-scope categories, so an out-of-scope battery falls through
 * to `required` and the workflow demands the full mandatory field set for
 * a product the Regulation exempts. A workflow that reads `required`
 * alone will likewise over-require fields for some battery types and
 * under-require them for others. Reference data: read-only, global (not
 * company-scoped), API-key auth. Use it to discover requirements BEFORE
 * creating products/passports.
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
					'Get the full regulatory field schema for one DPP category — every field with its key, label, type, required flag (plus a per-category requiredBy map where applicability varies, as it does for battery), access level and (where known) the governing regulation article/annex',
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
