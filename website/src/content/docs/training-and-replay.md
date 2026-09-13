---
title: Training and replay
description: Candidate changes, data splits, native measurements, and immutable evidence have separate owners.
---

Training changes declared prompt resources and measures new native runs. Replay
reads existing evidence and can evaluate it again without running the subject.
Replaying a capture is not another independent measurement.

## A training experiment

1. Resolve the datasets, evaluator versions, rubric bytes and shared plan.
   Freeze evidence groups into train, validation and sealed test.
2. Snapshot the native source files and their destinations. Record original
   bytes, editable regions, locked policy and candidate identity.
3. Run real native trials on fresh workspaces. Train output and evaluator
   feedback reach DSPy; validation returns scores for selection.
4. Let real DSPy GEPA propose new editable component text using the explicitly
   selected inference route. Every proposal must preserve the original policy.
5. Freeze the selected candidate before running sealed-test records. Compare
   baseline and selected candidates under the same criteria.
6. Retain local candidate files, native capture, evaluations, usage and lineage
   for review. Nothing is deployed automatically.

The optimizer and semantic judges use inference providers independently from
the subject adapter. A Codex subject can use Claude subscription reflection.
Unsupported controls fail; usage that a native route does not report stays
unknown. A token budget or seed is not an exact subscription-percentage meter.

## Files and locks

Candidates support multiple instruction, textual skill and supporting files.
Each has a source path, native destinations and a policy: locked, whole-file
editable, or selected Markdown heading subtrees. The original policy is enforced
on every derivation. Candidate preparation cannot silently widen editable areas.

Installation means the declared bytes were placed in the native workspace.
Loading and following those instructions are separate claims. The current
native adapters support instructions and supporting files, not native skills.

## Persisted evidence

The content-addressed store retains immutable manifests, blobs and evaluations,
plus an append-only checksummed event journal. Manifests define the authoritative
candidate, dataset role and visibility; a caller cannot change these by editing a
reference. A torn journal tail is reported, not silently repaired.

Optimizer readers cannot access validation or test captures. Test reads require
authorized frozen candidate IDs; viewer release is explicit. Raw records and
private evaluator evidence do not become public merely because a viewer opens.

The local viewer consumes persisted projections. Loading or replaying a page
does not invoke an agent, change a score or expose sealed labels. Rescoring must
create a new evaluation identity rather than overwrite the original result.

Paideia owns this experiment lifecycle. Spawnfile still owns workspace compilation
and deployment, Daimon owns a single native agent, Moltnet owns transport, and
Mneme owns memory. Production orchestration is outside Paideia.

See the canonical [architecture](/paideia/reference/architecture.md) and
[harnessing](/paideia/reference/harnessing.md) Markdown references for deeper
contracts and the distinction between implemented and proposed integrations.
