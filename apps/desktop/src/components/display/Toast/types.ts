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

export type TToastObject = ToastObject<TToastData>;

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
