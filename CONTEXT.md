# Domain Glossary

## Inventory Management Core
The primary purpose of the product. It covers tracking stock levels, stock movements, replenishment state, and inventory visibility needed for daily operations.

The first must-win workflow in this core is low-stock replenishment.

### Parts Catalog
The canonical inventory master for all sellable or consumable items.

Parts catalog records should be shared across service lines and specialized with tags, defaults, and compatibility metadata instead of duplicated into separate tables per service.

### Service Line
A locksmith business segment that changes defaults without changing the underlying inventory model.

Examples include automotive locksmith work, mobile locksmith work, and storefront/shop work. Service lines may change the default parts, price book, stock location, and equipment requirements, but they reuse the same inventory and job workflow vocabulary.

### Workflow Template
A reusable sequence of steps for a service line or job type.

Workflow templates describe the shape of the work, not the stock records themselves. A workflow may reference parts bundles, but it should not own a separate parts catalog.

### Parts Bundle
A named set of parts commonly used together for a specific service line or job type.

Bundles help with quick job setup, but they are projections over the parts catalog rather than separate sources of truth.

## Reporting Add-on
A secondary capability that derives insights from persisted operational data. Reporting is valuable but must not define core workflow priorities for initial delivery.

Reporting in v1 is read-oriented and must not introduce new core write paths.

## Core-Reporting Boundary Rules
Core-first rule: a feature is v1-eligible only if it directly changes or safeguards inventory state.

Reporting dependency rule: reporting may read persisted core state/events but cannot require new core write behavior in v1.

No-reporting-blocker rule: if core workflow operates without a report, core ships first and reporting is deferred.

## Dispatch Coordinator
The primary office persona who needs accurate inventory state to plan and execute field work.

The primary success metric is reducing median quote-to-scheduled-job time by at least 30 percent for authenticated users.

## Authenticated User Action
A user action performed by a signed-in Clerk identity and persisted with attribution in the database.

## Inventory Ledger Authority
In v1, on-hand quantity authority is an append-only inventory movement ledger per SKU-location. Read-model balances are derived from ledger events.

## Mandatory Inventory Movement Events (v1)
StockReceived, StockAllocatedToJob, StockReturnedFromJob, StockAdjusted, ReplenishmentOrdered, ReplenishmentReceived, StockTransferred.

## Negative Inventory Policy (v1)
Controlled negatives are allowed only for StockAllocatedToJob and StockAdjusted, with mandatory user attribution and reason code, reconciliation flagging, and prioritized resolution workflow.

Negative moves are blocked for transfer and replenishment receive events.

## Inventory Permissions (v1)
inventory.read, inventory.allocate, inventory.receive, inventory.adjust, inventory.transfer, inventory.replenish, inventory.reconcile, reports.read.

reports.read is read-only and does not grant core inventory write authority.

## Inventory Audit Invariants (v1)
Every inventory write includes actor user attribution, tenant scope, server timestamp, event type, sku/location scope, signed quantity delta, correlation ID, and source metadata.

Reason code is mandatory for adjustments and controlled negatives.

Ledger rows are append-only and never mutated in place.

## Mandatory Frontend Surfaces (v1)
Low-stock queue, replenishment detail, create replenishment action, receive stock action, exception queue, inventory timeline, and core KPI strip.

## Delivery Sequence (v1)
Deploy 1: low-stock queue and read-only inventory timeline.

Deploy 2: create replenishment action with attribution and permission checks.

Deploy 3: receive stock flow with immediate queue recalculation.

Deploy 4: exception queue for controlled negatives and reconciliation workflow.

Deploy 5: core KPI strip and minimal reporting add-on reads.

## UX Reliability Targets (v1)
Low-stock queue first meaningful content target: under 1.5 seconds at p75.

Mutation acknowledgement target for core inventory actions: under 600 milliseconds at p75.

Consistency window target for queue and balance updates after successful writes: within 2 seconds.

Failed writes must always show actionable user-visible errors.

Clerk-gated inventory routes must reliably enforce authorization and predictable redirects.

## Definition Of Done Gates (per deploy)
Auth and permission checks are enforced for all new routes/actions.

All writes persist append-only ledger events with audit invariants.

Resulting core UI state is reflected inside the agreed consistency window.

Failure states are visible and actionable.

A role-appropriate end-to-end preview scenario is verified.

Typecheck, targeted tests, and full suite pass.

A rollback path is documented before release.

## Highest-Risk Integration Assumption
Permission enforcement and inventory ledger writes remain consistent across frontend mutation paths without authorization or attribution drift.

The first risk-reduction spike is Create Replenishment as a thin end-to-end vertical slice.
