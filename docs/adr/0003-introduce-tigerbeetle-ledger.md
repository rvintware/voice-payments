# 0003 – Introduce TigerBeetle Ledger for High-TPS Double-Entry Accounting

* Status: Proposed 2025-06-16  
* Deciders: Finance Eng Lead, SRE lead, Compliance officer  
* Technical Story: [GitHub Issue #65](https://github.com/your-org/voice-payments/issues/65)

## Context and Problem Statement

Stripe Checkout settles gross amounts, but we must maintain an *internal* ledger of balances (user wallets, pending payouts, income, fees) to support:

* Split-bill settlements and future peer-to-peer transfers.  
* Immutable audit trail for regulators (SOX, PCI).  
* Real-time balance checks to reject overdraft voice commands.

Post-Aurora traffic modelling (Chapter 7) predicts **3 000 ledger postings per second** at peak (holiday promos). Even with partitioning, Postgres WAL replication becomes the bottleneck and write-amplification threatens storage costs.

TigerBeetle is an open-source, **binary-protocol**, embeddable ledger engine written in Zig, offering:

* 4 M tx/sec on commodity HW (<https://github.com/tigerbeetle/tigerbeetle>).  
* Crash-safe, idempotent batch commits backed by B-tree.  
* Native double-entry semantics (accounts & transfers) → fewer bugs.  
* Fixed-size 128-byte structs → predictable memory footprint.

## Decision Drivers

1. Throughput ≥ 1 M transfers/s with <5 ms P99 latency.  
2. Strong (single-cluster) consistency—ledger must not fork.  
3. Compact append-only storage for 7-year retention.  
4. Simplicity: avoid implementing accounting rules in application code.  
5. Ability to replay events for reconciliation reports.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| Keep ledger in **Aurora Postgres** | Familiar tooling, fewer moving parts | Requires advisory locks & outbox table; TPS <50 k; high IOPS cost |
| **Event Sourcing in Kafka + KTable** | Scales writes, temporal queries | Complex correctness, idempotency DIY, exactly-once semantics hard |
| **TigerBeetle** (choice) | Purpose-built, extreme TPS, simple API, proven fault-model | Young ecosystem, Zig FFI, adds infra component |
| Build ledger in **CockroachDB** | Horizontal scale, SQL compatible | 2-phase commit overhead; 3x replication per raft |

## Decision Outcome

Adopt **TigerBeetle** as the authoritative ledger, embedded as a side-car service within the payments pod.

### Positive Consequences

* Headroom for 100× traffic w/out schema changes.  
* Ledger bugs reduced: API enforces balanced transfers by design.  
* Storage footprint minimal (~35 GB / billion tx).  
* Upstream replication to S3 snapshot simplifies DR.

### Negative Consequences

* Operability: no managed cloud service; SRE must own backup/monitoring.  
* Language interop: need gRPC bridge between Node (backend) and Zig binary.  
* Query complexity: ad-hoc SQL analytics require EDM copy into Redshift.

### Ongoing Tasks

1. Spin up TigerBeetle container in `docker-compose.infra.yml`.  
2. Implement **ledger service** (`backend/src/services/ledger.ts`) wrapping TigerBeetle client.  
3. Add Jest contract tests for idempotency & error cases.  
4. Instrument with Prometheus exporter (scrape binary stats).  
5. Draft runbook: crash-recovery & snapshot restore.

---

*Last updated: 2025-06-16* 