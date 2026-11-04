---
name: Shell runtime and `.replit`
description: Replit shell runtime detection can make incidental changes to runtime modules.
---

Invoking a language runtime in the workspace shell may cause Replit to add that runtime's Nix module to `.replit`. A Python documentation check added `python-base-3.13`; the file was restored to the branch baseline and no configuration change was retained.

**Why:** a documentation-only task required source and deployment configuration to remain unchanged, and the runtime addition was unexpected.

**How to apply:** after invoking a shell language runtime, inspect `.replit` before staging any changes. Keep only intentional configuration edits and compare against the task's branch baseline.
