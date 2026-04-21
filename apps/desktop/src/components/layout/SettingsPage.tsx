import React from 'react';
import type { FileRouteTypes } from '@/routeTree.gen';
import { ContentPage } from './ContentPage';

export const SettingsPage: React.FC<TSettingsPageProps> = (props) => {
	const {
		title,
		subtitle,
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
					<div className="bg-base-50/50 mb-6 flex flex-col gap-1 rounded-xl px-4 py-4">
						<h1 className="text-base-950 text-xl font-semibold">{title}</h1>
						{subtitle != null && <p className="text-base-500 text-xs">{subtitle}</p>}
					</div>
				)
			}
			collapseAt={collapseAt}
			className={className}
			contentClassName={contentClassName}
		>
			{children}
		</ContentPage>
	);
};

interface TSettingsPageProps {
	title: React.ReactNode;
	subtitle?: React.ReactNode;
	backTo?: FileRouteTypes['to'];
	backLabel?: string;
	header?: React.ReactNode;
	children?: React.ReactNode;
	collapseAt?: number;
	className?: string;
	contentClassName?: string;
}
