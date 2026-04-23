import React from 'react';
import { cn } from '@/lib';
import type { FileRouteTypes } from '@/routeTree.gen';
import { IconBubble, type TIconBubbleProps } from '../display';
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
		children,
		collapseAt = 96,
		className,
		contentClassName
	} = props;

	return (
		<ContentPage
			title={title}
			backTo={backTo}
			backLabel={backLabel}
			header={
				header ?? (
					<div className="bg-base-50/70 mb-6 flex items-start gap-3 rounded-xl px-4 py-4">
						{icon != null && (
							<IconBubble variant={iconVariant} size="default" className="shrink-0">
								{icon}
							</IconBubble>
						)}
						<div className="min-w-0 flex-1">
							<h1 className="text-base-950 text-xl font-semibold">{title}</h1>
							{subtitle != null && <p className="text-base-500 text-xs">{subtitle}</p>}
						</div>
					</div>
				)
			}
			collapseAt={collapseAt}
			className={className}
			contentClassName={cn('space-y-4 pt-4', contentClassName)}
		>
			{children}
		</ContentPage>
	);
};

interface TSettingsPageProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	icon?: React.ReactNode;
	iconVariant?: TIconBubbleProps['variant'];
	backTo?: FileRouteTypes['to'];
	backLabel?: string;
	header?: React.ReactNode;
	children?: React.ReactNode;
	collapseAt?: number;
	className?: string;
	contentClassName?: string;
}
