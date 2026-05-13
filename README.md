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
    <img src="https://img.shields.io/badge/License-Elastic%20License%202.0-blue.svg" alt="Elastic License 2.0" />
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

**Intentions** are configured commitments. You set when they start, when they end, and how they enforce your focus. When an Intention fires, you take an **Abstand**: the active experience of intentional distance.

Two behaviors are available:

- **Block** builds a hard wall. Configured apps and websites are inaccessible for the full duration. For a complete lockdown, the entire computer can be blocked behind a full-screen overlay.
- **Break** creates a rhythm of breaks. A full-screen overlay fires at regular intervals, pulling your attention away from the screen before resuming.

Intentions are organized into **Profiles** in the sidebar, so you can build out your full day: a hard block overnight, selective blocking during morning focus hours, breaks during the workday.

## Tech Stack

- **Frontend:** React, TypeScript, TanStack Router, Vite, Tailwind CSS
- **Desktop Runtime:** Tauri
- **Native/Core:** Rust
- **Tools:** pnpm, Turborepo, ESLint, Prettier, Vitest

## License

Abstand is source-available under the **Elastic License 2.0 (ELv2)**.

You may inspect, build, modify, and redistribute the software under the license terms. Redistributed versions must preserve the license-key functionality, protected functionality, copyright notices, and license notices required by ELv2.

Abstand is not OSI open source. The license is intended to allow private modifications and community builds while keeping protected functionality tied to the license-key system.

See [LICENSE](./LICENSE) for the full license text, or read the official overview at [elastic.co/licensing/elastic-license](https://www.elastic.co/licensing/elastic-license).
