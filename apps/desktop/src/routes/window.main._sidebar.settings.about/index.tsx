import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import {
	ArrowUpRightIcon,
	Button,
	GithubIcon,
	GlobeIcon,
	LogoIcon,
	SettingsPage,
	XTwitterIcon
} from '@/components';
import { appConfig, supportLinks } from '@/environment';
import { useAppInfo } from '@/hooks';
import { openExternalUrl } from '@/lib';
import { SettingsGroup, SettingsRow, SettingsRowFrame } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/about/')({
	component: RouteComponent
});

function RouteComponent() {
	const appInfo = useAppInfo();

	return (
		<SettingsPage
			title={appConfig.name}
			subtitle={appInfo.isPending ? 'Loading version...' : appInfo.version}
			icon={<LogoIcon />}
			iconVariant="default"
		>
			<AboutSection />
			<HelpFeedbackSection />
		</SettingsPage>
	);
}

const AboutSection: React.FC = () => {
	const handleOpenCreator = React.useCallback(() => {
		void openExternalUrl('https://x.com/bennobuilder');
	}, []);

	const handleOpenWebsite = React.useCallback(() => {
		void openExternalUrl(appConfig.website);
	}, []);

	const handleOpenGithub = React.useCallback(() => {
		void openExternalUrl(appConfig.github);
	}, []);

	return (
		<div className="space-y-2.5">
			<SettingsGroup title="About Abstand">
				<SettingsRowFrame className="flex-col items-start gap-2">
					<p className="text-base-600 text-sm leading-relaxed">
						{appConfig.name} is an independent macOS app by{' '}
						<button
							type="button"
							className="focus-ring text-primary rounded-sm hover:underline"
							onClick={handleOpenCreator}
						>
							@bennobuilder
						</button>
						. It is open source under AGPL v3 and helps you block apps and websites for focus,
						wind-down, and digital detox.
					</p>
					<p className="text-base-400 text-sm">Copyright (c) 2026 @bennobuilder</p>
				</SettingsRowFrame>
			</SettingsGroup>
			<div className="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					variant="soft"
					className="bg-base-50/70 hover:bg-base-100 rounded-full"
					onClick={handleOpenWebsite}
				>
					<GlobeIcon />
					Website
				</Button>
				<Button
					type="button"
					variant="soft"
					className="bg-base-50/70 hover:bg-base-100 rounded-full"
					onClick={handleOpenGithub}
				>
					<GithubIcon />
					GitHub
				</Button>
				<Button
					type="button"
					variant="soft"
					className="bg-base-50/70 hover:bg-base-100 rounded-full"
					onClick={handleOpenCreator}
				>
					<XTwitterIcon />
					@bennobuilder
				</Button>
			</div>
		</div>
	);
};

const HelpFeedbackSection: React.FC = () => {
	const handleOpenSupportUrl = React.useCallback((url: string) => {
		void openExternalUrl(url);
	}, []);

	return (
		<SettingsGroup title="Help & Feedback">
			{supportLinks.map((link) => (
				<SettingsRow
					key={link.label}
					label={link.label}
					description={link.description}
					render={<button type="button" onClick={() => handleOpenSupportUrl(link.url)} />}
				>
					<ArrowUpRightIcon aria-hidden className="text-base-400" />
				</SettingsRow>
			))}
		</SettingsGroup>
	);
};
