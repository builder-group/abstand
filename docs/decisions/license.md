# License Choice: GNU Affero General Public License v3.0

Date: 2026-04-25
Last reviewed: 2026-06-09
Status: decided

## Context

Abstand is an offline macOS app for creating intentional distance from digital distractions. It needs system-level permissions to block apps and websites, so user trust is part of the product itself.

The source should be public so users can inspect what the app does before granting those permissions. The license needs to preserve that inspectability while keeping any distributed fork open under the same terms.

The pricing direction is a one-time purchase with one year of updates included. The license decision is not built around protecting that monetization mechanism. If the paid model is introduced, it should rest on the product: official builds, update access, and support. The license does not need to be the enforcement layer.

The license needs to:

- keep the source publicly readable so users can inspect what the app does
- be OSI-approved so the project can be described as open source without qualification
- require forks and redistributed versions to remain open under the same license
- cover the network service case without requiring a relicense if sync or server-side functionality is added later

## Options Considered

Each option is evaluated against those requirements.

### MIT / Apache 2.0

OSI-approved, simple, and broadly understood. Maximizes openness.

Not the right fit because permissive licenses allow proprietary forks. A third party could take the codebase, close the source, and redistribute a competing app with no obligation to keep it open.

### GPL v3

Strong copyleft. OSI-approved. Any fork or redistribution must stay GPL v3 with source available. Includes patent protection.

A reasonable fit for a desktop-only app. Not chosen because AGPL v3 provides identical protection for the desktop case and also satisfies the network service requirement. Choosing GPL now and relicensing later if server functionality is added is an avoidable future decision.

### Elastic License 2.0

Source-available. Keeps source inspectable while restricting commercial redistribution and requiring redistributed versions to preserve license-key functionality.

Not the right fit because it is not OSI-approved. It cannot be described as open source, which matters for a system-level app that asks users to trust it with accessibility permissions.

### GNU Affero General Public License v3.0

Strong copyleft. OSI-approved. Any fork or redistribution must stay AGPL v3 with source available. Adds a network service clause on top of GPL v3: running the software as a service without distributing it still requires source disclosure to users of that service.

This is the current fit.

## Decision

Use GNU Affero General Public License v3.0 for the public codebase. Package metadata uses the SPDX identifier `AGPL-3.0-only`.

Files or subdirectories may specify a different license in their headers or a local license file. This covers components that cannot be licensed under AGPL.

## Why This Is The Current Call

AGPL v3 satisfies all four requirements. The source stays public and inspectable. OSI approval means the project can be called open source without qualification. Copyleft ensures any distributed version remains open. The network service clause covers sync or server components without requiring a future relicense.

The copyleft requirement is stricter than the project strictly needs today, but the cost is low. Building Abstand requires Rust, Swift, and Tauri. The realistic pool of users who self-compile is small. Compliant community builds are acceptable and expected. The project does not need to prevent redistribution; it needs redistributed versions to stay open.

ELv2 was the prior choice and covered the inspectability requirement well. The shift to AGPL v3 drops the license-key preservation requirement and gains OSI compliance and full copyleft. If the paid model requires stronger protection than OSI copyleft provides, the architecture should supply it, not the license.

## Resources and References

- [GNU AGPL v3 full text](https://www.gnu.org/licenses/agpl-3.0.html)
- [GNU AGPL v3 FAQ](https://www.gnu.org/licenses/gpl-faq.html)
- [SPDX AGPL-3.0-only](https://spdx.org/licenses/AGPL-3.0-only.html)
- [OSI approved licenses](https://opensource.org/licenses/)
- [Open Source Definition](https://opensource.org/osd)
