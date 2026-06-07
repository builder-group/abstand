# GitHub Actions

This directory contains the desktop build pipeline for Abstand.

## Workflows

### `pr.yml`

Runs CI when a pull request opens or updates:

- Install pnpm dependencies
- Build workspace dependencies for `apps/desktop`
- Run desktop lint, configured package build (`ui:build`), and test scripts

### `develop.yml`

Runs CI and macOS desktop builds on pushes to `develop`. It can also run manually from the Actions tab.

The build matrix creates artifacts for:

- macOS Apple Silicon (`aarch64-apple-darwin`)
- macOS Intel (`x86_64-apple-darwin`)

The macOS build uses explicit runner labels, scopes signing secrets to the signing steps, clears stale bundle outputs before building, and verifies signed artifacts before upload.

The build job uses the `release-signing` GitHub Environment so signing secrets can be scoped and audited separately from ordinary CI.

The workflow uploads signed DMG artifacts and updater bundles through `actions/upload-artifact`.

It does not bump versions, push tags, create GitHub releases, or generate updater metadata.

## Actions

- `setup-pnpm`: installs pnpm, Node.js 24, pnpm cache, and frozen dependencies
- `setup-rust`: installs the pinned Rust toolchain from `rust-toolchain.toml` and restores the Cargo workspace cache
- `ci`: resolves the package from `app-directory`, builds workspace dependencies, then runs lint, a configurable package build script, and tests
- `build-tauri-macos`: builds signed macOS distribution and updater artifacts

## Updater Artifacts

The production Tauri config enables `createUpdaterArtifacts`, so macOS builds produce `.app.tar.gz` updater bundles and `.sig` files next to the DMG. The app still needs updater runtime code, public key configuration, and release metadata before users can receive updates.

## Signing

macOS builds require Apple signing secrets and a Tauri updater signing key. Add these secrets to the `release-signing` environment under Settings -> Environments:

| Secret                               | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `APPLE_CERTIFICATE`                  | Base64-encoded Developer ID Application `.p12`       |
| `APPLE_CERTIFICATE_PASSWORD`         | Password used when exporting the `.p12`              |
| `APPLE_ID`                           | Apple ID email                                       |
| `APPLE_PASSWORD`                     | App-specific password                                |
| `APPLE_TEAM_ID`                      | Apple team ID                                        |
| `TAURI_SIGNING_PRIVATE_KEY`          | Tauri updater private key contents                   |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the updater private key, if one was set |

`APPLE_SIGNING_IDENTITY` is intentionally omitted. Tauri infers the signing identity from `APPLE_CERTIFICATE`; add it only if inference fails or the certificate bundle contains multiple usable identities.

## Local Checks

Run the same package checks locally:

```bash
pnpm --filter @repo/desktop lint
pnpm --filter @repo/desktop ui:build
pnpm --filter @repo/desktop test
```

Run a production Tauri build locally:

```bash
pnpm --filter @repo/desktop build:prod
```

The local production build needs the same Apple and Tauri signing environment variables as CI when you want signed, notarized distribution artifacts.

Rust uses the repo-root `rust-toolchain.toml`, so local Rust commands and CI use the same compiler version and macOS targets.
