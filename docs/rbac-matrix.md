# RBAC Matrix (MVP Baseline)

Version: 2026-07-20

This document is the baseline role-permission contract for MVP deliverable #1 (auth + RBAC).

## Scope decisions

- Clerk is the identity provider for MVP.
- RBAC is evaluated with org + user scope.
- Missing active org is least privilege (no permissions).
- Permissions are action-based; route access is derived from actions.

## Roles

- owner_admin
- dispatcher
- technician
- inventory_manager
- accountant
- viewer_auditor

## Permission domains

- dashboard.read
- jobs.read|create|assign|update|complete
- technicians.read|manage
- invoices.read|create|send|void
- inventory.read|adjust|transfer|receive|reserve
- reports.read
- settings.read|update
- users.read|invite|role.update

## Explicit role matrix

### owner_admin

- dashboard.read
- jobs.read
- jobs.create
- jobs.assign
- jobs.update
- jobs.complete
- technicians.read
- technicians.manage
- invoices.read
- invoices.create
- invoices.send
- invoices.void
- inventory.read
- inventory.adjust
- inventory.transfer
- inventory.receive
- inventory.reserve
- reports.read
- settings.read
- settings.update
- users.read
- users.invite
- users.role.update

### dispatcher

- dashboard.read
- jobs.read
- jobs.create
- jobs.assign
- jobs.update
- jobs.complete
- invoices.read
- invoices.create
- invoices.send
- reports.read

### technician

- dashboard.read
- jobs.read
- technicians.read
- jobs.update
- jobs.complete
- inventory.read
- inventory.reserve

### inventory_manager

- dashboard.read
- inventory.read
- inventory.adjust
- inventory.transfer
- inventory.receive
- inventory.reserve
- reports.read

### accountant

- dashboard.read
- invoices.read
- technicians.read
- invoices.create
- invoices.send
- invoices.void
- reports.read
- settings.read

### viewer_auditor

- dashboard.read
- jobs.read
- technicians.read
- invoices.read
- inventory.read
- reports.read
- settings.read
- users.read

## Route/API mapping in code

Current map lives in lib/rbac/policy.ts via ROUTE_PERMISSION_MAP.

- /dashboard => dashboard.read
- /jobs => jobs.read
- /technicians => technicians.manage
- /inventory => inventory.read
- /invoices => invoices.read
- /reports => reports.read
- /settings => settings.read
- GET /api/protected => dashboard.read
- POST /api/protected => settings.update
- GET /api/technicians => technicians.read
- POST /api/technicians => technicians.manage
- PATCH /api/technicians => technicians.manage

## Effective permission calculation

1. Determine org role from Clerk org role parsing:
- org:admin maps to owner_admin.
- org:member is neutral and can be specialized by org-scoped user role.
- org:<custom> attempts normalization to known app roles.
- unknown or missing active-org role fails closed.
2. Determine optional user role from Clerk user publicMetadata.orgRoles[orgId].
3. Effective permissions:
- No active org: none.
- Unknown or missing Clerk org role in active org: none (fail closed).
- org:member + no scoped user role: none.
- org:member + scoped user role: scoped user role permissions.
- Known org role only: known org role permissions.
- Known org role + scoped user role: intersection of both.

## Notes

- This matrix is intended to be versioned alongside guard logic.
- Future phases can add app-owned policy persistence if needed.
