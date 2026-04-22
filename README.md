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
  <a href="#core-concepts"><strong>Core Concepts</strong></a> ·
  <a href="#current-focus"><strong>Current Focus</strong></a> ·
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

Modern life is full of checking instead of doing. A quick look at a message, tab, or app can break your flow and scatter your energy.

**Abstand** is a macOS app for creating intentional distance from digital distractions. You define the boundaries in advance, and the app holds them when it matters.

The goal is simple: keep your attention together long enough to do meaningful work. Instead of asking you to keep making the hard decision in the moment, Abstand lets you make it once ahead of time and then enforces that choice across apps, URLs, and sessions.

## Core Concepts

- **Intentions** are configured commitments that define what gets blocked, when it starts, and when it ends.
- An **Abstand** is the active moment of intentional distance after an Intention fires.
- **Block** is the core MVP behavior. It sets hard limits on specific apps and URLs, or the entire computer, for a set window of time.
- During an active Abstand, the app can visualize session state live and show where attention tried to branch away.

## Current Focus

The current MVP centers on the core blocking mechanic and the surrounding session experience:

- Block Intentions with time-based or manual start and end conditions
- Profiles for organizing Intentions
- Live river visualization during an active Abstand
- Session logging to support future Flow Map features
- A menu bar icon with live Abstand state

Features like **Pulse**, post-session **Flow Maps**, and reward artifacts are part of the broader product vision, but they come after the core mechanic is validated.

Want the fuller product vision, terminology, MVP scope, and future direction? Read the [project spec](./docs/project-spec.md).

## Tech Stack

- **Frontend:** React, TypeScript, TanStack Router, Vite, Tailwind CSS
- **Desktop Runtime:** Tauri
- **Native/Core:** Rust
- **Tools:** pnpm, Turborepo, ESLint, Prettier, Vitest

## License

Abstand is source-available under the **Elastic License 2.0 (ELv2)**.

See [LICENSE](./LICENSE) for the full license text, or read the official overview at [elastic.co/licensing/elastic-license](https://www.elastic.co/licensing/elastic-license).
