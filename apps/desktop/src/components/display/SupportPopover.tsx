import React from 'react';
import { supportLinks, type TSupportLinkId } from '@/environment';
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

export const SupportPopover: React.FC<TSupportPopoverProps> = (props) => {
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
					<Button
						aria-label="Help & Feedback"
						variant="ghost"
						size="icon-sm"
						className={triggerClassName}
					>
						<CircleQuestionMarkIcon />
					</Button>
				}
			/>
			<PopoverContent side={side} align={align} className="w-56">
				<PopoverHeader>
					<PopoverTitle>Help & Feedback</PopoverTitle>
					<PopoverDescription>Get help or share feedback.</PopoverDescription>
				</PopoverHeader>
				<div className="-mx-1 flex flex-col gap-0.5">
					{supportLinks.map((link) => {
						const Icon = supportLinkIcons[link.id];

						return (
							<PopoverClose
								key={link.label}
								type="button"
								className="text-base-600 hover:bg-base-950/6 hover:text-base-950 focus-ring flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-left text-sm transition-colors select-none"
								onClick={() => handleOpenSupportUrl(link.url)}
							>
								<Icon aria-hidden className="pointer-events-none size-4 shrink-0" />
								<span>{link.label}</span>
							</PopoverClose>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
};

export interface TSupportPopoverProps {
	side?: TPopoverContentProps['side'];
	align?: TPopoverContentProps['align'];
	triggerClassName?: string;
}

const supportLinkIcons = {
	discord: MessageCircleIcon,
	email: MailIcon,
	issue: BugIcon
} satisfies Record<TSupportLinkId, React.ComponentType<{ className?: string }>>;
