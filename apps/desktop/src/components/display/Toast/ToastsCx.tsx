import { Toast as ToastPrimitive, type ToastManager } from '@base-ui/react/toast';
import React from 'react';
import { ToastViewport } from './Toast';
import type {
	TToastData,
	TToastId,
	TToastObject,
	TToastOptions,
	TToastPromiseOptions,
	TToastUpdateOptions
} from './types';

export class ToastsCx {
	private readonly _manager: ToastManager<TToastData>;

	constructor(manager: ToastManager<TToastData>) {
		this._manager = manager;
	}

	public add(options: TToastOptions): TToastId {
		return this._manager.add(toBaseToastOptions(options));
	}

	public close(toastId?: TToastId): void {
		this._manager.close(toastId);
	}

	public update(toastId: TToastId, options: TToastUpdateOptions): void {
		this._manager.update(toastId, toBaseToastOptions(options));
	}

	public promise<GValue>(
		promise: Promise<GValue>,
		options: TToastPromiseOptions<GValue>
	): Promise<GValue> {
		return this._manager.promise(promise, toBasePromiseOptions(options));
	}
}

const ReactToastsCx = React.createContext<ToastsCx | null>(null);

export const ToastsCxProvider: React.FC<TToastsCxProviderProps> = (props) => {
	const { children, limit = 3, timeout = 5000, ...rest } = props;

	const { manager, cx } = React.useMemo(() => {
		const manager = ToastPrimitive.createToastManager<TToastData>();
		return { manager, cx: new ToastsCx(manager) };
	}, []);

	return (
		/*
		 * Note: Base UI still owns toast state, stacking, focus, swipe, and transitions. We disable its
		 * auto-dismiss timer so the rendered countdown is the single source of truth for dismissal
		 * timing. Otherwise the visible ring and close timing can drift on pause/resume edges.
		 */
		<ToastPrimitive.Provider toastManager={manager} limit={limit} timeout={0} {...rest}>
			<ReactToastsCx.Provider value={cx}>{children}</ReactToastsCx.Provider>
			<ToastViewport dismissAfterMs={timeout} />
		</ToastPrimitive.Provider>
	);
};

export interface TToastsCxProviderProps extends Omit<
	ToastPrimitive.Provider.Props,
	'children' | 'toastManager'
> {
	children: React.ReactNode;
}

export function useToastsCx(): ToastsCx {
	const cx = React.useContext(ReactToastsCx);
	if (cx == null) {
		throw new Error('useToastsCx must be used within a ToastsCxProvider');
	}
	return cx;
}

function toBaseToastOptions<GOptions extends TToastOptions | TToastUpdateOptions>(
	options: GOptions
): GOptions & Pick<TToastObject, '_dismissAfterMs'> {
	const { timeout, ...rest } = options;
	const hasTimeout = Object.hasOwn(options, 'timeout');

	return {
		...rest,
		...(hasTimeout ? { timeout: 0, _dismissAfterMs: timeout } : {})
	} as unknown as GOptions & Pick<TToastObject, '_dismissAfterMs'>;
}

function toBasePromiseOptions<GValue>(
	options: TToastPromiseOptions<GValue>
): TToastPromiseOptions<GValue> {
	const { loading, success, error } = options;

	return {
		loading: toBasePromiseLoadingOption(loading),
		success: toBasePromiseOption(success),
		error: toBasePromiseOption(error)
	};
}

function toBasePromiseLoadingOption(
	option: string | TToastUpdateOptions
): string | TToastUpdateOptions {
	if (typeof option === 'string') {
		return option;
	}

	const { timeout: ignoredTimeout, ...rest } = option;
	return rest;
}

function toBasePromiseOption<GValue>(
	option: string | TToastUpdateOptions | ((result: GValue) => string | TToastUpdateOptions)
): string | TToastUpdateOptions | ((result: GValue) => string | TToastUpdateOptions) {
	if (typeof option === 'string') {
		return option;
	}

	if (typeof option === 'function') {
		return (result: GValue) => {
			const resolved = option(result);
			return typeof resolved === 'string' ? resolved : toBaseToastOptions(resolved);
		};
	}

	return toBaseToastOptions(option);
}
