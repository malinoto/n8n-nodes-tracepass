import type { INodeProperties } from 'n8n-workflow';

/**
 * Passport resource — operations + fields.
 *
 * Covers the Digital Product Passport lifecycle. Note the safety
 * notes in the operation descriptions: Create makes an unbilled draft
 * (a plan DPP slot is taken only at publish, in the TracePass
 * dashboard) and Archive is irreversible — the n8n user sees these in
 * the operation picker.
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
				description:
					'Permanently archive a passport. The public QR will return 404. Battery passports need a Reason.',
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
					'Permanently archive a passport addressed by its serial number. The public QR will return 404. Battery passports need a Reason. If the serial is not unique in your account (serials are unique per GTIN) the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/archive',
					},
				},
			},
			{
				name: 'Capture Measurements',
				value: 'captureMeasurements',
				action: 'Capture battery measurements for a passport',
				description:
					"Push over-life measurements from your own equipment into a published battery passport (e.g. state of health, cycle counts; Battery Regulation Annex XIII point 4). The newest per field becomes the current value. Metered against the plan's monthly measurement allowance; paid plans keep counting past it at no charge.",
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/measurements',
					},
				},
			},
			{
				name: 'Capture Measurements by Serial',
				value: 'captureMeasurementsBySerial',
				action: 'Capture battery measurements for a passport by serial',
				description:
					'Same as Capture Measurements, addressed by the passport serial number. Set the GTIN field if the serial is not unique in your account.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/measurements',
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
					'Create a new Digital Product Passport as a draft. A draft takes no plan DPP slot and is not billed; the slot, and any overage past the plan cap, is taken when it is published in the TracePass dashboard. Supports GS1 (GTIN + serial, default) and EN 18219 identifier schemes (ISO 15459, IEC 61406, DID, DOI). Battery passports accept only GS1 or ISO 15459 (Battery Regulation Art. 77(3)).',
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
					'Create up to 100 passport SHELLS in one call. Each item needs productId and an identifier — use gs1.gtin + gs1.serialNumber for GS1, or identifier.{scheme,...} for EN 18219 schemes (iso15459, iec61406, did, doi). Battery passports accept only gs1 or iso15459 (Art. 77(3)). Field values are not accepted here — set them with Update Field. Partial success per item. The passports are drafts, so they take no plan DPP slot until they are published in the TracePass dashboard.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/passports/batch',
					},
				},
			},
			{
				name: 'Create Registry Upload File',
				value: 'createRegistryUploadFile',
				action: 'Create a registry upload file',
				description:
					'Build the EU DPP Registry upload file for up to 100 battery passports. The economic operator uploads it on the Registry website under its own EU Login; TracePass prepares the file and records the preparation, and never submits. Only passports that would pass go in (published batteries, not registered in production, no blocking readiness finding), because the Registry rejects the whole file over one bad entry; every other passport comes back in excluded with its reason. Returns { xml, filename, included, excluded }: save xml under filename. Paid plans only.',
				routing: {
					request: {
						method: 'POST',
						url: '/api/v1/registry/upload-file',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a passport',
				description:
					'On a passport marked for deletion, the second step of the deletion: a soft delete that erases nothing. The passport leaves the API and every public surface; its QR shows that the passport has ended, and its machine-readable formats answer 410 Gone. On a draft or in-review passport that was never published, a permanent delete of the passport and everything only it uses. Any other status answers 409: mark a published passport for deletion first. Paid plans only. One v1 write.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}',
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
				name: 'Get Latest Measurements',
				value: 'getLatestMeasurements',
				action: 'Get the latest battery measurements for a passport',
				description:
					'Read the newest measurement for each accepted battery measurement field (null where none has been received yet)',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/measurements/latest',
					},
				},
			},
			{
				name: 'Get Latest Measurements by Serial',
				value: 'getLatestMeasurementsBySerial',
				action: 'Get the latest battery measurements for a passport by serial',
				description:
					'Read the newest measurement for each accepted battery measurement field of a passport addressed by its serial number (null where none has been received yet). If the serial is not unique in your account the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/measurements/latest',
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
				name: 'Get Measurements',
				value: 'getMeasurements',
				action: 'Get battery measurement history for a passport',
				description:
					'Read the measurement history of a battery passport, newest first, optionally filtered by field and time window',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/measurements',
					},
				},
			},
			{
				name: 'Get Measurements by Serial',
				value: 'getMeasurementsBySerial',
				action: 'Get battery measurement history for a passport by serial',
				description:
					'Read the measurement history of a battery passport addressed by its serial number, newest first, optionally filtered by field and time window. If the serial is not unique in your account the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/measurements',
					},
				},
			},
			{
				name: 'Get QR',
				value: 'getQr',
				action: 'Get a passport QR code',
				description:
					'Render the passport QR code. Returns SVG by default; set Format to png or JSON. Optionally apply the company brand colour or an explicit colour. Counts as one passport read against the daily cap.',
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
				description:
					'Render the passport QR code addressed by its serial number. Returns SVG by default; set Format to png or JSON. If the serial is not unique in your account the API returns 409 — set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/qr',
					},
				},
			},
			{
				name: 'Get Registry Address',
				value: 'getRegistryAddress',
				action: 'Get the registry address for a passport',
				description:
					"Prepare the address (UPI) to paste into the EU DPP Registry's online form for a published battery passport. The economic operator registers the passport itself on the Registry website under its own EU Login; TracePass prepares the address and records the preparation, and never submits. The first call fixes the address on the passport so the Registry's copy keeps resolving. Returns { upi, preparedAt }. Refusals return 409 with a code: not_a_battery, not_published, registered_in_production, registry_not_ready (with findingDetails) or invalid_upi. Paid plans only.",
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/registry-upi',
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
				description:
					'Return a paginated list of snapshots for a passport, newest first. A snapshot is written on publish and after every change to a non-draft passport; each entry carries ID, version, reason (e.g. published, field_edit, status_change, baseline), actor, snapshotAt, contentHash, hashValid (re-verified on read), restorable flag, and field count. Set "As Of" to get the version valid at a given moment instead. Counts as one passport read against the daily cap.',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/snapshots',
					},
				},
			},
			{
				name: 'Mark for Deletion',
				value: 'markForDeletion',
				action: 'Mark a passport for deletion',
				description:
					'The first of the two steps that delete a passport. A marked passport can no longer be edited, and a published one frees its plan slot. Works in any status except archived or already marked. Battery passports need a Reason (400 reason_required without one). Refused with 409 has_live_successor while a newer second-life passport names this one as its predecessor. Paid plans only (403 deletion_not_on_plan on Free). One v1 write.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/mark-for-deletion',
					},
				},
			},
			{
				name: 'Mark for Deletion by Serial',
				value: 'markForDeletionBySerial',
				action: 'Mark a passport for deletion by serial',
				description:
					'Mark a passport addressed by its serial number for deletion, the first of the two steps that delete a passport. A marked passport can no longer be edited. Battery passports need a Reason. If the serial is not unique in your account (serials are unique per GTIN) the API returns 409 — set the GTIN field to disambiguate. Paid plans only. One v1 write.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/mark-for-deletion',
					},
				},
			},
			{
				name: 'Place on Market',
				value: 'placeOnMarket',
				action: 'Place a battery passport on the market',
				description:
					"Register a published battery passport through an EN 18222 registry API under your account's own registry access. The EU DPP Registry does not accept this path: for it, use Get Registry Address or Create Registry Upload File, register on the Registry website, then Record Registry Result. A legal act for the economic operator. Asynchronous: returns 202 with status placing; read the passport later \u2014 placeOnMarketStatus becomes placed (registrationId) or rejected (registrationRejectionReason; run this again to retry). Refusals return 409 with a code: not_a_battery, not_published, already_placed, operator_id_missing, registry_not_configured, registry_host_not_allowed or registry_not_ready (with findings). After placement the operator and facility identifiers are locked. Paid plans only.",
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/place-on-market',
					},
				},
			},
			{
				name: 'Record Registry Result',
				value: 'recordRegistryResult',
				action: 'Record a registry result for a passport',
				description:
					"Record what the economic operator reports after acting on the EU DPP Registry website. Production: the battery passport is registered, optionally with the date of placing on the market and the Registry's registration ID; the operator parties then lock. Acceptance: a test result (passed or failed) with no legal effect. The operator submits on the Registry website; TracePass records the operator's statement and does not verify it with the Registry. Returns { passport }. Refusals: 409 not_a_battery, not_published or already_registered; 400 for an invalid, future or pre-publication date. Paid plans only.",
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/registration',
					},
				},
			},
			{
				name: 'Registry Readiness',
				value: 'registryReadiness',
				action: 'Check passport registry readiness',
				description:
					"Check whether a passport would pass the EU DPP Registry's formal submission gate — returns { ready, findings[] } covering mandatory-field presence, correct formatting, a resolvable public link, item-level granularity (a serial number), and a well-formed commodity code where the category carries one, and, for EV, LMT and industrial (over 2 kWh) batteries, conformance to the Commission's battery data model that the Registry validates against (REG-READY-SEMANTIC). This is the registry's mechanical pre-submission check, not the substantive compliance verdict. Battery passports only.",
				routing: {
					request: {
						method: 'GET',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/registry-readiness',
					},
				},
			},
			{
				name: 'Remove Party',
				value: 'removeParty',
				action: 'Remove a party from a passport',
				description:
					'Remove the economic operator for one role from a passport. Safe to repeat: removing a role that is not set returns { removed: false } and leaves the passport version unchanged. 409 operator_locked when a battery passport is placed on the market and the party carries its operator or facility identifier. One v1 write.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/parties/{{$parameter["partyRole"]}}',
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
				name: 'Set Party',
				value: 'setParty',
				action: 'Set a party on a passport',
				description:
					'Create or replace the economic operator for one role on a passport (manufacturer, importer, authorised representative, distributor, recycler or producer responsibility organisation). Sending the same role again replaces it. Needs a legal name and at least one identifier: GLN, legacy operator ID or operator identifier. An LEI is checked against the GLEIF register: one GLEIF does not list, or lists as annulled, duplicate or cancelled, is refused (400); a lapsed or retired LEI, or a legal name GLEIF does not know for it, is saved with a warning. Returns { role, party, version, warnings? }. 409 operator_locked when a battery passport is placed on the market and the write would change its operator or facility identifier; 409 passport_archived on an archived or marked passport. One v1 write.',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/parties/{{$parameter["partyRole"]}}',
					},
				},
			},
			{
				name: 'Suspend',
				value: 'suspend',
				action: 'Suspend a passport',
				description:
					'Suspend a published passport. Reversible. The QR shows a suspended state. Refused (409) once the passport is placed on the market.',
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
					'Suspend a published passport addressed by its serial number. Reversible, and refused (409) once the passport is placed on the market. If the serial is not unique in your account the API returns 409 \u2014 set the GTIN field to disambiguate.',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/v1/passports/by-serial/{{$parameter["serialNumber"]}}/suspend',
					},
				},
			},
			{
				name: 'Undo Registry Result',
				value: 'undoRegistryResult',
				action: 'Undo a registry result for a passport',
				description:
					'Remove a mistakenly recorded EU DPP Registry result for the chosen environment. This changes only the TracePass record, never the Registry: the operator acts on the Registry website. A production registration made through an EN 18222 registry API is not undone here. Returns { passport }, or 409 nothing_to_undo when there is no such record. Paid plans only.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/v1/passports/{{$parameter["passportId"]}}/registration',
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
				operation: [
					'get',
					'compliance',
					'registryReadiness',
					'placeOnMarket',
					'getConditionFlags',
					'setConditionFlags',
					'updateField',
					'suspend',
					'archive',
					'getQr',
					'getSnapshot',
					'getSnapshots',
					'captureMeasurements',
					'getLatestMeasurements',
					'getMeasurements',
					'getRegistryAddress',
					'recordRegistryResult',
					'undoRegistryResult',
					'markForDeletion',
					'setParty',
					'removeParty',
					'delete',
				],
			},
		},
	},
	// ---- EU DPP Registry (website registration) --------------------
	// The economic operator registers on the Registry website under its own EU
	// Login; these fields only feed what TracePass prepares and records.
	{
		displayName: 'Passport IDs',
		name: 'registryPassportIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 65a0f1b2c3d4e5f6a7b8c9d0, 65a0f1b2c3d4e5f6a7b8c9d1',
		description:
			'The TracePass IDs of 1 to 100 battery passports, comma-separated (an expression returning an array also works)',
		displayOptions: {
			show: { resource: ['passport'], operation: ['createRegistryUploadFile'] },
		},
		routing: {
			send: {
				type: 'body',
				property: 'passportIds',
				value:
					'={{ (Array.isArray($value) ? $value : String($value).split(",")).map((id) => String(id).trim()).filter((id) => id) }}',
			},
		},
	},
	{
		displayName: 'Environment',
		name: 'registryEnvironment',
		type: 'options',
		required: true,
		default: 'production',
		description:
			'Which EU DPP Registry the operator acted in. Production records the registration; acceptance is a test with no legal effect.',
		options: [
			{ name: 'Acceptance (Test)', value: 'acceptance' },
			{ name: 'Production', value: 'production' },
		],
		displayOptions: {
			show: { resource: ['passport'], operation: ['recordRegistryResult'] },
		},
		routing: {
			send: { type: 'body', property: 'environment' },
		},
	},
	{
		displayName: 'Environment',
		name: 'registryUndoEnvironment',
		type: 'options',
		required: true,
		default: 'production',
		description: 'Which recorded EU DPP Registry result to undo',
		options: [
			{ name: 'Acceptance (Test)', value: 'acceptance' },
			{ name: 'Production', value: 'production' },
		],
		displayOptions: {
			show: { resource: ['passport'], operation: ['undoRegistryResult'] },
		},
		routing: {
			send: { type: 'query', property: 'environment' },
		},
	},
	{
		displayName: 'Date of Placing on the Market',
		name: 'registryPlacedOnMarketAt',
		type: 'dateTime',
		default: '',
		description:
			'Optional. The day the battery was placed on the market, as the operator reports it (sent as YYYY-MM-DD). Defaults to today; may not be in the future or before the passport was first published.',
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['recordRegistryResult'],
				registryEnvironment: ['production'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'placedOnMarketAt',
				value: '={{ $value ? String($value).slice(0, 10) : undefined }}',
			},
		},
	},
	{
		displayName: 'Registration ID',
		name: 'registryRegistrationId',
		type: 'string',
		default: '',
		description:
			'Optional. The registration identifier the EU DPP Registry showed the operator (up to 200 characters).',
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['recordRegistryResult'],
				registryEnvironment: ['production'],
			},
		},
		routing: {
			send: { type: 'body', property: 'registrationId', value: '={{ $value || undefined }}' },
		},
	},
	{
		displayName: 'Result',
		name: 'registryResult',
		type: 'options',
		required: true,
		default: 'passed',
		description: 'The outcome of the test in the acceptance Registry',
		options: [
			{ name: 'Failed', value: 'failed' },
			{ name: 'Passed', value: 'passed' },
		],
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['recordRegistryResult'],
				registryEnvironment: ['acceptance'],
			},
		},
		routing: {
			send: { type: 'body', property: 'result' },
		},
	},
	{
		displayName: 'Error Code',
		name: 'registryErrorCode',
		type: 'string',
		default: '',
		description:
			'Optional. The error code the acceptance Registry reported for a failed test (up to 100 characters).',
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['recordRegistryResult'],
				registryEnvironment: ['acceptance'],
				registryResult: ['failed'],
			},
		},
		routing: {
			send: { type: 'body', property: 'errorCode', value: '={{ $value || undefined }}' },
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
	{
		displayName: 'As Of',
		name: 'snapshotAt',
		type: 'dateTime',
		default: '',
		description:
			"Optional. Return the single snapshot valid at this moment (the full record plus validFrom and validUntil) instead of the list. Returns 404 when the moment predates the passport's first snapshot.",
		displayOptions: {
			show: { resource: ['passport'], operation: ['getSnapshots'] },
		},
		routing: {
			send: { type: 'query', property: 'at', value: '={{ $value || undefined }}' },
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
			show: {
				resource: ['passport'],
				operation: [
					'getBySerial',
					'getConditionFlagsBySerial',
					'setConditionFlagsBySerial',
					'archiveBySerial',
					'suspendBySerial',
					'updateFieldBySerial',
					'getQrBySerial',
					'captureMeasurementsBySerial',
					'markForDeletionBySerial',
					'getMeasurementsBySerial',
					'getLatestMeasurementsBySerial',
				],
			},
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
			show: {
				resource: ['passport'],
				operation: [
					'getBySerial',
					'getConditionFlagsBySerial',
					'setConditionFlagsBySerial',
					'archiveBySerial',
					'suspendBySerial',
					'updateFieldBySerial',
					'getQrBySerial',
					'captureMeasurementsBySerial',
					'markForDeletionBySerial',
					'getMeasurementsBySerial',
					'getLatestMeasurementsBySerial',
				],
			},
		},
		routing: {
			send: { type: 'query', property: 'gtin' },
		},
	},
	// ---- Party (setParty, removeParty) -----------------------------
	// PATCH /passports/{id}/parties/{role}: the role is a path segment, the
	// party is the body. Identifier fields sit in a collection so only what the
	// user adds is sent; the platform requires at least one of them.
	{
		displayName: 'Role',
		name: 'partyRole',
		type: 'options',
		required: true,
		default: 'manufacturer',
		description: 'The economic-operator role to set or remove',
		options: [
			{ name: 'Authorised Representative', value: 'authorisedRepresentative' },
			{ name: 'Distributor', value: 'distributor' },
			{ name: 'Importer', value: 'importer' },
			{ name: 'Manufacturer', value: 'manufacturer' },
			{ name: 'Producer Responsibility Organisation', value: 'producerResponsibilityOrg' },
			{ name: 'Recycler', value: 'recycler' },
		],
		displayOptions: {
			show: { resource: ['passport'], operation: ['setParty', 'removeParty'] },
		},
	},
	{
		displayName: 'Legal Name',
		name: 'partyLegalName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. EuroBat Recyclers GmbH',
		description: 'The registered legal name of the economic operator (up to 200 characters)',
		displayOptions: {
			show: { resource: ['passport'], operation: ['setParty'] },
		},
		routing: {
			send: { type: 'body', property: 'legalName' },
		},
	},
	{
		displayName: 'Party Fields',
		name: 'partyFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description:
			'At least one identifier is required: GLN, Legacy Operator ID or Operator Identifier',
		displayOptions: {
			show: { resource: ['passport'], operation: ['setParty'] },
		},
		options: [
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. DE',
				description: 'ISO 3166-1 alpha-2 country code, in capitals',
				routing: {
					send: { type: 'body', property: 'country', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description:
					'Contact email address. Shown on the public passport, so use a company contact address, not a person.',
				routing: { send: { type: 'body', property: 'email', value: '={{ $value || undefined }}' } },
			},
			{
				displayName: 'Facility Identifier (JSON)',
				name: 'facilityIdentifier',
				type: 'json',
				default: '={ "scheme": "gln", "gln": "" }',
				description:
					'Structured facility identifier per EN 18219: scheme iso6523, gln, did or doi. The gln variant also accepts an extension (a GS1 SGLN sub-location code). Never fills the GLN field.',
				routing: { send: { type: 'body', property: 'facilityIdentifier' } },
			},
			{
				displayName: 'GLN',
				name: 'gln',
				type: 'string',
				default: '',
				placeholder: 'e.g. 4012345000009',
				description: 'The 13-digit GS1 Global Location Number of the operator',
				routing: { send: { type: 'body', property: 'gln', value: '={{ $value || undefined }}' } },
			},
			{
				displayName: 'Legacy Operator ID',
				name: 'legacyOperatorId',
				type: 'string',
				default: '',
				placeholder: 'e.g. DE123456789',
				description:
					'Free-text identifier (VAT, EORI, supplier code) for an operator without a GLN',
				routing: {
					send: { type: 'body', property: 'legacyOperatorId', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Operator Identifier (JSON)',
				name: 'operatorIdentifier',
				type: 'json',
				default: '={ "scheme": "iso6523", "icd": "0199", "value": "" }',
				description:
					'Structured operator identifier per EN 18219: scheme iso6523, gln, did or doi. An LEI is iso6523 with icd 0199 and is checked against the GLEIF register. Scheme gln also fills the GLN field, and the two must match if both are set.',
				routing: { send: { type: 'body', property: 'operatorIdentifier' } },
			},
			{
				displayName: 'Postal Address',
				name: 'postalAddress',
				type: 'string',
				default: '',
				description:
					'Postal address with a single contact point, as one line. Shown on the public passport.',
				routing: {
					send: { type: 'body', property: 'postalAddress', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'Trade Name',
				name: 'tradeName',
				type: 'string',
				default: '',
				description:
					'Registered trade name or trade mark. Shown on the public passport; a battery importer must also mark it on the battery.',
				routing: {
					send: { type: 'body', property: 'tradeName', value: '={{ $value || undefined }}' },
				},
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com',
				description: "The operator's organisation page (up to 500 characters)",
				routing: { send: { type: 'body', property: 'url', value: '={{ $value || undefined }}' } },
			},
		],
	},
	// ---- Archive / deletion reason (archive, mark for deletion) -----
	// The parameter keeps its original name so existing workflows load unchanged.
	// The platform requires a closed reason for a battery passport (400
	// reason_required / invalid_reason) and validates one when given for any
	// other category. Empty sends no body property at all.
	{
		displayName: 'Reason',
		name: 'archiveReason',
		type: 'options',
		default: '',
		description:
			'Required for battery passports: why the passport ends. A battery passport ends only when the battery has been recycled, so the choices are recycled, never placed on the market or put into service, or a duplicate or erroneous record.',
		options: [
			{ name: '(None)', value: '' },
			{
				name: 'Duplicate or Error',
				value: 'duplicate_or_error',
				description: 'A duplicate or erroneous record',
			},
			{
				name: 'Never Placed',
				value: 'never_placed',
				description: 'Never placed on the market or put into service',
			},
			{ name: 'Recycled', value: 'recycled', description: 'The battery has been recycled' },
		],
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['archive', 'archiveBySerial', 'markForDeletion', 'markForDeletionBySerial'],
			},
		},
		routing: {
			send: { type: 'body', property: 'reason', value: '={{ $value || undefined }}' },
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
			{
				displayName: 'Symbology',
				name: 'symbology',
				type: 'options',
				default: 'qr',
				description:
					'The 2D code to render. EN 18220 permits QR Code and Data Matrix (ISO/IEC 16022); both encode the same passport URL. Data Matrix suits small parts and direct part marking.',
				options: [
					{ name: 'Data Matrix', value: 'datamatrix' },
					{ name: 'QR Code', value: 'qr' },
				],
				routing: { send: { type: 'query', property: 'symbology' } },
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
		description:
			'The GS1 GTIN: 14 digits, or a 13-digit EAN (padded to 14 with a leading 0). Stored and returned as GTIN-14.',
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
		description:
			'IEC 61406 Identification Link — must be an https URI. Not valid for battery passports.',
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
		description:
			'ISO 26324 Digital Object Identifier in bare form: 10.{registrant}/{suffix} (omit the https://doi.org/ prefix). Not valid for battery passports.',
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
		description:
			'Whether the DOI identifies the product model, a production batch, or an individual item (EN 18219 §5.6.2(b)). Required for DOI identifiers.',
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
	// ---- Second-life battery lineage (Art. 77(7)) -------------------
	// In a collection so nothing is sent unless the user adds it.
	{
		displayName: 'Additional Options',
		name: 'createOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: { resource: ['passport'], operation: ['create'] },
		},
		options: [
			{
				displayName: 'Lineage (JSON)',
				name: 'lineage',
				type: 'json',
				default: '={ "predecessors": [ { "internalPassportId": "", "trigger": "repurposing" } ] }',
				description:
					'Battery passports only. A repurposed, remanufactured or reused battery needs a new passport linked to the original(s) (Battery Regulation Art. 77(7)). Each predecessor needs internalPassportId (one of your passports) or identifier (its resolvable URI), plus trigger: preparation_for_reuse, preparation_for_repurposing, repurposing or remanufacturing. With no original passport (placed on the market before 18 Feb 2027), send an empty list and noPredecessorReason. batteryStatus is derived from the triggers.',
				routing: { send: { type: 'body', property: 'lineage' } },
			},
		],
	},
	// ---- Create Batch ----------------------------------------------
	{
		displayName: 'Passports (JSON)',
		name: 'batchPassports',
		type: 'json',
		required: true,
		default: '=[\n  { "productId": "", "gs1": { "gtin": "", "serialNumber": "" } }\n]',
		description:
			'An array of up to 100 passports to create. Each item needs productId and an identifier. GS1 (default): { "productId": "...", "gs1": { "gtin": "...", "serialNumber": "..." } }. EN 18219 schemes: { "productId": "...", "identifier": { "scheme": "iso15459|iec61406|did|doi", ...scheme-specific fields } }. Battery passports accept only gs1 or iso15459 identifiers. A battery item may carry a lineage block (second-life successor, Art. 77(7)), same shape as on Create. Field values are not accepted here — create the shells, then set fields with Update Field.',
		displayOptions: {
			show: { resource: ['passport'], operation: ['createBatch'] },
		},
		routing: {
			send: { type: 'body', property: 'passports' },
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
	{
		displayName: 'Source',
		name: 'fieldSource',
		type: 'options',
		default: 'manual',
		description:
			"Where the value came from. Manual is your own statement and is written with your credential's rights; AI Suggested goes to the review queue for a person to approve.",
		options: [
			{
				name: 'AI Suggested',
				value: 'ai_suggested',
				description:
					'Found or inferred by an AI step in your workflow. Lands in review; refused on fields only the economic operator may state or that must be measured.',
			},
			{
				name: 'Manual',
				value: 'manual',
				description: 'Your own data, such as an ERP or PIM value',
			},
		],
		displayOptions: {
			show: { resource: ['passport'], operation: ['updateField', 'updateFieldBySerial'] },
		},
		routing: {
			send: { type: 'body', property: 'source' },
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
			show: {
				resource: ['passport'],
				operation: ['setConditionFlags', 'setConditionFlagsBySerial'],
			},
		},
		routing: {
			// No `property` → n8n spread-merges the parsed JSON into the root request body,
			// which is the correct shape for PATCH /condition-flags (Record<flagKey, boolean|null>).
			send: { type: 'body' },
		},
	},
	// ---- Battery measurements (living record) ------------------------
	{
		displayName: 'Measurements (JSON)',
		name: 'measurementsBody',
		type: 'json',
		required: true,
		default:
			'=[\n  { "fieldKey": "stateOfHealth", "value": 96.4, "measuredAt": "2027-03-01T06:00:00Z", "externalId": "bms-7781-2027-03-01" }\n]',
		description:
			'An array of up to 500 measurements: { fieldKey, value, measuredAt (ISO 8601), externalId?, unit? }. fieldKey is a battery use-data field (Annex XIII point 4), e.g. stateOfHealth or numberOfFullEquivalentChargingCycles. batteryStatus is not a measurement. externalId makes a measurement idempotent.',
		displayOptions: {
			show: {
				resource: ['passport'],
				operation: ['captureMeasurements', 'captureMeasurementsBySerial'],
			},
		},
		routing: {
			send: { type: 'body', property: 'measurements' },
		},
	},
	{
		displayName: 'Filters',
		name: 'measurementFilters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: { resource: ['passport'], operation: ['getMeasurements', 'getMeasurementsBySerial'] },
		},
		options: [
			{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'string',
				default: '',
				description: 'The nextCursor value from the previous page',
				routing: { send: { type: 'query', property: 'cursor' } },
			},
			{
				displayName: 'Field Key',
				name: 'fieldKey',
				type: 'string',
				default: '',
				placeholder: 'e.g. stateOfHealth',
				description: 'Only measurements of this field',
				routing: { send: { type: 'query', property: 'fieldKey' } },
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				description: 'Only measurements taken at or after this time',
				routing: { send: { type: 'query', property: 'from' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 200 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'query', property: 'limit' } },
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				description: 'Only measurements taken at or before this time',
				routing: { send: { type: 'query', property: 'to' } },
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
			show: { resource: ['passport'], operation: ['getAll'] },
		},
		options: [
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				default: '',
				description: "Filter to one product's passports",
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
