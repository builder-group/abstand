import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { cn } from '@/lib';
import { WindowControlsInset, WindowHeaderRow } from './WindowHeader';

const DialogContext = React.createContext<TDialogContext>({
	size: 'sm'
});

interface TDialogContext {
	size: TDialogSize;
}

type TDialogSize = NonNullable<VariantProps<typeof dialogContentVariants>['size']>;

export const Dialog: React.FC<TDialogProps> = (props) => {
	const { size = 'sm', ...rest } = props;

	return (
		<DialogContext value={{ size }}>
			<DialogPrimitive.Root data-slot="dialog" data-size={size} {...rest} />
		</DialogContext>
	);
};

export type TDialogProps = DialogPrimitive.Root.Props & {
	size?: TDialogSize;
};

export const DialogTrigger: React.FC<TDialogTriggerProps> = (props) => {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
};

export type TDialogTriggerProps = DialogPrimitive.Trigger.Props;

export const DialogPortal: React.FC<TDialogPortalProps> = (props) => {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
};

export type TDialogPortalProps = DialogPrimitive.Portal.Props;

export const DialogClose: React.FC<TDialogCloseProps> = (props) => {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
};

export type TDialogCloseProps = DialogPrimitive.Close.Props;

export const DialogBackdrop: React.FC<TDialogBackdropProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-backdrop"
			className={cn(
				'fixed inset-0 z-50',
				'bg-base-950/12 supports-backdrop-filter:bg-base-950/6 supports-backdrop-filter:backdrop-blur-md',
				'transition-opacity duration-200 ease-out',
				'data-starting-style:opacity-0',
				'data-ending-style:opacity-0',
				className
			)}
			{...rest}
		/>
	);
};

export type TDialogBackdropProps = DialogPrimitive.Backdrop.Props;

export const DialogContent: React.FC<TDialogContentProps> = (props) => {
	const { showWindowDragRegion = true, children, className, ...rest } = props;
	const { size } = React.use(DialogContext);

	return (
		<DialogPortal>
			<DialogBackdrop />
			{showWindowDragRegion && (
				// Note: Keep only the drag regions active so non-draggable top gutters still pass through to the backdrop
				<WindowHeaderRow
					aria-hidden="true"
					className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4"
				>
					<WindowControlsInset />
					<div data-tauri-drag-region className="pointer-events-auto h-full flex-1" />
				</WindowHeaderRow>
			)}
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				data-size={size}
				className={cn(dialogContentVariants({ size }), className)}
				{...rest}
			>
				{children}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
};

export interface TDialogContentProps extends DialogPrimitive.Popup.Props {
	showWindowDragRegion?: boolean;
}

const dialogContentVariants = cva(
	'bg-base-0 border-base-100 fixed top-1/2 left-1/2 z-50 w-full origin-center -translate-x-1/2 -translate-y-1/2 border shadow-xl transition-[opacity,scale] duration-200 ease-out outline-none data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-starting-style:scale-[0.97] data-starting-style:opacity-0',
	{
		variants: {
			size: {
				sm: 'max-w-sm rounded-xl',
				md: 'max-w-md rounded-xl'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);

export const DialogHeader: React.FC<TDialogHeaderProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DialogContext);

	return (
		<div
			data-slot="dialog-header"
			data-size={size}
			className={cn(dialogHeaderVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDialogHeaderProps = React.ComponentProps<'div'>;

const dialogHeaderVariants = cva('flex flex-col', {
	variants: {
		size: {
			sm: 'gap-0.5 px-4 pt-4',
			md: 'gap-0.5 px-5 pt-5'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const DialogTitle: React.FC<TDialogTitleProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DialogContext);

	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			data-size={size}
			className={cn(dialogTitleVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDialogTitleProps = DialogPrimitive.Title.Props;

const dialogTitleVariants = cva('text-base-950 font-semibold', {
	variants: {
		size: {
			sm: 'text-sm',
			md: 'text-base'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const DialogDescription: React.FC<TDialogDescriptionProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DialogContext);

	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			data-size={size}
			className={cn(dialogDescriptionVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDialogDescriptionProps = DialogPrimitive.Description.Props;

const dialogDescriptionVariants = cva('text-base-500', {
	variants: {
		size: {
			sm: 'text-sm',
			md: 'text-sm'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const DialogBody: React.FC<TDialogBodyProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DialogContext);

	return (
		<div
			data-slot="dialog-body"
			data-size={size}
			className={cn(dialogBodyVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDialogBodyProps = React.ComponentProps<'div'>;

const dialogBodyVariants = cva('text-base-950', {
	variants: {
		size: {
			sm: 'px-4 py-3 text-sm',
			md: 'px-5 py-4 text-sm'
		}
	},
	defaultVariants: {
		size: 'sm'
	}
});

export const DialogFooter: React.FC<TDialogFooterProps> = (props) => {
	const { className, ...rest } = props;
	const { size } = React.use(DialogContext);

	return (
		<div
			data-slot="dialog-footer"
			data-size={size}
			className={cn(dialogFooterVariants({ size }), className)}
			{...rest}
		/>
	);
};

export type TDialogFooterProps = React.ComponentProps<'div'>;

const dialogFooterVariants = cva(
	'border-base-100 bg-base-50/60 flex items-center justify-end border-t',
	{
		variants: {
			size: {
				sm: 'gap-2 rounded-b-xl px-4 py-3',
				md: 'gap-2.5 rounded-b-xl px-5 py-4'
			}
		},
		defaultVariants: {
			size: 'sm'
		}
	}
);
