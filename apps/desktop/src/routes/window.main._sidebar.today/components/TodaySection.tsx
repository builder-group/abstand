import React from 'react';
import { Spinner } from '@/components';
import { cn } from '@/lib';
import { SettingsGroup } from '@/modules/settings';

export const TodaySection: React.FC<TTodaySectionProps> = (props) => {
	const { title, indicator, children, contentLayout = 'default', contentClassName } = props;

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="ml-2.5 flex items-center gap-1.5">
				{indicator}
				<p className="text-base-600 text-sm font-semibold">{title}</p>
			</div>
			<SettingsGroup
				contentClassName={cn(
					contentLayout === 'placeholder' && 'flex min-h-32 items-center justify-center',
					contentClassName
				)}
			>
				{children}
			</SettingsGroup>
		</div>
	);
};

interface TTodaySectionProps {
	title: string;
	indicator: React.ReactNode;
	children: React.ReactNode;
	contentLayout?: 'default' | 'placeholder';
	contentClassName?: string;
}

export const SectionIndicator: React.FC<TSectionIndicatorProps> = (props) => {
	const { children, className } = props;

	return (
		<span
			className={cn(
				'relative flex size-4 items-center justify-center rounded-full [&_svg]:size-2.5',
				className
			)}
		>
			{children}
		</span>
	);
};

interface TSectionIndicatorProps {
	children: React.ReactNode;
	className: string;
}

export const TodayEmptyRow: React.FC<TTodayEmptyRowProps> = (props) => {
	const { title, description } = props;

	return (
		<div className="flex max-w-sm flex-col items-center justify-center px-2.5 py-3 text-center">
			<p className="text-base-950 text-sm font-medium">{title}</p>
			<p className="text-base-500 mt-1 text-xs">{description}</p>
		</div>
	);
};

interface TTodayEmptyRowProps {
	title: string;
	description: string;
}

export const TodayLoadingRow: React.FC<TTodayLoadingRowProps> = (props) => {
	const { title } = props;

	return (
		<div className="text-base-500 flex max-w-sm items-center justify-center gap-1.5 px-2.5 py-3 text-sm">
			<Spinner />
			<span>{title}</span>
		</div>
	);
};

interface TTodayLoadingRowProps {
	title: string;
}
