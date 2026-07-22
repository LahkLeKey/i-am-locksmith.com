# AGENTS.md

## Agent skills

### Issue tracker

GitHub Issues is the issue tracker for this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five canonical triage labels unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout at the repo root. See `docs/agents/domain.md`.

## Product workflow guardrails

- Keep the operator workflow straightforward for small businesses with limited staff.
- Treat the Jobs Operations page as the command center for pending work.
- Keep customer and quote workflow context on Jobs Operations unless the user explicitly requests a different IA.
- Keep inventory reserve/create actions tied to jobs on the Jobs Operations page.
- Treat the Inventory page as warehousing control only: parts catalog, stock counts, reorder logic, suppliers, and locations.
- As jobs are completed, ensure outcomes are visible through invoices and reporting/projection views rather than adding workflow clutter back to Jobs Operations.
- Prefer evolving existing pages over creating new standalone pages when implementing workflow requests.

## UX and delivery defaults

- Use mobile-first responsive layouts and prevent horizontal overflow at common viewport sizes before deployment.
- Use explicit labels for form inputs, especially numeric fields, and avoid placeholder-only semantics.
- When deployment is requested, run relevant checks first (lint/typecheck/tests for touched areas), then deploy and confirm the production alias.
