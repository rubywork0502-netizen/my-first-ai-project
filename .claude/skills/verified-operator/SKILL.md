---
name: "verified-operator"
description: "Use this skill when the assistant must operate live systems, verify each action with receipts, and recover safely from drift."
---
# Verified Operator

Operate across live systems with verification, evidence, recovery, and state tracking. Use this skill when Codex must coordinate files, terminals, browsers, APIs, devices, or external services; take actions instead of only advising; prove each change with receipts such as logs, screenshots, diffs, or API responses; manage approvals for risky steps; or recover from drift in long-running, high-stakes, or multi-step tasks.

## Goal

Turn a request into verified execution, not plausible narration.

Build a live world model, choose the safest next mutation, verify every action with independent receipts, and recover cleanly when the environment changes underneath you.

For superhuman-complexity tasks, go further: model dependency graphs, score verification confidence, monitor invariants continuously, classify failure modes precisely, reason about time-dependent operations, and orchestrate across phases that no single human could track.

## Quick Start

For every action you take:

```text
1. BEFORE  -> What is the current verified state?
2. RISK    -> L0 observe | L1 local+reversible | L2 external | L3 destructive
3. ACT     -> One bounded change (L2+ needs user approval)
4. PROVE   -> Capture a receipt (output, diff, screenshot, status code)
5. CONFIRM -> Does the receipt match what you expected?
               YES -> update ledger, continue
               NO  -> stop, diagnose, recover or escalate
```

For complex tasks, add these before Step 1:

```text
0a. GRAPH      -> Map system dependencies as a DAG
0b. PHASE      -> Break the task into named phases with entry/exit criteria
0c. INVARIANTS -> Define hard and soft invariants
```

Upgrade verification for complex tasks:

```text
4b. CONFIDENCE -> Score each receipt 0.0-1.0. Below 0.7? halt. 0.7-0.9? add a second check.
5b. TIMING     -> If result is time-dependent, wait for propagation before verifying.
5c. FAILURE    -> Classify: transient | permanent | cascading | silent | delayed.
```

If you need a concrete scaffold, open `templates/templates.md` before starting.

## Operating Loop

Use this loop in order:

1. Map the world.
2. Grade risk.
3. Design the smallest useful action.
4. Execute one bounded mutation.
5. Verify with receipts.
6. Update the world model.
7. Recover, escalate, or continue.
8. Close only on a verified end state.

Do not skip verification just because a command exited successfully.

## 1. Map The World

Translate the user request into a concrete target state before acting.

Capture:

- objective
- systems involved
- source of truth for each fact
- access path for observing or changing each system
- invariants: data safety, downtime limits, privacy rules, cost limits, deadlines
- blockers such as missing auth, permissions, or unsupported platforms

Prefer direct systems of record over summaries or stale memory.

## 2. Grade Risk

Classify the next action before taking it:

- `L0`: observe only
- `L1`: local and reversible
- `L2`: external or user-visible
- `L3`: destructive, financial, security-sensitive, or hard to undo

Default behavior:

- execute `L0` and `L1` when they clearly serve the request
- pause and confirm before `L2` or `L3` unless the user already approved that exact action class
- reduce risk first via observation, dry runs, scoping, or rollback planning when possible

## 3. Design The Smallest Useful Action

For each step, define:

- precondition
- action
- receipt
- rollback

Prefer one system, one mutation, and one verification at a time.

### Idempotency

Prefer idempotent mutations. If a step is not naturally idempotent:

- check for prior success before retrying
- use unique operation identifiers when supported
- document why the non-idempotent path is necessary

### Parallel Execution

Only parallelize independent `L0` and `L1` actions. Verify each group independently before merging results back into the ledger. Keep `L2+` actions sequential.

## 4. Keep A Working Ledger

Maintain a compact internal ledger and surface it when it helps the user follow the state:

```text
Objective:
Systems:
Current state:
Next action:
Expected receipt:
Risk level:
Rollback:
Deadline:
Timeout:
Estimated cost:
Cumulative spend:
Budget:
```

Update the ledger after every meaningful observation or mutation. If the environment diverges, rewrite the ledger before continuing.

### Audit Trail

For `L2+` tasks, maintain an append-only audit trail:

```text
| # | Timestamp | Action | Risk | Receipt | Status |
|---|-----------|--------|------|---------|--------|
| 1 | ...       | ...    | L2   | ...     | ✅/❌   |
```

Never edit past rows. Redact secrets before logging them.

### Checkpointing

After every 3 verified mutations, or after any `L2+` mutation:

- snapshot the verified state as a named checkpoint
- record how to return there
- prune rollback plans older than the last checkpoint

Use `templates/templates.md` for ledger, audit trail, checkpoint, delegation, final summary, metrics, dependency graph, phase plan, invariant checklist, confidence log, and timer scaffolds.

## 5. Execute With Receipts

Before each mutation:

- state the intent briefly
- set an explicit timeout for each external call

Then:

1. perform one bounded action
2. capture the result immediately
3. compare the result against the expected receipt
4. stop if the receipt is missing, ambiguous, or contradictory

Prefer receipts such as:

- command output naming the changed object
- file diffs or exact file contents
- HTTP status codes and response fields
- screenshots of resulting UI state
- IDs, versions, timestamps, job IDs, deployment IDs, or process IDs
- a second read from the system of record after the write

Do not treat a green exit code as sufficient proof when stronger evidence is available.

### Redacting Secrets From Receipts

Before logging, checkpointing, or surfacing a receipt:

1. identify secrets, tokens, webhook URLs, passwords, cookies, session IDs, signed URLs, and PII
2. replace the secret portion with a masked placeholder
3. keep enough structure to confirm validity without exposing the secret
4. never log raw secrets in the ledger, audit trail, checkpoints, handoffs, or final response
5. if the receipt is itself a secret, log its presence and shape, not its raw value

## 6. Resolve Conflicting Signals

When sources disagree, trust the nearest system of record in this order:

1. direct state from the target system
2. a fresh read through the official API or UI
3. local cache or derived logs
4. prior assumptions or model memory

If the conflict remains, capture both signals, name the contradiction, and avoid further writes until it is resolved.

## 7. Recover From Drift

When drift appears:

1. stop the current chain
2. restate the actual state using exact names, IDs, and dates
3. decide whether to refresh, retry, rollback, or escalate
4. continue only from the new verified state

Never keep replaying the same write blindly against a drifting system.

## 8. Approval And Safety Rules

Pause and confirm when a step could:

- expose a service beyond the local machine
- spend money or allocate paid resources
- change security posture or credentials
- message third parties or modify external accounts
- delete data or overwrite user work
- create hidden long-term maintenance burden

When asking for confirmation, state:

- the exact action
- why it is needed
- the main tradeoff or risk
- the safer fallback if one exists

### Async Handoffs

When a human must act outside the agent's tools:

1. state exactly what the human needs to do
2. state the expected receipt
3. pause instead of guessing the result
4. on resume, verify the human-provided receipt against the system of record

## 9. Delegation

Use delegation only when sub-agents are available and the user explicitly authorized delegation or parallel agent work.

If delegation is appropriate:

- state exact success criteria
- require specific receipts
- redact secrets unless strictly required
- independently verify any returned receipts
- do not trust a sub-agent summary without verification

If sub-agents are not available or not authorized, perform the step locally.

## 10. Completion Bar

Declare success only when one of these is true:

- the desired end state is proven with receipts
- the user intentionally accepted a partial outcome
- a concrete blocker is proven and the missing requirement is named

The task is not done if the steps merely sound correct, a plan was written but not executed, or downstream state is still unknown.

## 11. Final Response Contract

Close with a short operator-style summary:

- what changed
- what evidence proved it
- what remains risky, partial, or blocked
- what the next safe action is

Keep the summary grounded in observed state, not inference.

## 12. Context Management

For long tasks:

- compress completed steps after checkpoints
- keep current state, active rollback, unresolved conflicts, last checkpoint, and audit trail
- drop raw outputs from already verified steps when they are no longer needed
- write a handoff summary if context is running low

## 13. Metrics And Telemetry

After each completed task, record:

```text
| Date | Task | Steps | Retries | Drift Events | L2+ Actions | Duration | Outcome |
|------|------|-------|---------|--------------|-------------|----------|---------|
```

Use the metrics row template in `templates/templates.md` when needed.

## 14. Anti-Patterns

Avoid:

- narrating instead of executing
- exit-code-only verification
- batching too many mutations together
- trusting sub-agent summaries
- skipping rollback planning
- acting on a stale ledger
- over-confirming `L0` actions
- retrying non-idempotent writes without checking prior success
- ignoring partial success
- spending without budget awareness

## 15. Edge Cases

Handle at least these cases explicitly:

- cascading rollbacks
- partial system failures
- authentication expiry mid-task
- rate limits and throttling
- concurrent human changes
- ambiguous success

## 16. Dependency Graph Reasoning

For complex tasks spanning many systems, build a DAG that identifies prerequisites, downstream dependencies, the critical path, and independent branches. Update the graph whenever mutations change system relationships.

## 17. Confidence-Scored Verification

Score receipts on a 0.0-1.0 scale:

- `1.0`: direct confirmation from the system of record
- `0.9`: strong indirect evidence
- `0.7-0.9`: partial confirmation, add a secondary verification
- `0.5-0.7`: ambiguous, re-poll with timeout
- `<0.5`: contradictory or missing evidence, halt

If cumulative chain confidence drops below `0.7`, pause and re-verify from the last checkpoint.

## 18. Invariant Monitoring

Define hard invariants that must never break and soft invariants that can degrade temporarily. Check hard invariants after every `L2+` mutation, check all invariants at checkpoints, and re-check them after any drift recovery.

## 19. Failure Mode Taxonomy

Classify failures as:

- transient
- permanent
- cascading
- silent
- delayed

Pick a recovery strategy that matches the failure type instead of defaulting to retries.

## 20. Multi-Phase Orchestration

Break superhuman-complexity tasks into named phases with:

- entry criteria
- actions
- exit criteria
- phase checkpoint

Never start the next phase until the current phase exit criteria are verified.

When a task spans multiple environments or long change windows, consult `examples/multi-phase-orchestration.md`.

## 21. Temporal Reasoning

Model propagation windows, timers, UTC timestamps, and hard timeouts for time-dependent operations such as DNS, TLS issuance, CDN invalidation, replication, deployment rollout, and async job completion.

Do not verify before the propagation window makes verification meaningful.

## Resources

- `templates/templates.md`
- `examples/deploy-static-site.md`
- `examples/api-integration.md`
- `examples/multi-service-coordination.md`
- `examples/device-control.md`
- `examples/multi-phase-orchestration.md`

Open the example that most closely matches the current task before inventing a fresh structure from scratch.

## Trigger Examples

Use this skill for requests like:

- connect services and prove they actually work
- install on a VPS, expose it safely, and verify the route
- control a device and confirm the foreground app changed
- update production config and stop if health checks fail
- coordinate browser, terminal, and API changes without losing track of state
- deploy across multiple environments and verify each phase

## When NOT To Use This Skill

- pure Q&A or explanation with no system interaction
- single-file code edits that do not depend on external state
- creative writing, brainstorming, or hypotheticals
- research-only requests with no mutation or verification
- tasks where the user explicitly says "just tell me, don't do it"
