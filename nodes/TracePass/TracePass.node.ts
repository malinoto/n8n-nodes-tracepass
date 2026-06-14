import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { productOperations, productFields } from './ProductDescription';
import { passportOperations, passportFields } from './PassportDescription';
import { epcisOperations, epcisFields } from './EpcisDescription';

/**
 * TracePass — n8n community node.
 *
 * A declarative-style node (no hand-written execute()): every
 * operation maps to a TracePass v1 REST call via the `routing`
 * config on its properties. This keeps the node dependency-free
 * (n8n's own HTTP layer makes the calls) — a requirement for n8n's
 * community-node verification.
 *
 * Three resources, mirroring the v1 API:
 *   - Product   — the catalogue layer
 *   - Passport  — Digital Product Passports + their lifecycle
 *   - EPCIS     — GS1 EPCIS 2.0 supply-chain events
 */
export class TracePass implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TracePass',
		name: 'tracePass',
		icon: { light: 'file:../../icons/tracepass.svg', dark: 'file:../../icons/tracepass.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Automate EU Digital Product Passport workflows with TracePass',
		// Search synonyms — `alias` lives on the sibling .node.json codex
		// file (the CodexData type), NOT on INodeTypeDescription. The
		// node picker indexes those entries alongside displayName +
		// description so "dpp", "epcis", "battery passport" all surface
		// TracePass. See TracePass.node.json.
		defaults: {
			name: 'TracePass',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'tracePassApi',
				required: true,
				// Shown when the Authentication selector is "Access Token"
				// (the default). Either this OR the OAuth2 credential is used.
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'tracePassOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				// Identifies this client to the TracePass request log so v1
				// traffic can be attributed to the n8n node vs the MCP server
				// vs raw API integrations.
				'X-Source': 'n8n',
			},
		},
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
						description: 'A tp_ API key — simplest, for server-to-server use',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
						description: "Authorize on a user's behalf with scoped, revocable access",
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'EPCIS Event',
						value: 'epcis',
						description: 'GS1 EPCIS 2.0 supply-chain events',
					},
					{
						name: 'Passport',
						value: 'passport',
						description: 'Create, read, and run lifecycle actions on Digital Product Passports',
					},
					{
						name: 'Product',
						value: 'product',
						description: 'The catalogue layer — one product can have many passports',
					},
				],
				default: 'passport',
			},
			...productOperations,
			...productFields,
			...passportOperations,
			...passportFields,
			...epcisOperations,
			...epcisFields,
		],
		usableAsTool: true,
	};
}
