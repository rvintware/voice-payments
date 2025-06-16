# 0002 – Migrate from SQLite to Amazon Aurora Postgres

* Status: Proposed 2025-06-16  
* Deciders: Rehan Vishwanath (Eng Lead), DevOps lead, Backend team  
* Technical Story: [GitHub Issue #56](https://github.com/your-org/voice-payments/issues/56)

## Context and Problem Statement

The MVP shipped with an embedded SQLite database to minimise friction in local dev and CI.  
Production usage projections (see Chapter 7 capacity table) exceed SQLite's safe write concurrency (≈1 writer). The upcoming features—transaction feed, audit logs, idempotent Stripe webhooks—require:

* **Horizontal read replicas** for analytics dashboards.  
* **Point-in-time recovery (PITR)** to satisfy PCI-DSS §10.2.  
* **Row-level locking & advisory locks** to coordinate ledger posts.  
* **Managed backups & patching** to reduce ops toil.

We therefore need an industrial-grade relational store before public beta.

## Decision Drivers

1. Zero-downtime online migration path from SQLite (Sqitch & pgLoader).  
2. Native compatibility with existing SQL schema & `knex` queries.  
3. Cloud-managed offering to avoid self-hosting; encrypted at rest & in-transit.  
4. Cost-efficient scaling (<$0.15 per 1 k writes under projected load).  
5. Ecosystem support for logical replication → TigerBeetle phase.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| Remain on **SQLite** | Simplicity, file-based backups | Single-writer only, no replication, limited HA |
| Self-host **Vanilla Postgres on EC2** | Full control, OSS | Ops overhead, manual failover, slower snapshots |
| **Amazon RDS Postgres** | Managed, mature, extensions | Storage separated from compute; failover ~60 s |
| **Amazon Aurora Postgres** (choice) | Shared-storage cluster, up to 15 read replicas, 6-way SSD quorum, storage-based replication → sub-sec failover | Slightly higher cost, limited superuser extensions |
| CockroachDB Serverless | Horizontal scale, global | Distributed transactions cost, ORMs less mature |

## Decision Outcome

Adopt **Amazon Aurora Postgres** (serverless v2) for the primary OLTP database.

### Positive Consequences

* Multi-AZ, auto-scaling IOPS meets 99.99 % availability SLO.  
* IAM-based auth + AWS KMS simplifies security audit trail.  
* Aurora zero-ETL to Redshift opens future analytics pipeline.  
* Drop-in `pg` driver—no code rewrite.

### Negative Consequences

* Cloud vendor lock-in to AWS. Mitigation: keep schema ANSI-SQL; terraform module abstracts provider.  
* Cold-start billing spikes if cluster scales down to 0 ACUs; tune min capacity.  
* Requires VPC networking—local dev still uses SQLite; we need a toggle.

### Ongoing Tasks

1. Write migration plan: dump SQLite → pgLoader → Aurora Data API import.  
2. Update `.env` & secrets rotation via AWS Secrets Manager.  
3. Add healthcheck & RDS Proxy for connection pooling.  
4. Update CI to spin up `postgres:16-alpine` for tests.  
5. Document rollback strategy (blue/green swap).

---

*Last updated: 2025-06-16* 