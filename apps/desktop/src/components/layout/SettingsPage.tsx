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
		collapseAt = 84,
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
					<div className="bg-base-50/70 mb-6 flex items-start gap-3 rounded-xl px-3 py-2">
						{icon != null && (
							<IconBubble variant={iconVariant} size="md" className="mt-1 shrink-0">
								{icon}
							</IconBubble>
						)}
						<div className="min-w-0 flex-1">
							<h1 className="text-base-950 text-lg font-semibold">{title}</h1>
							{subtitle != null && <p className="text-base-500 -mt-0.5 text-[13px]">{subtitle}</p>}
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
