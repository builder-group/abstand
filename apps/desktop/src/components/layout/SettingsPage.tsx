import React from 'react';
import { cn } from '@/lib';
import type { FileRouteTypes } from '@/routeTree.gen';
import { AppHelpPopover, IconBubble, type TIconBubbleProps } from '../display';
import { ContentPage } from './ContentPage';

export const SettingsPage: React.FC<TSettingsPageProps> = (props) => {
	const {
		title,
		subtitle,
		icon,
		iconVariant = 'neutral',
		backTo,
		backLabel,
		header,
		collapseAt = 76,
		children,
		contentClassName,
		className
	} = props;

	return (
		<ContentPage
			title={title}
			backTo={backTo}
			backLabel={backLabel}
			header={
				header ?? (
					<div className="bg-base-50/70 mb-5 flex items-start gap-3 rounded-xl px-3 py-2">
						{icon != null && (
							<IconBubble variant={iconVariant} size="md" className="mt-1 shrink-0">
								{icon}
							</IconBubble>
						)}
						<div className="min-w-0 flex-1">
							<h1 className="text-base-950 text-lg font-semibold">{title}</h1>
							{subtitle != null && <p className="text-base-500 -mt-0.5 text-sm">{subtitle}</p>}
						</div>
					</div>
				)
			}
			collapseAt={collapseAt}
			className={className}
			contentClassName={cn('flex flex-1 flex-col gap-5', contentClassName)}
		>
			{children}
			<div className="mt-auto flex justify-end">
				<AppHelpPopover side="top" align="end" />
			</div>
		</ContentPage>
	);
};

export interface TSettingsPageProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	icon?: React.ReactNode;
	iconVariant?: TIconBubbleProps['variant'];
	backTo?: FileRouteTypes['to'];
	backLabel?: string;
	header?: React.ReactNode;
	collapseAt?: number;
	children?: React.ReactNode;
	contentClassName?: string;
	className?: string;
}
