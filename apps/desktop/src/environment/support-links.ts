import { appConfig } from './configs';

export const supportLinks = [
	{
		id: 'discord',
		label: 'Join Discord',
		description: 'Chat with the community.',
		url: appConfig.help.discord,
		keywords: ['discord', 'community', 'chat']
	},
	{
		id: 'email',
		label: 'Email support',
		description: 'Get help by email.',
		url: appConfig.help.mailto('Support'),
		keywords: ['email', 'support', 'help', 'contact']
	},
	{
		id: 'issue',
		label: 'Report issue',
		description: 'Open a GitHub issue.',
		url: appConfig.help.githubIssues,
		keywords: ['github', 'issue', 'bug', 'report', 'feedback']
	}
] as const satisfies readonly TSupportLink[];

export interface TSupportLink {
	id: string;
	label: string;
	description: string;
	url: string;
	keywords: string[];
}

export type TSupportLinkId = (typeof supportLinks)[number]['id'];
