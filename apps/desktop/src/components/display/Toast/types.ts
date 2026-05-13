import type {
	ToastManagerAddOptions,
	ToastManagerUpdateOptions,
	ToastObject
} from '@base-ui/react/toast';
import type React from 'react';

export interface TToastData {
	icon?: React.ReactNode;
	action?: React.ReactNode;
}

export type TToastId = string;
export type TToastType =
	| 'default'
	| 'success'
	| 'warning'
	| 'destructive'
	| 'error'
	| 'info'
	| 'loading';

export type TToastObject = ToastObject<TToastData> & {
	/**
	 * Internal auto-dismiss duration used by the rendered countdown.
	 *
	 * Note: Base UI preserves custom top-level option fields on the live toast object,
	 * so we keep this outside caller-owned data.
	 */
	_dismissAfterMs?: number;
};

export type TToastOptions = Omit<
	ToastManagerAddOptions<TToastData>,
	'actionProps' | 'positionerProps' | 'type'
> & {
	type?: TToastType;
};

export type TToastUpdateOptions = Omit<
	ToastManagerUpdateOptions<TToastData>,
	'actionProps' | 'positionerProps' | 'type'
> & {
	type?: TToastType;
};

export interface TToastPromiseOptions<GValue> {
	loading: string | TToastUpdateOptions;
	success: string | TToastUpdateOptions | ((result: GValue) => string | TToastUpdateOptions);
	error: string | TToastUpdateOptions | ((error: unknown) => string | TToastUpdateOptions);
}
