# 0004 – Use CloudFront Functions for Edge Authentication & Rate-Limiting

* Status: Proposed 2025-06-16  
* Deciders: Front-End Lead, Security Architect, SRE Lead  
* Technical Story: [GitHub Issue #70](https://github.com/your-org/voice-payments/issues/70)

## Context and Problem Statement

The public SPA, webhook callbacks, and audio streaming endpoints will be fronted by Amazon CloudFront for global latency & DDoS protection. We need to enforce **JWT verification**, **HMAC signatures (Stripe)**, and lightweight **rate-limiting** *before* traffic reaches the origin (ECS service), to:

* Block unauthenticated microphone uploads early → cut egress cost.  
* Mitigate credential-stuffing and replay attacks.  
* Reduce origin load during promo spikes (30k RPS).  
* Avoid cold-start latency of Lambda@Edge for every request (<1 ms budget per edge hop).

## Decision Drivers

1. **Latency budget**: keep <1 ms compute at 10k RPS.  
2. **Cost**: thousands of regional PoPs — prefer per-request micro-pricing over Lambda@Edge's minimum GB-sec charge.  
3. **Operational simplicity**: deploy with `aws cloudfront functions publish` from CI (no extra IAM roles).  
4. **Security**: tokens signed with `ES256`; need WebCrypto verification lib at edge.

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| Handle auth in **Express origin** | Familiar code, full Node APIs | Adds ~100 ms RTT; origin still hit on invalid tokens; less caching |
| **Lambda@Edge (Node 18)** | Flexible, access to crypto & async fetch | Cold-starts (~100 ms), higher price per 1 ms, IAM roles needed |
| **CloudFront Functions** (choice) | <1 ms compute, 75 M free invocations, centrally managed | V8 isolate: 10 KB code limit, no fetch, WebCrypto subset only |
| EdgeWorker on **Fastly** | High-perf JS, powerful | Vendor mix; extra bill; migration work |

## Decision Outcome

Adopt **CloudFront Functions** to run a tiny JavaScript module that:

1. Parses `Authorization: Bearer <JWT>` header.  
2. Validates signature against JWKS cached in function code (rotated daily via CI publish).  
3. Applies **sliding-window rate-limit** using key-value pairs in CloudFront header (`CF-Connecting-IP`).  
4. Short-circuits with 401/429 responses when checks fail, otherwise forwards to origin.

### Positive Consequences

* Latency gain (p99 auth check <0.6 ms).  
* Origin bandwidth saved (est. 35 % drop during bot traffic).  
* Cheaper than Lambda@Edge by ~70 %.  
* Single deploy surface in our AWS account.

### Negative Consequences

* 10 KB bundle limit: must bundle ES256 verifier with roll-your-own tiny library.  
* No external HTTP call: JWKS cannot be fetched at runtime, requires pre-baked keys.  
* Limited debugging: function logs only available via CloudWatch metrics sample.

### Ongoing Tasks

1. Add `infra/cloudfront/function-edge-auth.js` bundled build (<10 KB gzip).  
2. Terraform module to create function + attach to viewer-request event.  
3. Add GitHub Actions job to publish on merge (invalidates distro).  
4. Implement origin middleware to trust `x-user-id` header set by edge.  
5. Write k6 script to benchmark 99p latency & 429 behavior.

---

*Last updated: 2025-06-16* 