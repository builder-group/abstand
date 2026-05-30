# License Choice: Elastic License 2.0

Date: 2026-04-25
Last reviewed: 2026-05-30
Status: decided

## Context

Abstand is an offline macOS app for creating intentional distance from digital distractions. It needs system-level permissions to block apps and websites, so user trust is part of the product itself.

The business model is a one-time purchase with one year of updates included. Customers keep what they bought. Continued updates require another purchase. The project needs a license that supports that model without turning the codebase into a black box.

The source should be public so users can inspect what the app does before trusting it. Developers should be able to self-build, modify it for personal or internal workflows, and share compliant builds under the license terms.

The goal is not to prevent forks or community builds outright. The goal is to make sure redistributed versions preserve the same license-key path instead of bypassing it. This matters because Abstand is a desktop app, not a managed service. If the app were pure permissive open source, a third party could redistribute substantially the same paid app without preserving any mechanism that supports ongoing development.

For this project, the license needs to:

- keep the source publicly readable so users can inspect what the app does
- allow self-builds, private or internal modifications, and compliant redistribution
- require redistributed versions to preserve license-key functionality, protected functionality, and notices
- keep room for paid official builds, protected functionality, and update access

Publishing under a permissive open source license is one-way for released versions. Future releases can always become less restrictive, but rights already granted for old releases cannot practically be taken back.

## Options Considered

Each option is evaluated against the same question: does it keep the source inspectable while preserving the paid desktop model?

### MIT / Apache 2.0

This would maximize openness and trust. It is OSI-approved, familiar, and simple for contributors and downstream users.

It is not the current fit because it would allow unrestricted redistribution and commercialization of substantially the same app without preserving the license-key path.

### GPL / AGPL

This would make Abstand true open source while requiring redistributed modified versions to keep source available under the same license family.

It is not the current fit because it still allows free ready-to-run desktop builds and does not preserve a license-key-backed paid desktop model. AGPL is also more useful for network services than for a mostly local Mac app.

### Commons Clause

This would target resale by adding a selling restriction to an otherwise permissive license.

It is not the current fit because it is not OSI open source and focuses on selling rather than the narrower thing Abstand needs: preserving license-key functionality, protected functionality, and notices.

### Delayed-conversion source-available licenses

This includes Fair Core License, Functional Source License, and Business Source License 1.1. These keep source available now and can convert releases to an open source license later.

They are not the current fit because delayed conversion is a durable product promise, older desktop versions can remain useful for a long time, and Abstand does not need broader non-compete, production-use, or SaaS free-riding restrictions.

### Closed source / proprietary

This would give Abstand the most control over official distribution and avoid public redistribution questions.

It is not the current fit because it removes the source-inspection trust advantage for a system-level focus blocker. It also does not prevent piracy by itself.

### Elastic License 2.0

This keeps the source public and inspectable while allowing use, modification, derivative works, and redistribution under clear limits.

It is the current fit because it preserves license-key functionality, protected functionality, and notices without forbidding compliant community builds. It is not OSI open source, and it does not eliminate piracy or all redistribution risk.

## Decision

Use stock Elastic License 2.0 for the public codebase for now. Package metadata should use the SPDX identifier `Elastic-2.0`.

## Why This Is The Current Call

Abstand needs two things at the same time: trust and a viable paid product.

Trust matters because Abstand asks for system-level permissions. A fully closed source app would give the project more control over distribution, but it would also ask users to trust a focus blocker they cannot inspect.

Permissive open source would maximize openness, but it would also allow anyone to redistribute substantially the same desktop app without preserving a path back to the paid product. GPL or AGPL would keep derivatives open, but would still allow free ready-to-run desktop builds and would not preserve a license-key-backed paid model.

ELv2 is the closest fit for now. The source stays public and inspectable. Users and developers can self-build, modify, and redistribute within the license terms. Redistributed builds must preserve the license-key mechanism, protected functionality, and required notices.

This fits Abstand better than a non-compete or broad anti-fork license. Community builds are acceptable when they stay connected to the same license path. The project does not need to forbid redistribution outright.

ELv2 is not enough on its own. The paid product model still depends on the product architecture: official builds, updates, and protected functionality must remain meaningfully tied to the license-key system.

## Resources and References

- [Elastic License 2.0 full text](https://www.elastic.co/licensing/elastic-license)
- [Elastic License 2.0 FAQ](https://www.elastic.co/licensing/elastic-license/faq/)
- [SPDX Elastic-2.0](https://spdx.github.io/license-list-data/Elastic-2.0.html)
- [Commons Clause](https://commonsclause.com/)
- [Fair Core License](https://fcl.dev/)
- [Functional Source License](https://fsl.software/)
- [Business Source License 1.1](https://spdx.org/licenses/BUSL-1.1.html)
- [Open Source Definition](https://opensource.org/osd)
