import React from 'react';

let cachedPlatformInfo: TPlatformInfo | null = null;

export function useDetectPlatform(): TPlatformInfo {
	return React.useSyncExternalStore(
		() => {
			return () => {};
		},
		() => {
			if (cachedPlatformInfo == null) {
				cachedPlatformInfo = detectPlatform();
			}

			return cachedPlatformInfo;
		},
		() => unknownPlatformInfo
	);
}

export type TPlatformInfo = TMacosPlatformInfo | TOtherPlatformInfo;

export interface TMacosPlatformInfo {
	platform: 'macos';
	macArchitecture: TMacArchitecture;
}

interface TOtherPlatformInfo {
	platform: 'windows' | 'linux' | null;
}

export type TMacArchitecture = 'apple-silicon' | 'intel' | null;

function detectPlatform(): TPlatformInfo {
	if (typeof navigator === 'undefined') {
		return unknownPlatformInfo;
	}

	const platform = detectOS();
	if (platform === 'macos') {
		return { platform, macArchitecture: detectMacArchitecture() };
	}

	return {
		platform
	};
}

const unknownPlatformInfo: TPlatformInfo = { platform: null };

function detectOS(): TPlatformInfo['platform'] {
	const userAgent = navigator.userAgent;
	const isDesktopMac = userAgent.includes('Mac') && navigator.maxTouchPoints <= 1;

	if (isDesktopMac) {
		return 'macos';
	}
	if (userAgent.includes('Windows')) {
		return 'windows';
	}
	if (userAgent.includes('Linux')) {
		return 'linux';
	}

	return null;
}

// Note: Detects Mac architecture via WebGL renderer string when browsers expose it
function detectMacArchitecture(): TMacArchitecture {
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl');
		if (gl == null) {
			return null;
		}

		const extension = gl.getExtension('WEBGL_debug_renderer_info');
		if (extension == null) {
			return null;
		}

		const renderer = (gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) as string).toLowerCase();
		if (renderer.includes('intel')) {
			return 'intel';
		}
		if (renderer.includes('apple')) {
			return 'apple-silicon';
		}
	} catch {
		// do nothing
	}

	return null;
}
