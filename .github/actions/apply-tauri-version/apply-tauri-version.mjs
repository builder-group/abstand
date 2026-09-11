import fs from 'node:fs';
import path from 'node:path';

const appDirectory = requiredEnv('APP_DIRECTORY');
const targetVersion = requiredEnv('VERSION');
const githubOutput = requiredEnv('GITHUB_OUTPUT');

if (!targetVersion.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-[0-9A-Za-z.-]+)?$/)) {
	fail(`Expected SemVer version, got: ${targetVersion}`);
}

const versionFiles = resolveVersionFiles(appDirectory);
const before = snapshotFiles(versionFiles.trackedFiles);

applyVersion(versionFiles, targetVersion);
validateVersionFiles(versionFiles, targetVersion);

const after = snapshotFiles(versionFiles.trackedFiles);
const changedFiles = versionFiles.trackedFiles.filter(
	(file) => before.get(file) !== after.get(file)
);

console.log(`Applied Tauri version: ${targetVersion}`);
console.log(`Changed files: ${changedFiles.length === 0 ? 'none' : changedFiles.join(', ')}`);

appendOutput('changed', String(changedFiles.length > 0));
appendOutput('changed-files', JSON.stringify(changedFiles));

function resolveVersionFiles(directory) {
	const packageJson = path.join(directory, 'package.json');
	const cargoToml = path.join(directory, 'src-tauri', 'Cargo.toml');
	const cargoPackageName = readCargoPackageName(cargoToml);
	const trackedFiles = [packageJson, cargoToml];

	if (fs.existsSync('Cargo.lock')) {
		trackedFiles.push('Cargo.lock');
	}

	return {
		packageJson,
		cargoToml,
		cargoPackageName,
		trackedFiles
	};
}

function applyVersion(files, nextVersion) {
	updatePackageJsonVersion(files.packageJson, nextVersion);
	updateCargoTomlVersion(files.cargoToml, nextVersion);
	updateCargoLock(files.cargoPackageName, nextVersion);
}

function validateVersionFiles(files, nextVersion) {
	validatePackageJsonVersion(files.packageJson, nextVersion);
	validateCargoTomlVersion(files.cargoToml, nextVersion);
	validateCargoLockVersion(files.cargoPackageName, nextVersion);
}

function snapshotFiles(files) {
	return new Map(files.map((file) => [file, fs.readFileSync(file, 'utf8')]));
}

// MARK: - package.json

function updatePackageJsonVersion(file, nextVersion) {
	const packageJson = readPackageJson(file);
	packageJson.version = nextVersion;
	fs.writeFileSync(file, `${JSON.stringify(packageJson, null, '\t')}\n`);
}

function validatePackageJsonVersion(file, nextVersion) {
	if (readPackageJson(file).version !== nextVersion) {
		fail(`Expected ${file} version to be ${nextVersion}.`);
	}
}

function readPackageJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// MARK: - Cargo.toml

function updateCargoTomlVersion(file, nextVersion) {
	const cargoPackage = readCargoPackage(file);
	const versionMatch = cargoPackage.section.match(/^version\s*=\s*"([^"]+)"/m);

	if (versionMatch == null) {
		fail(`Expected package version in ${file}.`);
	}

	if (versionMatch[1] !== nextVersion) {
		const updatedSection = cargoPackage.section.replace(
			/(^version\s*=\s*)"[^"]+"/m,
			`$1"${nextVersion}"`
		);
		const updated = [
			cargoPackage.content.slice(0, cargoPackage.start),
			updatedSection,
			cargoPackage.content.slice(cargoPackage.end)
		].join('');

		fs.writeFileSync(file, updated);
	}
}

function validateCargoTomlVersion(file, nextVersion) {
	const cargoPackage = readCargoPackage(file);
	const match = cargoPackage.section.match(/^version\s*=\s*"([^"]+)"/m);

	if (match == null || match[1] !== nextVersion) {
		fail(`Expected ${file} version to be ${nextVersion}.`);
	}
}

function readCargoPackageName(file) {
	const cargoPackage = readCargoPackage(file);
	const match = cargoPackage.section.match(/^name\s*=\s*"([^"]+)"/m);

	if (match == null) {
		fail(`Expected package name in ${file}.`);
	}

	return match[1];
}

function readCargoPackage(file) {
	const content = fs.readFileSync(file, 'utf8');
	const marker = '[package]\n';
	const start = content.indexOf(marker);

	if (start === -1) {
		fail(`Expected [package] section in ${file}.`);
	}

	const sectionBodyStart = start + marker.length;
	const rest = content.slice(sectionBodyStart);
	const nextSectionOffset = rest.search(/^\[/m);
	const end = nextSectionOffset === -1 ? content.length : sectionBodyStart + nextSectionOffset;

	return {
		content,
		start,
		end,
		section: content.slice(start, end)
	};
}

// MARK: - Cargo.lock

function updateCargoLock(packageName, nextVersion) {
	const lockPath = 'Cargo.lock';

	if (!fs.existsSync(lockPath)) {
		return;
	}

	const lockContent = fs.readFileSync(lockPath, 'utf8');
	const sections = lockContent.split(/(?=^\[\[package\]\]\n)/m);
	const updatedLock = sections
		.map((section) => updateCargoLockSection(section, packageName, nextVersion))
		.join('');

	if (updatedLock !== lockContent) {
		fs.writeFileSync(lockPath, updatedLock);
	}
}

function updateCargoLockSection(section, packageName, nextVersion) {
	const nameMatch = section.match(/^name\s*=\s*"([^"]+)"/m);

	if (nameMatch == null || nameMatch[1] !== packageName) {
		return section;
	}

	return section.replace(/^version\s*=\s*"[^"]+"/m, `version = "${nextVersion}"`);
}

function validateCargoLockVersion(packageName, nextVersion) {
	const lockPath = 'Cargo.lock';

	if (!fs.existsSync(lockPath)) {
		return;
	}

	const lockSections = fs.readFileSync(lockPath, 'utf8').split(/(?=^\[\[package\]\]\n)/m);
	const escapedVersion = escapeRegExp(nextVersion);

	const section = lockSections.find((candidate) => {
		return candidate.match(/^name\s*=\s*"([^"]+)"/m)?.[1] === packageName;
	});

	if (section == null || !section.match(new RegExp(`^version\\s*=\\s*"${escapedVersion}"`, 'm'))) {
		fail(`Expected Cargo.lock package ${packageName} to be ${nextVersion}.`);
	}
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// MARK: - Action IO

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
