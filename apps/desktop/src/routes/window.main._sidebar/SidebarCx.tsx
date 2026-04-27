import { createState } from 'feature-state';
import React from 'react';
import { specta } from '@/environment';
import { createMountLifecycle } from '@/lib';

export class SidebarCx {
	public readonly $isOpen = createState(true);

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.shortcutTriggeredEvent.listen((event) => {
					if (event.payload === 'toggleSidebar') this.toggle();
				})
			);
		})();

		return lifecycle.unmount;
	}

	public open(): void {
		this.$isOpen.set(true);
	}

	public close(): void {
		this.$isOpen.set(false);
	}

	public toggle(): void {
		this.$isOpen.set(!this.$isOpen._v);
	}
}

const ReactSidebarCx = React.createContext<SidebarCx | null>(null);

export const SidebarCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = React.useMemo(() => new SidebarCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactSidebarCx.Provider value={cx}>{children}</ReactSidebarCx.Provider>;
};

export function useSidebarCx(): SidebarCx {
	const cx = React.useContext(ReactSidebarCx);
	if (cx == null) {
		throw new Error('useSidebarCx must be used within a SidebarCxProvider');
	}
	return cx;
}
