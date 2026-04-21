<p align="center">
  <a href="https://abstand.app/">
    <img
      alt="Abstand is a desktop app for building intentional distance from distractions."
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
  A desktop app that helps you keep your attention together.
  <br />
  <a href="https://abstand.app/"><strong>Learn more »</strong></a>
  <br />
  <br />
  <a href="#introduction"><strong>Introduction</strong></a> ·
  <a href="#why-abstand"><strong>Why Abstand</strong></a> ·
  <a href="#desktop-app"><strong>Desktop App</strong></a> ·
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

**Abstand** helps you create intentional distance from the things that pull you away. The goal is simple: keep your attention together long enough to do meaningful work.

It is not about punishment or perfect discipline. Life meanders. Abstand just helps you avoid branching too far from what you meant to do.

Abstand is currently being built as a single desktop app.

## Why Abstand

Most days, the gap between what you planned to do and what actually happened comes down to small moments: a quick check, a notification, a tab that pulled you somewhere else. By the end of the day attention has been spread thin and the work that mattered did not get the focus it needed.

Abstand gives that attention a structure. You configure the boundaries once and the app holds them. You made the decision in advance, not in the moment when it is hardest to stick to it.

## Desktop App

You set up **Intentions**: configured commitments that define what gets blocked, when it starts, and when it ends. When an Intention's conditions are met, it triggers an **Abstand**: the active moment of intentional distance.

**Block** sets hard limits on specific apps and URLs, or the entire computer, for a set window of time.

**Pulse** runs recurring breaks on a loop. At each interval it fires a full-screen immersive overlay that holds for the configured duration.

## Tech Stack

- **Frontend:** React, TypeScript, TanStack Router, Vite, Tailwind CSS
- **Desktop Runtime:** Tauri
- **Native/Core:** Rust
- **Tools:** pnpm, Turborepo, ESLint, Prettier, Vitest

## License

Abstand is source-available under the **Elastic License 2.0 (ELv2)**.

You can read the code, learn from it, and modify it for internal use. Redistribution (free or paid) is not permitted without a separate license.

See [LICENSE](./LICENSE) for the full license text, or read the official overview at [elastic.co/licensing/elastic-license](https://www.elastic.co/licensing/elastic-license).
