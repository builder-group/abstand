import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import React from 'react';
import { Kbd } from '@/components';
import { cn } from '@/lib';

export const SidebarItem: React.FC<TSidebarItemProps> = (props) => {
	const { icon, label, shortcut, isAction, render, className, ...rest } = props;

	return useRender({
		defaultTagName: 'button',
		props: mergeProps<'button'>(
			{
				className: cn(
					'flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left',
					'text-base-600 text-sm transition-colors',
					"hover:bg-base-950/6 hover:text-base-950 focus-ring border border-transparent select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
					!isAction && 'data-[status=active]:bg-base-950/10 data-[status=active]:text-base-950',
					className
				),
				children: (
					<>
						{icon}
						<span className="min-w-0 flex-1 truncate">{label}</span>
						{shortcut != null && <Kbd variant="ghost">{shortcut}</Kbd>}
					</>
				)
			},
			rest
		),
		render,
		state: { slot: 'sidebar-item', isAction }
	});
};

export type TSidebarItemProps = useRender.ComponentProps<'button'> & {
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
	isAction?: boolean;
};
