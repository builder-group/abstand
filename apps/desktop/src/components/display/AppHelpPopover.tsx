import React from 'react';
import { appConfig } from '@/environment';
import { openExternalUrl } from '@/lib';
import { Button } from '../input';
import { BugIcon, CircleQuestionMarkIcon, MailIcon, MessageCircleIcon } from './icons';
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
	type TPopoverContentProps
} from './Popover';

export const AppHelpPopover: React.FC<TAppHelpPopoverProps> = (props) => {
	const { side = 'bottom', align = 'end', triggerClassName } = props;

	// MARK: - Actions

	const handleOpenSupportUrl = React.useCallback((url: string) => {
		void openExternalUrl(url);
	}, []);

	// MARK: - UI

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button aria-label="Help" variant="ghost" size="icon-sm" className={triggerClassName}>
						<CircleQuestionMarkIcon />
					</Button>
				}
			/>
			<PopoverContent side={side} align={align} className="w-56">
				<PopoverHeader>
					<PopoverTitle>Support</PopoverTitle>
					<PopoverDescription>Get help or share feedback.</PopoverDescription>
				</PopoverHeader>
				<div className="-mx-1 flex flex-col gap-0.5">
					{appHelpLinks.map((link) => (
						<PopoverClose
							key={link.label}
							type="button"
							className="text-base-600 hover:bg-base-950/6 hover:text-base-950 focus-ring flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-sm transition-colors select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
							onClick={() => handleOpenSupportUrl(link.url)}
						>
							<link.Icon />
							<span>{link.label}</span>
						</PopoverClose>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
};

export interface TAppHelpPopoverProps {
	side?: TPopoverContentProps['side'];
	align?: TPopoverContentProps['align'];
	triggerClassName?: string;
}

const appHelpLinks = [
	{
		label: 'Join Discord',
		url: appConfig.help.discord,
		Icon: MessageCircleIcon
	},
	{
		label: 'Email support',
		url: appConfig.help.mailto('Support'),
		Icon: MailIcon
	},
	{
		label: 'Report issue',
		url: appConfig.help.githubIssues,
		Icon: BugIcon
	}
] satisfies TAppHelpLink[];

interface TAppHelpLink {
	label: string;
	url: string;
	Icon: React.ComponentType<{ className?: string }>;
}
