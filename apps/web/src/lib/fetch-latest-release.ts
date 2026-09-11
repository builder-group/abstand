import { appConfig, fetchClient } from '@/environment';

export async function fetchLatestRelease(): Promise<TReleaseInfo> {
	const [isLatestReleaseOk, , latestRelease] = await fetchClient.get<TGitHubRelease>(
		`${appConfig.githubApi}/releases/latest`,
		{
			headers: { Accept: 'application/vnd.github.v3+json' }
		}
	);
	if (isLatestReleaseOk) {
		return {
			version: latestRelease.tag_name,
			downloadLinks: getMacDownloadLinks(latestRelease.assets ?? [])
		};
	}

	// Note: /releases/latest can 504 while the /releases list still works
	const [areReleasesOk, , releases] = await fetchClient.get<TGitHubRelease[]>(
		`${appConfig.githubApi}/releases?per_page=10`,
		{
			headers: { Accept: 'application/vnd.github.v3+json' }
		}
	);
	if (!areReleasesOk) {
		return {
			version: null,
			downloadLinks: {}
		};
	}

	const release = releases.find(({ draft, prerelease }) => !draft && !prerelease);
	if (release == null) {
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
	draft: boolean;
	prerelease: boolean;
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
