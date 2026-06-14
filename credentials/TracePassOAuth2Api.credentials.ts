import type { ICredentialType, Icon, INodeProperties } from 'n8n-workflow';

/**
 * TracePass OAuth2 credential.
 *
 * The user-authorized alternative to the static `tp_` API key
 * (`TracePassApi`). Uses the OAuth 2.0 authorization-code flow with
 * PKCE against the TracePass authorization server — the user grants
 * specific scopes on a consent screen and n8n stores the resulting
 * access + refresh tokens, refreshing automatically.
 *
 * Best when an integration acts on a specific user's behalf with
 * least-privilege, revocable access. For pure server-to-server use an
 * API key (`TracePassApi`) instead — it's simpler.
 *
 * `extends: ['oAuth2Api']` pulls in n8n's generic OAuth2 machinery
 * (the token store, refresh handling, the "Connect my account" button).
 * We pin grantType=authorizationCode and enable PKCE; the client is
 * registered in the TracePass dashboard under Developer → OAuth Apps
 * (use a public/PKCE client — no secret needed, but n8n's generic
 * OAuth2 form still asks for one, so register a confidential client if
 * you prefer, or leave the secret blank for a public client).
 */
export class TracePassOAuth2Api implements ICredentialType {
	name = 'tracePassOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'TracePass OAuth2 API';

	documentationUrl = 'https://www.tracepass.eu/docs/authentication';

	icon: Icon = { light: 'file:../icons/tracepass.svg', dark: 'file:../icons/tracepass.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			default: 'https://app.tracepass.eu/api/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: 'https://app.tracepass.eu/api/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: 'passports:read passports:write offline_access',
			description:
				'Space-separated scopes to request. Request only what the workflow needs; the user approves these on the consent screen. Include offline_access so n8n can refresh the token.',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'code_challenge_method=S256',
			description: 'PKCE is required by the TracePass authorization server.',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.tracepass.eu',
			placeholder: 'e.g. https://app.tracepass.eu',
			description:
				'The TracePass app base URL for API calls. Change this only for a self-hosted or staging deployment.',
		},
	];
}
