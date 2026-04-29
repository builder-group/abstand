import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import React from 'react';
import { cn } from '@/lib';

export const Dialog: React.FC<TDialogProps> = (props) => {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
};

export type TDialogProps = DialogPrimitive.Root.Props;

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
				'bg-base-950/12 supports-backdrop-filter:bg-base-950/6 supports-backdrop-filter:backdrop-blur-sm',
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
	const { className, children, ...rest } = props;

	return (
		<DialogPortal>
			<DialogBackdrop />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					'fixed top-1/2 left-1/2 z-50 w-full max-w-sm',
					'-translate-x-1/2 -translate-y-1/2',
					'bg-base-0 border-base-100 rounded-2xl border shadow-xl outline-none',
					'origin-center transition-[opacity,scale] duration-200 ease-out',
					'data-starting-style:scale-[0.97] data-starting-style:opacity-0',
					'data-ending-style:scale-[0.97] data-ending-style:opacity-0',
					className
				)}
				{...rest}
			>
				{children}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
};

export type TDialogContentProps = DialogPrimitive.Popup.Props;

export const DialogHeader: React.FC<TDialogHeaderProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<div
			data-slot="dialog-header"
			className={cn('flex flex-col gap-1 px-4 pt-4 pb-3', className)}
			{...rest}
		/>
	);
};

export type TDialogHeaderProps = React.ComponentProps<'div'>;

export const DialogTitle: React.FC<TDialogTitleProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn('text-base-950 text-sm font-semibold', className)}
			{...rest}
		/>
	);
};

export type TDialogTitleProps = DialogPrimitive.Title.Props;

export const DialogDescription: React.FC<TDialogDescriptionProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn('text-base-500 text-sm', className)}
			{...rest}
		/>
	);
};

export type TDialogDescriptionProps = DialogPrimitive.Description.Props;

export const DialogBody: React.FC<TDialogBodyProps> = (props) => {
	const { className, ...rest } = props;

	return <div data-slot="dialog-body" className={cn('px-4 py-3', className)} {...rest} />;
};

export type TDialogBodyProps = React.ComponentProps<'div'>;

export const DialogFooter: React.FC<TDialogFooterProps> = (props) => {
	const { className, ...rest } = props;

	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				'flex items-center justify-end gap-2',
				'border-base-100 bg-base-50/60 rounded-b-2xl border-t px-4 py-3',
				className
			)}
			{...rest}
		/>
	);
};

export type TDialogFooterProps = React.ComponentProps<'div'>;
