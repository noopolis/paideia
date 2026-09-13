---
title: Evaluate the agent you actually run
description: Paideia's working evaluation, native execution, and prompt optimization surfaces.
---

Paideia runs isolated tasks through a native agent, evaluates the captured
behavior, and uses those measurements to improve declared instruction files.
Your runtime still owns the agent's execution. Paideia owns the experiment.

Start with a native configuration and two readable YAML datasets: training and
sealed test. Preserve the agent's locked identity and permissions, choose the
instruction files that may change, and compare the selected candidate with the
original after training finishes.

## Working today

- Strict YAML datasets, named same-file fixtures, logical checks, stages and
  fixed weighted scores.
- Mechanical, semantic and embedding evaluator interfaces. Unsupported named
  providers, rules or preparation recipes fail explicitly.
- Immutable candidates across multiple Markdown files, with editable whole
  files or heading subtrees and a locked remainder.
- Native trials, live mechanical checkpoints, persisted evidence and replay.
- Real DSPy GEPA optimization through native trial callbacks and a separate
  Claude subscription inference route.
- A local CLI for validation, evaluation, training, and viewing saved runs;
  persisted live observation with `--view` during evaluation or training.

## Native adapters

| Surface | Implemented support | Current limit |
| --- | --- | --- |
| Codex subject | Saved subscription, explicit model, native session continuation, output/usage capture | Partial tool trace; no fixture-tool mounting |
| Daimon subject | Public native harness through its Codex engine, fixture tool observations, output/usage | One wake per trial; partial tool trace |
| Claude inference | Saved subscription reflection or semantic judgment with tools disabled | Not a Claude subject adapter; no temperature or seed controls |

Both subject adapters install explicit instruction and supporting files. Local
`spawnfile train` delegates the canonical agent to Paideia through a registered
isolated preparation; Spawnfile retains compilation ownership. Native skill loading,
production memory, automatic project environments and other subject adapters remain
integration work. Static validation does not prove a project's native task completes.

## Measured native result

The maintained `examples/native-formatting/` experiment completed real GEPA
training on 2026-09-13. One Fable 5.1 proposal improved the held-out token result
on both Codex `gpt-5.6-luna` and Daimon `gpt-5.5`:

| Candidate | Unseen input | Actual output | Mechanical result |
| --- | --- | --- | --- |
| Original instruction | `Token: Gamma` | `Gamma` | Fail |
| Selected instruction | `Token: Gamma` | `ack:gamma` | Pass |

The same frozen candidate, dataset record and evaluation plan were used on both
adapters. Locked identity and source files remained unchanged. Persisted captures
rescored identically without another native run. One record per partition proves
the integration; it does not establish broad generalization or newsroom parity.

Continue with [running locally](/paideia/run-locally/) or
[the dataset example](/paideia/datasets/). This documentation is built locally;
no deployment or publishing workflow is enabled.

The canonical [implementation status](/paideia/reference/implementation.md)
records remaining integrations and acceptance evidence as a Markdown reference.
