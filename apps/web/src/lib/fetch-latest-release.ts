import { appConfig, fetchClient } from '@/environment';

export async function fetchLatestRelease(): Promise<TReleaseInfo> {
	const [isReleaseOk, , release] = await fetchClient.get<TGitHubRelease>(
		`${appConfig.githubApi}/releases/latest`,
		{
			headers: { Accept: 'application/vnd.github.v3+json' }
		}
	);
	if (!isReleaseOk) {
		return {
			version: null,
			downloadLinks: {}
		};
	}

	return {
		version: release.tag_name,
		downloadLinks: getMacDownloadLinks(release.assets ?? [])
	};
}

export interface TReleaseInfo {
	version: string | null;
	downloadLinks: TMacDownloadLinks;
}

interface TMacDownloadLinks {
	macAppleSilicon?: string;
	macIntel?: string;
}

interface TGitHubRelease {
	tag_name: string;
	assets: { name: string; browser_download_url: string }[];
}

function getMacDownloadLinks(assets: TGitHubRelease['assets']): TMacDownloadLinks {
	const links: TMacDownloadLinks = {};

	for (const { name: rawName, browser_download_url: url } of assets) {
		const name = rawName.toLowerCase();

		if (!name.endsWith('.dmg')) {
			continue;
		}

		if (name.includes('aarch64') || name.includes('arm64')) {
			links.macAppleSilicon = url;
			continue;
		}

		if (name.includes('x64') || name.includes('x86_64')) {
			links.macIntel = url;
		}
	}

	return links;
}
