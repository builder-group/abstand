import fs from 'node:fs';
import path from 'node:path';

const appDirectory = requiredEnv('APP_DIRECTORY');
const channel = requiredEnv('CHANNEL');
const versionBump = requiredEnv('VERSION_BUMP');
const githubOutput = requiredEnv('GITHUB_OUTPUT');

const currentVersion = readCurrentVersion(appDirectory);
const nextVersion = resolveReleaseVersion(currentVersion, channel, versionBump);
const tag = `v${nextVersion}`;
const versionChanged = String(currentVersion !== nextVersion);

console.log(`Release channel: ${channel}`);
console.log(`Version bump: ${versionBump}`);
console.log(`Current version: ${currentVersion}`);
console.log(`Resolved version: ${nextVersion}`);
console.log(`Resolved tag: ${tag}`);
console.log(`Version changed: ${versionChanged}`);

appendOutput('current-version', currentVersion);
appendOutput('next-version', nextVersion);
appendOutput('tag', tag);
appendOutput('version-changed', versionChanged);

function readCurrentVersion(directory) {
	const packageJsonPath = path.join(directory, 'package.json');
	const currentVersion = readPackageJson(packageJsonPath).version;

	if (!currentVersion) {
		fail(`Expected ${packageJsonPath} to contain a version.`);
	}

	return currentVersion;
}

function resolveReleaseVersion(version, releaseChannel, bump) {
	const current = parseVersion(version);

	switch (releaseChannel) {
		case 'draft':
			return resolveDraftVersion(version, bump);
		case 'beta':
			return resolveBetaVersion(version, current, bump);
		case 'stable':
			return resolveStableVersion(version, current, bump);
		default:
			fail(`Unsupported release channel: ${releaseChannel}`);
	}
}

function resolveDraftVersion(version, bump) {
	if (bump !== 'none') {
		fail('Draft releases must use no version bump.');
	}

	return version;
}

function resolveBetaVersion(version, current, bump) {
	if (bump === 'none') {
		const beta = parseBetaVersion(version);

		if (beta == null) {
			fail('Beta releases without a version bump require the current version to be x.y.z-beta.N.');
		}

		return `${beta.major}.${beta.minor}.${beta.patch}-beta.${beta.betaNumber + 1}`;
	}

	return `${bumpVersion(current, bump)}-beta.1`;
}

function resolveStableVersion(version, current, bump) {
	if (bump === 'none') {
		const beta = parseBetaVersion(version);

		if (beta == null) {
			fail(
				'Stable releases require a patch or minor version bump unless the current version is x.y.z-beta.N.'
			);
		}

		// Note: stable + none promotes the tested beta line instead of bumping past it
		return formatVersion(beta);
	}

	return bumpVersion(current, bump);
}

function bumpVersion(version, bump) {
	switch (bump) {
		case 'patch':
			return formatVersion({
				major: version.major,
				minor: version.minor,
				patch: version.patch + 1
			});
		case 'minor':
			return formatVersion({
				major: version.major,
				minor: version.minor + 1,
				patch: 0
			});
		default:
			fail(`Unsupported version bump: ${bump}`);
	}
}

function parseVersion(version) {
	const match = version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-[0-9A-Za-z.-]+)?$/);

	if (match == null) {
		fail(`Expected SemVer app version, got: ${version}`);
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3])
	};
}

function parseBetaVersion(version) {
	const match = version.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)-beta\.([0-9]+)$/);

	if (match == null) {
		return null;
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		betaNumber: Number(match[4])
	};
}

function formatVersion(version) {
	return `${version.major}.${version.minor}.${version.patch}`;
}

// MARK: - Action IO

function readPackageJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function appendOutput(name, value) {
	fs.appendFileSync(githubOutput, `${name}=${value}\n`);
}

function requiredEnv(name) {
	const value = process.env[name];

	if (value == null || value === '') {
		fail(`Expected ${name} to be set.`);
	}

	return value;
}

function fail(message) {
	console.error(message);
	process.exit(1);
}
