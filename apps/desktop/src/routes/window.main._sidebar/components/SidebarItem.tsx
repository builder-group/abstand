import { Link } from '@tanstack/react-router';
import React from 'react';
import { Kbd } from '@/components';
import { cn } from '@/lib';

export const SidebarItem: React.FC<TSidebarItemProps> = (props) => {
	const { icon, label, shortcut, to, exact = false, className } = props;

	const cls = cn(
		'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left',
		'text-base-600 text-[13px] transition-colors',
		'border border-transparent hover:bg-base-100/80 focus-ring',
		'data-[status=active]:bg-base-200/80 data-[status=active]:text-base-950',
		className
	);

	const content = (
		<>
			{icon}
			<span className="flex-1">{label}</span>
			{shortcut != null && <Kbd variant="ghost">{shortcut}</Kbd>}
		</>
	);

	if (to != null) {
		return (
			<Link to={to} activeOptions={{ exact }} className={cls}>
				{content}
			</Link>
		);
	}

	return <button className={cls}>{content}</button>;
};

interface TSidebarItemProps {
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
	to?: string;
	exact?: boolean;
	className?: string;
}
