# GitHub Actions

This directory contains GitHub workflows, composite actions, release secret references, and repository assets.

## Workflows

### `pr.yml`

Runs on pull request open, update, and reopen events.

Runs desktop package checks before merge.

### `develop.yml`

Runs on pushes to `develop` and from manual dispatch.

Runs desktop package checks on the main branch. Release artifacts are built only by `release.yml`.

### `release.yml`

Runs from manual dispatch and requires the selected ref to be `develop`.

Runs CI first, then builds both macOS targets:

- `aarch64-apple-darwin` on `macos-26`
- `x86_64-apple-darwin` on `macos-26-intel`

Release builds use macOS 26 runners because the native desktop bridge type-checks macOS 26 AppKit symbols. Runtime availability guards keep fallback behavior available on older supported macOS versions.

Release builds upload:

- `.dmg` installers
- `.app.tar.gz` updater bundles
- `.app.tar.gz.sig` updater signatures

The workflow verifies signed apps and DMGs before upload. Updater bundles and signatures are part of the release artifact set.

Release secrets are listed in `.secrets.template` and live in Settings -> Environments -> `release-signing`:

| Secret                               | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `APPLE_CERTIFICATE`                  | Base64-encoded Developer ID Application `.p12` |
| `APPLE_CERTIFICATE_PASSWORD`         | Password used when exporting the `.p12`        |
| `APPLE_ID`                           | Apple ID email                                 |
| `APPLE_PASSWORD`                     | App-specific password                          |
| `APPLE_TEAM_ID`                      | Apple team ID                                  |
| `TAURI_SIGNING_PRIVATE_KEY`          | Tauri updater private key contents             |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the updater key, if one was set   |

`APPLE_SIGNING_IDENTITY` is intentionally omitted. Tauri infers the signing identity from `APPLE_CERTIFICATE`; add it only if inference fails or the certificate bundle contains multiple usable identities.

## Actions

### `setup-pnpm`

Sets up Node, pnpm, dependency install, and the pnpm cache.

### `setup-rust`

Sets up the Rust toolchain from `rust-toolchain.toml` and restores the Cargo workspace cache.

### `ci`

Resolves the package from `app-directory`, builds workspace dependencies, then runs lint, the configured build script, and tests.

Desktop CI passes `ui:build` because `apps/desktop` reserves `build` for the full Tauri production build.

### `build-tauri-macos`

Builds one signed macOS target and verifies the produced artifacts.

It validates signing inputs before Tauri starts, clears stale final bundle output, runs `pnpm tauri build` with the production Tauri config, notarizes and staples DMGs, then collects DMGs, updater bundles, and updater signatures for upload.
