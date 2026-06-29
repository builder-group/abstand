const email = 'support@builder.group';

export const appConfig = {
	name: 'Abstand',
	website: 'https://abstand.app/',
	github: 'https://github.com/builder-group/abstand',
	help: {
		discord: 'https://discord.com/invite/w4xE3bSjhQ',
		email,
		githubIssues: 'https://github.com/builder-group/abstand/issues',
		mailto: (subject: string) =>
			`mailto:${email}?subject=${encodeURIComponent(`[Abstand] ${subject}`)}`
	}
} as const;
