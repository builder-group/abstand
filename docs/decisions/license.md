# License Choice: Elastic License 2.0

Date: 2026-04-25
Last reviewed: 2026-05-13
Status: decided

## Context

Abstand is an offline macOS app for creating intentional distance from digital distractions. It runs with system-level access to block apps and websites, so user trust is a product requirement, not a nice-to-have.

The business model is a one-time purchase with one year of updates included. The project needs a license that supports that model without turning the codebase into a black box.

The intent is that users should be able to inspect the source, build it themselves, and understand what the app is doing before trusting it with system-level permissions. Developers should be able to modify it for personal or internal use. Redistribution and improvement are acceptable, provided redistributors preserve the license-key functionality, protected functionality, copyright notices, and license notices.

The goal is not to prevent forks or community builds outright. The goal is to make sure redistributed versions keep the same licensing path back to the original project rather than bypassing it. This matters because Abstand is a desktop app, not a managed service. If the app were pure permissive open source, a third party could redistribute substantially the same paid app without preserving any mechanism that supports ongoing development.

For this project, the license needs to do three things:

- keep the source publicly readable so users can inspect what the app does
- allow building from source, modification, and redistribution under clear limits
- prevent removal or circumvention of license-key functionality and protected functionality
- avoid giving away unrestricted commercial reuse rights at the start of the project

This is a one-way-door decision. It is easy to move from a more restrictive license to a less restrictive one later. It is not practical to go the other direction for code that has already been published under a permissive open source license.

## Options Considered

### MIT / Apache 2.0

Pros:

- strongest trust and community signal
- OSI-approved and familiar
- simplest legal story for contributors and downstream users
- allows private modification, forks, and redistribution without friction

Cons:

- allows third parties to redistribute or commercialize the code with very few constraints
- does not protect a license-key-backed desktop business model
- gives up the option to keep the initial commercial model protected by default

### GPL / AGPL

Pros:

- OSI-approved and familiar to many open source users
- preserves user freedom to inspect, modify, share, and rebuild the app
- requires redistributed modified versions to keep source available under the same license family

Cons:

- still allows third parties to redistribute ready-to-run desktop builds, including for free
- creates stronger obligations for downstream code integration than this project needs

### Commons Clause

Pros:

- targets resale of the software rather than all commercial use
- can be layered on top of a familiar permissive license
- narrower than a general non-commercial restriction

Cons:

- not OSI-approved and cannot be presented as open source
- focuses on the right to "Sell" rather than preserving license-key functionality
- less clear for acceptable paid support, consulting, redistribution, and value-add scenarios

### Fair Core License / Functional Source License

Pros:

- designed for source-available commercial products and Fair Source projects
- allows broad source access while restricting uses that compete with or undermine the producer
- provides a delayed path to an OSI-approved license for each released version
- Fair Core License includes license-key protection for commercial features

Cons:

- broader than a license-key preservation rule because these licenses restrict competing or harmful uses more generally
- the delayed open-source conversion is a real product promise, not just a trust signal
- two-year conversion may be too short for a paid desktop app whose older versions can remain useful
- Functional Source License is mainly designed around SaaS-style free-riding rather than offline desktop apps

### Business Source License 1.1

Pros:

- established source-available license family
- can be customized with an Additional Use Grant
- provides eventual conversion to an open source license

Cons:

- heavier and more variable because each project-specific grant matters
- better suited when production use needs to be restricted, which is not the goal here
- would need careful customization to avoid accidentally blocking normal personal use, private modification, or community builds

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
- allows use, modification, derivative works, and redistribution under the license terms
- blocks hosted or managed-service resale, though this matters less for a mostly offline desktop app
- blocks removing notices, bypassing license-key functionality, or removing license-key-protected functionality
- preserves the option to relicense more permissively later

Cons:

- not OSI-approved and cannot be presented as open source
- some developers and companies avoid source-available licenses on principle
- does not fully prevent piracy or unauthorized redistribution by itself

## Decision

Use Elastic License 2.0 for the public codebase for now.

## Why This Is The Current Call

This decision is mostly about keeping trust intact while preserving some commercial headroom at the start.

Closed source protects distribution most directly, but it gives up one of the clearest advantages Abstand can offer: users can inspect the code of a system-level app before trusting it.

MIT or Apache 2.0 would maximize openness, but they would also allow unrestricted redistribution and commercialization immediately. That may still become the right choice later, but it is harder to justify at the start of a small commercial desktop product.

Elastic License 2.0 keeps the important trust property intact because the source stays public. It permits redistribution while adding practical guardrails around managed-service resale, notice removal, and license-key circumvention.

For Abstand, the key point is the license-key limitation. ELv2 does not broadly prohibit desktop redistribution, and that is intentional. Redistributed builds are acceptable when they comply with the license and preserve the license-key mechanism, protected functionality, and required notices. This matches the desired model better than a non-compete license because the project does not need to forbid community versions outright.

It is important to be explicit about what this decision does not buy. ELv2 does not eliminate redistribution risk, and it does not stop ordinary piracy by itself. It also does not force every redistributor to pay the project merely because they redistribute a build. The commercial support for the project comes from the product architecture: paid or protected functionality must actually remain behind the license-key mechanism. If Abstand stops relying on license-key-protected functionality, or if the goal changes to preventing redistribution itself, ELv2 becomes a weaker fit and this decision should be revisited.

## Resources and References

- [Elastic License 2.0 full text](https://www.elastic.co/licensing/elastic-license)
- [Elastic License 2.0 FAQ](https://www.elastic.co/licensing/elastic-license/faq/)
- [Commons Clause](https://commonsclause.com/)
- [Fair Core License](https://fcl.dev/)
- [Functional Source License](https://fsl.software/)
- [Business Source License 1.1](https://spdx.org/licenses/BUSL-1.1.html)
- [Open Source Definition](https://opensource.org/osd)
