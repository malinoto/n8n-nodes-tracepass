import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * TracePass API credential.
 *
 * Authenticates against the TracePass v1 REST API with a `tp_` API
 * key (minted in the TracePass dashboard under Developer → API Keys).
 * The key is sent as a Bearer token on every request.
 *
 * `test` lets n8n's "Test connection" button verify the key by
 * hitting a cheap read endpoint — a green check before the user
 * builds a workflow on a bad key.
 */
export class TracePassApi implements ICredentialType {
	name = 'tracePassApi';

	displayName = 'TracePass API';

	documentationUrl = 'https://www.tracepass.eu/docs/authentication';

	icon: Icon = { light: 'file:../icons/tracepass.svg', dark: 'file:../icons/tracepass.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'e.g. tp_0123456789abcdef0123456789abcdef',
			description:
				'Your TracePass API key (starts with "tp_"). Create one in the TracePass dashboard under Developer → API Keys.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.tracepass.eu',
			placeholder: 'e.g. https://app.tracepass.eu',
			description:
				'The TracePass app base URL. Change this only for a self-hosted or staging deployment.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/v1/products',
			method: 'GET',
			qs: { limit: 1 },
		},
	};
}
