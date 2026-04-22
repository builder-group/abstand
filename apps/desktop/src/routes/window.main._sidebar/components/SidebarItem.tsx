import { Link } from '@tanstack/react-router';
import React from 'react';
import { Kbd } from '@/components';
import { cn } from '@/lib';
import { FileRouteTypes } from '@/routeTree.gen';

export const SidebarItem: React.FC<TSidebarItemProps> = (props) => {
	const { icon, label, shortcut, isAction, className, ...itemProps } = props;

	const cls = cn(
		'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left',
		'text-base-600 text-[13px] transition-colors',
		"border border-transparent hover:bg-base-950/6 hover:text-base-950 focus-ring disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
		!isAction && 'data-[status=active]:bg-base-950/10 data-[status=active]:text-base-950',
		className
	);

	const content = (
		<>
			{icon}
			<span className="min-w-0 flex-1 truncate">{label}</span>
			{shortcut != null && <Kbd variant="ghost">{shortcut}</Kbd>}
		</>
	);

	if (itemProps.to != null) {
		const { to, exact = false } = itemProps;

		return (
			<Link to={to} activeOptions={{ exact }} className={cls}>
				{content}
			</Link>
		);
	}

	const { type = 'button', ...buttonProps } = itemProps;

	return (
		<button type={type} className={cls} {...buttonProps}>
			{content}
		</button>
	);
};

type TSidebarItemProps = TSidebarItemLinkProps | TSidebarItemButtonProps;

interface TSidebarItemLinkProps extends TSidebarItemBaseProps {
	to: FileRouteTypes['to'];
	exact?: boolean;
}

type TSidebarItemButtonProps = TSidebarItemBaseProps &
	Omit<React.ComponentPropsWithoutRef<'button'>, 'children' | 'className'> & {
		to?: undefined;
		exact?: never;
	};

interface TSidebarItemBaseProps {
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
	isAction?: boolean;
	className?: string;
}
