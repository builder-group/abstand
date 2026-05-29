#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const desktopDir = resolve(dirname(scriptPath), '..');
const tauriDir = join(desktopDir, 'src-tauri');
const schemaPath = join(tauriDir, 'src/modules/db/schema.sql');
const migrationsDir = join(tauriDir, 'migrations');
const atlasDevUrl = 'sqlite://dev?mode=memory';

// Note: Atlas Community Edition owns table/index diffing here; this wrapper owns triggers and rejects everything else

main(process.argv.slice(2));

// MARK: - Command Dispatch

function main([command, ...args]) {
	try {
		dispatchCommand(command, args);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}

function dispatchCommand(command, args) {
	switch (command) {
		case 'migrate':
			migrateCommand(args);
			return;
		case 'check':
			checkCommand(args);
			return;
		case 'inspect':
			inspectCommand(args);
			return;
		default:
			printUsage();
			process.exitCode = 1;
	}
}

function printUsage() {
	console.error(
		[
			`Usage: node ${basename(scriptPath)} <command>`,
			'',
			'Commands:',
			'  migrate <name>  Generate an Atlas migration and append trigger changes',
			'  check           Verify migrations match schema.sql',
			'  inspect [args]  Inspect the Atlas-managed schema objects'
		].join('\n')
	);
}

// MARK: - Migrate Command

function migrateCommand(args) {
	const name = migrationNameFromArgs(args);
	ensureMigrationDir();

	const migrationFilesBeforeAtlas = new Set(migrationFiles());
	withTempSchemaWorkspace((temp) => {
		assertOnlySupportedSchemaObjects(temp.desiredDbPath, schemaPath);

		const configPath = writeAtlasConfig(temp.atlasManagedSchemaPath, temp.dir);
		const atlasArgs = [
			'migrate',
			'diff',
			'--config',
			fileUrl(configPath),
			'--env',
			'local',
			name
		];
		run('atlas', atlasArgs, { cwd: tauriDir });

		const afterAtlas = migrationFiles();
		const atlasCreatedMigrationFiles = afterAtlas.filter(
			(file) => !migrationFilesBeforeAtlas.has(file)
		);
		const currentDbPath = join(temp.dir, 'current.db');
		buildCurrentDbFromMigrations(currentDbPath);
		assertOnlySupportedSchemaObjects(currentDbPath, migrationsDir);

		const triggerChanges = diffTriggers(
			readTriggers(currentDbPath),
			readTriggers(temp.desiredDbPath)
		);
		if (triggerChanges.length > 0) {
			const migrationFile = migrationFileForTriggerChanges(atlasCreatedMigrationFiles, name);
			appendTriggerChanges(join(migrationsDir, migrationFile), triggerChanges);
			run('atlas', ['migrate', 'hash', '--dir', fileUrl(migrationsDir)], { cwd: tauriDir });
		}
	});
	checkCommand();
}

function migrationNameFromArgs(args) {
	if (args.length !== 1) {
		throw new Error('Usage: pnpm db:migrate <name>');
	}

	const name = normalizeMigrationName(args[0]);
	if (!/[a-z]/u.test(name)) {
		throw new Error('Migration name must contain at least one letter.');
	}
	return name;
}

function writeAtlasConfig(atlasManagedSchemaPath, tempDir) {
	const configPath = join(tempDir, 'atlas.hcl');
	writeFileSync(
		configPath,
		[
			'env "local" {',
			`  src = ${JSON.stringify(fileUrl(atlasManagedSchemaPath))}`,
			`  dev = ${JSON.stringify(atlasDevUrl)}`,
			'',
			'  migration {',
			`    dir = ${JSON.stringify(fileUrl(migrationsDir))}`,
			'  }',
			'}',
			''
		].join('\n')
	);
	return configPath;
}

function migrationFileForTriggerChanges(atlasCreatedMigrationFiles, name) {
	if (atlasCreatedMigrationFiles.length > 1) {
		throw new Error(
			`Atlas created multiple migration files unexpectedly:\n${atlasCreatedMigrationFiles.join('\n')}`
		);
	}

	return atlasCreatedMigrationFiles[0] ?? createTriggerMigration(name);
}

function appendTriggerChanges(filePath, changes) {
	const drops = changes.filter(shouldDropTrigger);
	const creates = changes.filter(shouldCreateTrigger);
	const sql = [
		'',
		'-- Trigger changes',
		...drops.flatMap((change) => [
			`-- Drop trigger "${change.name}"`,
			`DROP TRIGGER IF EXISTS ${quoteIdentifier(change.name)};`
		]),
		...creates.flatMap((change) => [
			`-- Create trigger "${change.name}"`,
			endSql(change.desired.sql)
		]),
		''
	].join('\n');
	const current = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
	const separator = current === '' || current.endsWith('\n') ? '' : '\n';
	writeFileSync(filePath, `${current}${separator}${sql}`);
}

function shouldDropTrigger(change) {
	return change.type === 'drop' || change.type === 'replace';
}

function shouldCreateTrigger(change) {
	return change.type === 'create' || change.type === 'replace';
}

function createTriggerMigration(name) {
	const fileName = `${timestamp()}_${name}.sql`;
	writeFileSync(join(migrationsDir, fileName), '');
	return fileName;
}

function quoteIdentifier(value) {
	return `"${value.replaceAll('"', '""')}"`;
}

function normalizeMigrationName(value) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]+/gu, '_')
		.replace(/^_+|_+$/gu, '');
}

function timestamp() {
	const now = new Date();
	const parts = [
		now.getFullYear(),
		now.getMonth() + 1,
		now.getDate(),
		now.getHours(),
		now.getMinutes(),
		now.getSeconds()
	];
	return parts.map((part) => String(part).padStart(2, '0')).join('');
}

// MARK: - Check Command

function checkCommand(args = []) {
	if (args.length > 0) {
		throw new Error('Usage: pnpm db:check');
	}

	ensureMigrationDir();

	withTempSchemaWorkspace((temp) => {
		const currentDbPath = join(temp.dir, 'current.db');
		buildCurrentDbFromMigrations(currentDbPath);
		assertOnlySupportedSchemaObjects(temp.desiredDbPath, schemaPath);
		assertOnlySupportedSchemaObjects(currentDbPath, migrationsDir);

		const atlasManagedDiff = run(
			'atlas',
			[
				'schema',
				'diff',
				'--from',
				sqliteUrl(currentDbPath),
				'--to',
				fileUrl(temp.atlasManagedSchemaPath),
				'--dev-url',
				atlasDevUrl,
				'--format',
				'{{ sql . }}'
			],
			{ cwd: tauriDir, captureOutput: true }
		).trim();
		if (atlasManagedDiff !== '') {
			throw new Error(`Schema objects managed by Atlas are out of sync:\n\n${atlasManagedDiff}`);
		}

		const triggerChanges = diffTriggers(
			readTriggers(currentDbPath),
			readTriggers(temp.desiredDbPath)
		);
		if (triggerChanges.length > 0) {
			throw new Error(`Triggers are out of sync:\n\n${formatTriggerChanges(triggerChanges)}`);
		}

		console.log('Database schema is in sync.');
	});
}

function formatTriggerChanges(changes) {
	return changes
		.map((change) => {
			switch (change.type) {
				case 'create':
					return `create ${change.name}`;
				case 'drop':
					return `drop ${change.name}`;
				case 'replace':
					return `replace ${change.name}`;
				default:
					return change.name;
			}
		})
		.join('\n');
}

// MARK: - Inspect Command

function inspectCommand(inspectArgs) {
	withTempSchemaWorkspace((temp) => {
		assertOnlySupportedSchemaObjects(temp.desiredDbPath, schemaPath);
		run(
			'atlas',
			[
				'schema',
				'inspect',
				'--url',
				fileUrl(temp.atlasManagedSchemaPath),
				'--dev-url',
				atlasDevUrl,
				...inspectArgs
			],
			{ cwd: tauriDir }
		);
	});
}

// MARK: - Temporary Schema Workspace

function withTempSchemaWorkspace(callback) {
	const temp = prepareTempSchemaWorkspace();
	try {
		return callback(temp);
	} finally {
		cleanupTempSchemaWorkspace(temp);
	}
}

function prepareTempSchemaWorkspace() {
	const dir = mkdtempSync(join(tmpdir(), 'abstand-db-'));
	const desiredDbPath = join(dir, 'desired.db');
	const atlasManagedSchemaPath = join(dir, 'schema.atlas.sql');

	try {
		buildDbFromSql(desiredDbPath, readFileSync(schemaPath, 'utf8'));
		writeAtlasManagedSchema(desiredDbPath, atlasManagedSchemaPath);
		return { atlasManagedSchemaPath, desiredDbPath, dir };
	} catch (error) {
		rmSync(dir, { force: true, recursive: true });
		throw error;
	}
}

function cleanupTempSchemaWorkspace(temp) {
	rmSync(temp.dir, { force: true, recursive: true });
}

function writeAtlasManagedSchema(dbPath, outputPath) {
	// Let SQLite parse schema.sql first so this file avoids SQL regex stripping
	const rows = queryJson(
		dbPath,
		`
		SELECT sql
		FROM sqlite_schema
		WHERE sql IS NOT NULL
			AND type IN ('table', 'index')
			AND name NOT LIKE 'sqlite_%'
		ORDER BY
			CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END,
			name;
	`
	);
	const sql = rows.map((row) => endSql(row.sql)).join('\n\n');
	writeFileSync(outputPath, `${sql}\n`);
}

// MARK: - Database Materialization

function buildCurrentDbFromMigrations(dbPath) {
	const sql = migrationFiles()
		.map((file) => readFileSync(join(migrationsDir, file), 'utf8'))
		.join('\n\n');
	buildDbFromSql(dbPath, sql);
}

function buildDbFromSql(dbPath, sql) {
	// Note: SQLite permits cyclic schema creation only when FK enforcement is disabled
	run('sqlite3', ['-batch', '-bail', dbPath], {
		captureOutput: true,
		input: `PRAGMA foreign_keys = off;\n${sql}\n`
	});
}

function assertOnlySupportedSchemaObjects(dbPath, label) {
	const unsupported = readUnsupportedSchemaObjects(dbPath);
	if (unsupported.length === 0) {
		return;
	}

	const formatted = unsupported.map((object) => `${object.type}: ${object.name}`).join('\n');
	throw new Error(
		[
			`${label} contains schema objects this wrapper does not handle yet:`,
			'',
			formatted,
			'',
			'Add comparison support to scripts/db-schema.mjs before using these objects in migrations.'
		].join('\n')
	);
}

function readUnsupportedSchemaObjects(dbPath) {
	return queryJson(
		dbPath,
		`
		SELECT type, name
		FROM sqlite_schema
		WHERE sql IS NOT NULL
			AND name NOT LIKE 'sqlite_%'
			AND (
				type NOT IN ('table', 'index', 'trigger')
				OR (
					type = 'table'
					AND lower(sql) LIKE 'create virtual table%'
				)
			)
		ORDER BY type, rowid;
	`
	);
}

// MARK: - Trigger Diff

function diffTriggers(current, desired) {
	const changes = [];
	for (const [name, currentTrigger] of current) {
		if (!desired.has(name)) {
			changes.push({ current: currentTrigger, desired: null, name, type: 'drop' });
		}
	}

	// Note: SQLite does not promise ordering for same-event triggers, so create in schema order
	for (const [name, desiredTrigger] of desired) {
		const currentTrigger = current.get(name);
		if (currentTrigger == null) {
			changes.push({ current: null, desired: desiredTrigger, name, type: 'create' });
			continue;
		}
		if (normalizeTriggerSql(currentTrigger.sql) !== normalizeTriggerSql(desiredTrigger.sql)) {
			changes.push({ current: currentTrigger, desired: desiredTrigger, name, type: 'replace' });
		}
	}
	return changes;
}

function readTriggers(dbPath) {
	const rows = queryJson(
		dbPath,
		`
		SELECT name, sql
		FROM sqlite_schema
		WHERE type = 'trigger'
		ORDER BY rowid;
	`
	);
	return new Map(rows.map((row) => [row.name, row]));
}

function normalizeTriggerSql(sql) {
	// Note: Atlas and SQLite can preserve equivalent trigger SQL with different whitespace or quotes
	return sql
		.trim()
		.replace(/;+\s*$/u, '')
		.replace(/[`"]([A-Za-z_][A-Za-z0-9_]*)[`"]/gu, '$1')
		.replace(/\s+/gu, ' ')
		.trim();
}

// MARK: - SQLite Utilities

function queryJson(dbPath, sql) {
	const output = run('sqlite3', ['-batch', '-json', dbPath, sql], { captureOutput: true });
	return output.trim() === '' ? [] : JSON.parse(output);
}

function endSql(sql) {
	const trimmed = sql.trim().replace(/;+\s*$/u, '');
	return `${trimmed};`;
}

function sqliteUrl(dbPath) {
	return `sqlite://${dbPath}`;
}

// MARK: - File and Process Utilities

function migrationFiles() {
	if (!existsSync(migrationsDir)) {
		return [];
	}
	return readdirSync(migrationsDir)
		.filter((file) => file.endsWith('.sql'))
		.sort();
}

function ensureMigrationDir() {
	mkdirSync(migrationsDir, { recursive: true });
}

function run(cmd, cmdArgs, options = {}) {
	const shouldCaptureOutput = options.captureOutput === true;
	const result = spawnSync(cmd, cmdArgs, {
		cwd: options.cwd,
		encoding: 'utf8',
		input: options.input,
		stdio: shouldCaptureOutput ? 'pipe' : 'inherit'
	});
	if (result.error != null) {
		if (result.error.code === 'ENOENT') {
			throw new Error(`Required command not found: ${cmd}`);
		}
		throw result.error;
	}
	if (result.status !== 0) {
		const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
		throw new Error(details === '' ? `${cmd} failed with exit code ${result.status}` : details);
	}
	return result.stdout ?? '';
}

function fileUrl(filePath) {
	return pathToFileURL(filePath).href;
}
