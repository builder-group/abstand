# License Choice: Elastic License 2.0

Date: 2026-04-25
Status: decided

## Context

Abstand is an offline macOS app for creating intentional distance from digital distractions. It runs with system-level access to block apps and websites, so user trust is a product requirement, not a nice-to-have.

The business model is a one-time purchase with one year of updates included. The project needs a license that supports that model without turning the codebase into a black box.

The intent is that users who cannot or do not want to pay should be able to get the app for free by cloning and building it themselves. Developers should be able to modify it for personal or internal use. What the license needs to prevent is an easy redistribution path, where a third party packages a ready-to-run binary and offers it as a free download, undercutting the official distribution without effort on the user's part. The goal is permissive in the directions that matter and restrictive in one specific direction.

For this project, the license needs to do three things:

- keep the source publicly readable so users can inspect what the app does
- allow building from source and private modification
- avoid giving away unrestricted commercial reuse rights at the start of the project

This is a one-way-door decision. It is easy to move from a more restrictive license to a less restrictive one later. It is not practical to go the other direction for code that has already been published under a permissive open source license.

## Options Considered

### MIT / Apache 2.0

Pros:

- strongest trust and community signal
- OSI-approved and familiar
- simplest legal story for contributors and downstream users

Cons:

- allows third parties to redistribute or commercialize the code with very few constraints
- gives up the option to keep the initial commercial model protected

### Closed source / proprietary

Pros:

- strongest control over official distribution
- simplest message about what is and is not licensed

Cons:

- removes the inspectable-source trust advantage
- fits poorly for software that operates at the system level
- does not meaningfully prevent piracy on its own

### Elastic License 2.0

Pros:

- keeps the code public and inspectable
- allows use, modification, and derivative works for personal or internal use
- blocks redistribution as a competing product or managed service
- blocks removing notices or bypassing license-key-protected functionality
- preserves the option to relicense more permissively later

Cons:

- not OSI-approved and cannot be presented as open source
- some developers and companies avoid source-available licenses on principle
- does not fully prevent piracy or unauthorized redistribution

## Decision

Use Elastic License 2.0 for the public codebase for now.

## Why This Is The Current Call

This decision is mostly about keeping trust intact while preserving some commercial headroom at the start.

Closed source protects distribution most directly, but it gives up one of the clearest advantages Abstand can offer: users can inspect the code of a system-level app before trusting it.

MIT or Apache 2.0 would maximize openness, but they would also give away unrestricted commercial reuse immediately. That may still become the right choice later, but it is harder to justify at the start of a small commercial product.

Elastic License 2.0 keeps the important trust property intact because the source stays public. It also adds practical guardrails around redistribution as a competing product, managed-service resale, notice removal, and license-key circumvention.

It is important to be explicit about what this decision does not buy. ELv2 does not eliminate redistribution risk, and it does not stop ordinary piracy by itself. The point is not perfect control. The point is to keep the code inspectable while avoiding the most permissive commercial terms at the start of the project.

## Resources and References

- [Elastic License 2.0 full text](https://www.elastic.co/licensing/elastic-license)
- [Elastic License 2.0 FAQ](https://www.elastic.co/licensing/elastic-license/faq/)
- [Open Source Definition](https://opensource.org/osd)