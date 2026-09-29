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
				description:
					'Create a new Digital Product Passport. Consumes a plan DPP slot. Supports GS1 (GTIN + serial, default) and EN 18219 identifier schemes (ISO 15459, IEC 61406, DID, DOI). Battery passports accept only GS1 or ISO 15459 (Battery Regulation Art. 77(3)).',
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
					'Create up to 100 passport SHELLS in one call. Each item needs productId and an identifier — use gs1.gtin + gs1.serialNumber for GS1, or identifier.{scheme,...} for EN 18219 schemes (iso15459, iec61406, did, doi). Battery passports accept only gs1 or iso15459 (Art. 77(3)). Field values are not accepted here — set them with Update Field. Partial success per item; consumes one plan DPP slot per passport.',
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
				name: 'Get Condition Flags',
				value: 'getConditionFlags',
				action: 'Get condition flags for a passport',
				description:
					'Read the condition-classification flags for a passport — approved yes/no facts (e.g. battery: hasBMS, rechargeable, externalStorageOnly, isStationaryBess) that gate conditional legal duties. An approved flag whose gate applies makes associated fields required.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/condition-flags',
					},
				},
			},
			{
				name: 'Get Condition Flags by Serial',
				value: 'getConditionFlagsBySerial',
				action: 'Get condition flags for a passport by serial',
				description:
					'Read the condition-classification flags for a passport addressed by its serial number. If the serial is not unique in your account the API returns 409 — set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/condition-flags',
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
				name: 'Get QR',
				value: 'getQr',
				action: 'Get a passport QR code',
				description: 'Render the passport QR code. Returns SVG by default; set Format to png or JSON. Optionally apply the company brand colour or an explicit colour. Counts as one passport read against the daily cap.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/qr',
					},
				},
			},
			{
				name: 'Get QR by Serial',
				value: 'getQrBySerial',
				action: 'Get a passport QR code by serial',
				description: 'Render the passport QR code addressed by its serial number. Returns SVG by default; set Format to png or JSON. If the serial is not unique in your account the API returns 409 — set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/qr',
					},
				},
			},
			{
				name: 'Get Snapshot',
				value: 'getSnapshot',
				action: 'Get a passport snapshot',
				description:
					'Return the full archival record of one immutability snapshot — the complete JSON-LD the passport asserted at that time, plus contentHash and hashValid (re-verified on read). Counts as one passport read against the daily cap.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/snapshots/{{$parameter["snapshotId"]}}',
					},
				},
			},
			{
				name: 'Get Snapshots',
				value: 'getSnapshots',
				action: 'Get passport snapshots',
				description: 'Return a paginated list of immutability snapshots for a passport, newest first. Each entry carries ID, version, reason (published|republished|manual), snapshotAt, contentHash, hashValid (re-verified on read), restorable flag, and field count. Passports published before the snapshot feature existed return an empty list. Counts as one passport read against the daily cap.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/snapshots',
					},
				},
			},
			{
				name: 'Registry Readiness',
				value: 'registryReadiness',
				action: 'Check passport registry readiness',
				description: 'Check whether a passport would pass the EU DPP Registry\'s formal submission gate — returns { ready, findings[] } covering mandatory-field presence, correct formatting, a resolvable public link, item-level granularity (a serial number), and a well-formed commodity code where the category carries one. This is the registry\'s mechanical pre-submission check, not the substantive compliance verdict. Battery passports only.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/registry-readiness',
					},
				},
			},
			{
				name: 'Set Condition Flags',
				value: 'setConditionFlags',
				action: 'Set condition flags for a passport',
				description:
					'Set or clear condition-classification flags for a passport. Each flag is a boolean (true/false) or null to clear. WARNING: approving a flag may make additional fields required — an empty required field will block publishing with a conditional_missing error.',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/condition-flags',
					},
				},
			},
			{
				name: 'Set Condition Flags by Serial',
				value: 'setConditionFlagsBySerial',
				action: 'Set condition flags for a passport by serial',
				description:
					'Set or clear condition-classification flags for a passport addressed by its serial number. Each flag is a boolean (true/false) or null to clear. If the serial is not unique in your account the API returns 409 — set the GTIN field to disambiguate. WARNING: approving a flag may make additional fields required.',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/condition-flags',
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
				operation: ['get', 'compliance', 'registryReadiness', 'getConditionFlags', 'setConditionFlags', 'updateField', 'suspend', 'archive', 'getQr', 'getSnapshot', 'getSnapshots'],
			},
		},
	},
	// ---- Snapshot ID (getSnapshot) ---------------------------------
	{
		displayName: 'Snapshot ID',
		name: 'snapshotId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 65a0f1b2c3d4e5f6a7b8c9d1',
		description: 'The ID of the specific snapshot to retrieve',
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['getSnapshot'],
			},
		},
	},
	// ---- Snapshot pagination (getSnapshots) -------------------------
	{
		displayName: 'Page',
		name: 'snapshotPage',
		type: 'number',
		default: 1,
		description: 'Page number (1-based)',
		displayOptions: {
			show: { resource: ['passport'], operation: ['getSnapshots'] },
		},
		routing: {
			send: { type: 'query', property: 'page' },
		},
	},
	{
		displayName: 'Page Size',
		name: 'snapshotLimit',
		type: 'number',
		default: 20,
		typeOptions: { minValue: 1, maxValue: 100 },
		description: 'Number of snapshots per page (max 100)',
		displayOptions: {
			show: { resource: ['passport'], operation: ['getSnapshots'] },
		},
		routing: {
			send: { type: 'query', property: 'limit' },
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
			show: { resource: ['passport'], operation: ['getBySerial', 'getConditionFlagsBySerial', 'setConditionFlagsBySerial', 'archiveBySerial', 'suspendBySerial', 'updateFieldBySerial', 'getQrBySerial'] },
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
			show: { resource: ['passport'], operation: ['getBySerial', 'getConditionFlagsBySerial', 'setConditionFlagsBySerial', 'archiveBySerial', 'suspendBySerial', 'updateFieldBySerial', 'getQrBySerial'] },
		},
		routing: {
			send: { type: 'query', property: 'gtin' },
		},
	},
	// ---- QR rendering options --------------------------------------
	{
		displayName: 'Format',
		name: 'qrFormat',
		type: 'options',
		default: 'svg',
		description: 'The QR output format',
		options: [
			{ name: 'JSON', value: 'json' },
			{ name: 'PNG', value: 'png' },
			{ name: 'SVG', value: 'svg' },
		],
		displayOptions: {
			show: { resource: ['passport'], operation: ['getQr', 'getQrBySerial'] },
		},
		routing: {
			send: { type: 'query', property: 'format' },
		},
	},
	{
		displayName: 'QR Options',
		name: 'qrOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['passport'], operation: ['getQr', 'getQrBySerial'] },
		},
		options: [
			{
				displayName: 'Use Company Branding',
				name: 'useCompanyBranding',
				type: 'boolean',
				default: false,
				description: 'Whether to render the QR in the company brand colour instead of black',
				routing: { send: { type: 'query', property: 'useCompanyBranding' } },
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
				placeholder: 'e.g. FF6600',
				description: 'Foreground colour as a 6-char hex without "#". Overrides company branding.',
				routing: { send: { type: 'query', property: 'color' } },
			},
			{
				displayName: 'Background Color',
				name: 'backgroundColor',
				type: 'color',
				default: '',
				placeholder: 'e.g. FFFFFF',
				description: 'Solid backing colour as a 6- or 8-char hex without "#" (8 chars = RGBA)',
				routing: { send: { type: 'query', property: 'backgroundColor' } },
			},
		],
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
	// Identifier scheme selector — controls which sub-fields are shown.
	// Each non-GS1 option sends identifier.scheme via option-level routing;
	// GS1 uses the legacy gs1.gtin + gs1.serialNumber path (backward compatible).
	{
		displayName: 'Identifier Scheme',
		name: 'identifierScheme',
		type: 'options',
		noDataExpression: true,
		default: 'gs1',
		description:
			'EN 18219 product identifier scheme. Battery passports accept only GS1 or ISO 15459 (Battery Regulation Art. 77(3)).',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'] },
		},
		options: [
			{
				name: 'DID (W3C Decentralised Identifier)',
				value: 'did',
				routing: {
					send: { type: 'body', property: 'identifier.scheme', value: 'did' },
				},
			},
			{
				name: 'DOI (ISO 26324)',
				value: 'doi',
				routing: {
					send: { type: 'body', property: 'identifier.scheme', value: 'doi' },
				},
			},
			{
				name: 'GS1 (GTIN + Serial)',
				value: 'gs1',
				// GS1 uses the legacy gs1.gtin / gs1.serialNumber fields below;
				// no identifier.scheme is sent on this path.
			},
			{
				name: 'IEC 61406 (Identification Link)',
				value: 'iec61406',
				routing: {
					send: { type: 'body', property: 'identifier.scheme', value: 'iec61406' },
				},
			},
			{
				name: 'ISO 15459',
				value: 'iso15459',
				routing: {
					send: { type: 'body', property: 'identifier.scheme', value: 'iso15459' },
				},
			},
		],
	},
	// ---- GS1 sub-fields (default, backward compatible) ----------------
	{
		displayName: 'GTIN',
		name: 'gtin',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 04012345678901',
		description: 'The GS1 GTIN: 14 digits, or a 13-digit EAN (padded to 14 with a leading 0). Stored and returned as GTIN-14.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['gs1'] },
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
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['gs1'] },
		},
		routing: {
			send: { type: 'body', property: 'gs1.serialNumber' },
		},
	},
	// ---- ISO 15459 sub-fields ------------------------------------------
	{
		displayName: 'Issuing Agency Code',
		name: 'iso15459Iac',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. MFR',
		description: 'ISO/IEC 15459 issuing agency code (1–3 characters, assigned by ISO/IEC 15459-2)',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['iso15459'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.issuingAgencyCode' },
		},
	},
	{
		displayName: 'Primary ID',
		name: 'iso15459PrimaryId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1234567890',
		description: 'The primary identifier assigned by the issuing agency',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['iso15459'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.primaryId' },
		},
	},
	{
		displayName: 'Serial (Optional)',
		name: 'iso15459Serial',
		type: 'string',
		default: '',
		placeholder: 'e.g. SN-001',
		description: 'Optional serial component appended after the primary ID',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['iso15459'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.serial' },
		},
	},
	// ---- IEC 61406 sub-fields ------------------------------------------
	{
		displayName: 'Identification Link URI',
		name: 'iec61406Uri',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://product.example.com/item/42',
		description: 'IEC 61406 Identification Link — must be an https URI. Not valid for battery passports.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['iec61406'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.uri' },
		},
	},
	// ---- DID sub-fields ------------------------------------------------
	{
		displayName: 'DID',
		name: 'didValue',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. did:example:123abc',
		description: 'W3C Decentralised Identifier string. Not valid for battery passports.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['did'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.did' },
		},
	},
	{
		displayName: 'DID Method',
		name: 'didMethod',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. example',
		description: 'The DID method (the part after "did:" and before the second colon)',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['did'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.method' },
		},
	},
	// ---- DOI sub-fields ------------------------------------------------
	{
		displayName: 'DOI',
		name: 'doiValue',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 10.1234/example.product',
		description: 'ISO 26324 Digital Object Identifier in bare form: 10.{registrant}/{suffix} (omit the https://doi.org/ prefix). Not valid for battery passports.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['doi'] },
		},
		routing: {
			send: { type: 'body', property: 'identifier.doi' },
		},
	},
	// ---- DOI granularity (EN 18219 §5.6.2(b)) --------------------------
	// A DOI product identifier must declare whether it identifies the product
	// model, a production batch, or an individual item.
	{
		displayName: 'DOI Granularity',
		name: 'doiGranularity',
		type: 'options',
		required: true,
		default: 'model',
		description: 'Whether the DOI identifies the product model, a production batch, or an individual item (EN 18219 §5.6.2(b)). Required for DOI identifiers.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'], identifierScheme: ['doi'] },
		},
		options: [
			{ name: 'Batch', value: 'batch' },
			{ name: 'Item', value: 'item' },
			{ name: 'Model', value: 'model' },
		],
		routing: {
			send: { type: 'body', property: 'identifier.granularity' },
		},
	},
	// ---- Overage (applies to all create schemes) -----------------------
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
			'An array of up to 100 passports to create. Each item needs productId and an identifier. GS1 (default): { "productId": "...", "gs1": { "gtin": "...", "serialNumber": "..." } }. EN 18219 schemes: { "productId": "...", "identifier": { "scheme": "iso15459|iec61406|did|doi", ...scheme-specific fields } }. Battery passports accept only gs1 or iso15459 identifiers. Field values are not accepted here — create the shells, then set fields with Update Field.',
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
	// ---- Condition flags body (setConditionFlags / setConditionFlagsBySerial) ------
	{
		displayName: 'Flags (JSON)',
		name: 'conditionFlagsBody',
		type: 'json',
		required: true,
		default: '={ "hasBMS": true }',
		description:
			'A JSON object mapping flag keys to true, false, or null. true = flag is set; false = flag is explicitly cleared; null = remove the flag entry. Example: { "hasBMS": true, "rechargeable": false, "externalStorageOnly": null }. Flag keys are category-specific — see the passport category template for valid keys.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['setConditionFlags', 'setConditionFlagsBySerial'] },
		},
		routing: {
			// No `property` → n8n spread-merges the parsed JSON into the root request body,
			// which is the correct shape for PATCH /condition-flags (Record<flagKey, boolean|null>).
			send: { type: 'body' },
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
