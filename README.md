<p align="center">
  <a href="https://abstand.app/">
    <img
      alt="Abstand is a macOS app for building intentional distance from distractions."
      src="./.github/assets/logo.svg"
      width="200"
      height="200"
    >
  </a>
</p>

<h3 align="center">Abstand <i>by <a href="https://builder.group/">builder.group</a></i></h3>

<p align="center">
  Intentional distance for focused work.
  <br />
  A macOS app for holding the boundaries around your attention.
  <br />
  <a href="https://abstand.app/"><strong>Learn more »</strong></a>
  <br />
  <br />
  <a href="#introduction"><strong>Introduction</strong></a> ·
  <a href="#how-it-works"><strong>How it works</strong></a> ·
  <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
  <a href="#license"><strong>License</strong></a>
</p>

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-AGPL%20v3-blue.svg" alt="GNU AGPL v3" />
  </a>
  <a href="https://discord.com/invite/w4xE3bSjhQ">
    <img src="https://img.shields.io/discord/795291052897992724.svg?label=&logo=discord&logoColor=ffffff&color=293140&labelColor=3377FF" alt="Join Discord" />
  </a>
</p>

<br />

## Introduction

Your attention is like a river. Concentrated, it moves with power. Branched across tabs, apps, and notifications, it spreads thin. You feel busy. Nothing moves.

**Abstand** is a macOS app that builds the banks. You define your boundaries in advance, when you are clear-headed. The app holds them when it matters, so you do not have to make the hard decision again in the moment of temptation.

The word is German for distance. That is exactly what it creates.

## How it works

**Intentions** are configured commitments. You set when they start, when they end, and what kind of distance they enforce. When an Intention fires, you take an **Abstand**: the active experience of intentional distance.

- **Block** builds a hard wall. Configured apps and websites are inaccessible for the full duration. For a complete lockdown, the entire computer can be blocked behind a full-screen overlay.
- **Break** (coming soon): a rhythm of screen breaks at regular intervals, pulling your attention away from the screen before resuming.

## Tech Stack

- **Frontend:** React, TypeScript, TanStack Router, Vite, Tailwind CSS
- **Desktop Runtime:** Tauri
- **Native/Core:** Rust
- **Tools:** pnpm, Turborepo, ESLint, Prettier, Vitest

## License

Abstand is open source under the **GNU Affero General Public License v3.0 (AGPL v3)**.

See [LICENSE](./LICENSE) for the full license text and [docs/decisions/license.md](./docs/decisions/license.md) for the reasoning behind this choice.
