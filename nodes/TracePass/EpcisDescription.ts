import type { INodeProperties } from 'n8n-workflow';

/**
 * EPCIS Event resource — operations + fields.
 *
 * GS1 EPCIS 2.0 supply-chain events. Export is included on Starter
 * plans and up; Capture and Query require the paid EPCIS add-on —
 * the TracePass API returns a clear 403 if the add-on is absent,
 * which n8n surfaces as the node's error output.
 */

export const epcisOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: { resource: ['epcis'] },
		},
		options: [
			{
				name: 'Capture',
				value: 'capture',
				action: 'Capture EPCIS events',
				description: 'Submit EPCIS 2.0 events to the capture interface. Requires the EPCIS add-on.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/epcis/capture',
					},
				},
			},
			{
				name: 'Export',
				value: 'export',
				action: 'Export EPCIS events for a passport',
				description:
					"Retrieve a passport's supply-chain events as an EPCIS 2.0 document. Included on Starter and up.",
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/epcis',
					},
				},
			},
			{
				name: 'Export by Serial',
				value: 'exportBySerial',
				action: 'Export EPCIS events for a passport by serial',
				description:
					"Retrieve a passport's EPCIS 2.0 events, addressed by its serial number. Included on Starter and up. If the serial is not unique in your account (serials are unique per GTIN) the API returns 409 — set the GTIN field to disambiguate.",
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/epcis',
					},
				},
			},
			{
				name: 'Get Capture Job',
				value: 'captureJob',
				action: 'Get an EPCIS capture job',
				description: 'Check the status of an async EPCIS capture job',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/epcis/capture/{{$parameter["jobId"]}}',
					},
				},
			},
			{
				name: 'Query',
				value: 'query',
				action: 'Query the EPCIS event store',
				description: 'Query captured EPCIS events. Requires the EPCIS add-on.',
				routing: {
					request: {
						method: 'GET',
						url: '/api/v1/epcis/events',
					},
				},
			},
		],
		default: 'export',
	},
];

export const epcisFields: INodeProperties[] = [
	// ---- Passport ID (export) --------------------------------------
	{
		displayName: 'Passport ID',
		name: 'passportId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 65a0f1b2c3d4e5f6a7b8c9d0',
		description: 'The TracePass ID of the passport whose events to export',
		displayOptions: {
			show: { resource: ['epcis'], operation: ['export'] },
		},
	},
	// ---- Serial + GTIN (export by serial) --------------------------
	{
		displayName: 'Serial Number',
		name: 'serialNumber',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. SN-2026-00042',
		description: 'The product unit serial number whose events to export',
		displayOptions: {
			show: { resource: ['epcis'], operation: ['exportBySerial'] },
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
			show: { resource: ['epcis'], operation: ['exportBySerial'] },
		},
		routing: {
			send: { type: 'query', property: 'gtin' },
		},
	},
	// ---- Capture job ID --------------------------------------------
	{
		displayName: 'Capture Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. cap_8f3d2a1b9c7e6d5f',
		description: 'The capture job ID returned by a Capture operation',
		displayOptions: {
			show: { resource: ['epcis'], operation: ['captureJob'] },
		},
	},
	// ---- Capture body ----------------------------------------------
	{
		displayName: 'Events (JSON)',
		name: 'events',
		type: 'json',
		required: true,
		default: '={}',
		description:
			'An EPCIS 2.0 EPCISDocument, a single event, or an array of events (JSON-LD). See the EPCIS docs at /docs/epcis.',
		displayOptions: {
			show: { resource: ['epcis'], operation: ['capture'] },
		},
		routing: {
			send: { type: 'body', property: 'epcisBody' },
		},
	},
	// ---- Query parameters ------------------------------------------
	// The standard EPCIS query grammar is large; these are the common
	// filters, each mapped directly to a query-string parameter. The
	// API forwards them verbatim to the EPCIS query node.
	{
		displayName: 'Query Filters',
		name: 'queryFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		description: 'Standard EPCIS 2.0 query parameters',
		displayOptions: {
			show: { resource: ['epcis'], operation: ['query'] },
		},
		options: [
			{
				displayName: 'Business Step (EQ_bizStep)',
				name: 'EQ_bizStep',
				type: 'string',
				default: '',
				description: 'Match events with this CBV business step',
				routing: { send: { type: 'query', property: 'EQ_bizStep' } },
			},
			{
				displayName: 'Disposition (EQ_disposition)',
				name: 'EQ_disposition',
				type: 'string',
				default: '',
				description: 'Match events with this CBV disposition',
				routing: { send: { type: 'query', property: 'EQ_disposition' } },
			},
			{
				displayName: 'EPC Matches (MATCH_epc)',
				name: 'MATCH_epc',
				type: 'string',
				default: '',
				description: 'Match events that reference this EPC',
				routing: { send: { type: 'query', property: 'MATCH_epc' } },
			},
			{
				displayName: 'Event Time From (GE_eventTime)',
				name: 'GE_eventTime',
				type: 'dateTime',
				default: '',
				description: 'Match events at or after this time',
				routing: { send: { type: 'query', property: 'GE_eventTime' } },
			},
			{
				displayName: 'Event Time To (LT_eventTime)',
				name: 'LT_eventTime',
				type: 'dateTime',
				default: '',
				description: 'Match events before this time',
				routing: { send: { type: 'query', property: 'LT_eventTime' } },
			},
		],
	},
];
