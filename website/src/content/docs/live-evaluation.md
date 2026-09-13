---
title: Live evaluation
description: Mechanical final failures may stop a run; semantic checkpoints remain advisory.
---

Paideia can evaluate trusted observations while a native agent works. Evaluation
scheduling and event-order assertions are different: a checkpoint decides when
to evaluate, while a sequence criterion decides what happened before what.

## Initial policy

Only explicitly selected **decisive mechanical failures** may stop ongoing work.
Semantic and embedding checkpoints remain advisory. They can contribute to final
quality evaluation, but cannot gate the next native turn or stop an active one.

```yaml
live:
  checks:
    - id: forbidden-publish
      on: event
      on_fail: stop
      not:
        eval: tool-called
        tool: publish
        phase: dispatch
```

This is a dataset fragment. It can stop once an authentic `publish` dispatch is
observed, because that occurrence cannot be repaired by later output. It does
not establish that all publishing channels are observable or blocked.

By contrast, “a validation call has not happened yet” is provisional while the
agent still has time to make one. A currently failing check is not automatically
a proof that the final task must fail.

## Evidence and interruption

- A native observation must belong to the current trial and wake. Tool results
  and call identities come from capture, not the agent's narrative.
- Missing or partial tool coverage cannot prove absence. Required evidence is
  unknown until an adapter can supply it.
- A stop request, acknowledgement and confirmed quiescence are separate facts.
  Late effects and usage remain evidence; cancellation does not erase them.
- Infrastructure failure, budget interruption and a completed failed task stay
  distinct. An incomplete execution is not silently converted into a cheap zero.

Codex supplies process-group cancellation. Daimon supplies a native stop handle;
its acknowledgement does not independently prove that every native process or
remote effect has stopped. Neither adapter claims remote-work quiescence.

Read the canonical [live-evaluation policy](/paideia/reference/live-evaluation.md)
as a Markdown download from the root documentation source.
