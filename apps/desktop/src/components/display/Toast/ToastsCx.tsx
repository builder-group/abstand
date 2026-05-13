import { Toast as ToastPrimitive, type ToastManager } from '@base-ui/react/toast';
import React from 'react';
import { ToastViewport } from './Toast';
import type {
	TToastData,
	TToastId,
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
		return this._manager.add(options);
	}

	public close(toastId?: TToastId): void {
		this._manager.close(toastId);
	}

	public update(toastId: TToastId, options: TToastUpdateOptions): void {
		this._manager.update(toastId, options);
	}

	public promise<GValue>(
		promise: Promise<GValue>,
		options: TToastPromiseOptions<GValue>
	): Promise<GValue> {
		return this._manager.promise(promise, options);
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
		<ToastPrimitive.Provider toastManager={manager} limit={limit} timeout={timeout} {...rest}>
			<ReactToastsCx.Provider value={cx}>{children}</ReactToastsCx.Provider>
			<ToastViewport timeout={timeout} />
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
