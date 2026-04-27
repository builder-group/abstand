import React from 'react';

export class NewIntentionCx {
	public mount(): () => void {
		return () => {};
	}
}

const ReactNewIntentionCx = React.createContext<NewIntentionCx | null>(null);

export const NewIntentionCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = React.useMemo(() => new NewIntentionCx(), []);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	return <ReactNewIntentionCx.Provider value={cx}>{children}</ReactNewIntentionCx.Provider>;
};

export function useNewIntentionCx(): NewIntentionCx {
	const cx = React.useContext(ReactNewIntentionCx);
	if (cx == null) {
		throw new Error('useNewIntentionCx must be used within a NewIntentionCxProvider');
	}
	return cx;
}
