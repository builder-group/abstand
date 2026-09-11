import React from 'react';

export function useWindowFocused(): boolean {
	return React.useSyncExternalStore(
		subscribeWindowFocused,
		getWindowFocused,
		getServerWindowFocused
	);
}

function subscribeWindowFocused(onStoreChange: () => void): () => void {
	if (typeof window === 'undefined') return () => {};

	window.addEventListener('focus', onStoreChange);
	window.addEventListener('blur', onStoreChange);
	return () => {
		window.removeEventListener('focus', onStoreChange);
		window.removeEventListener('blur', onStoreChange);
	};
}

function getWindowFocused(): boolean {
	if (typeof document === 'undefined') {
		return true;
	}

	return document.hasFocus();
}

function getServerWindowFocused(): boolean {
	return true;
}
