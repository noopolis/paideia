---
title: Author a dataset
description: A paired training and test YAML example with explicit fixture truth and shared criteria.
---

One YAML file is one dataset. Its records hold the inputs, selected evidence and
criteria for independent tasks. The filename convention is
`<name>.paideia.yaml`; the schema field identifies the language.

These are the two maintained files from `examples/native-formatting/evals/`.
The training invocation reserves the `beta-validation` group for selection.
Only Alpha produces optimizer feedback; Gamma remains sealed until selection
is frozen.

## train.paideia.yaml

```yaml
schema: paideia.dataset.v1
id: native-formatting-train
subject: native-formatting

checks:
  - id: response-shape
    eval: json-schema
    input: output.text
    schema:
      type: string
      pattern: '^ack:[a-z]+$'

records:
  - id: alpha
    group: alpha-training
    input:
      prompt: 'Token: Alpha'
    checks:
      - id: exact-token
        eval: equals
        input: output.text
        value: ack:alpha

  - id: beta
    group: beta-validation
    input:
      prompt: 'Token: Beta'
    checks:
      - id: exact-token
        eval: equals
        input: output.text
        value: ack:beta
```

## test.paideia.yaml

```yaml
schema: paideia.dataset.v1
id: native-formatting-test
subject: native-formatting

checks:
  - id: response-shape
    eval: json-schema
    input: output.text
    schema:
      type: string
      pattern: '^ack:[a-z]+$'

records:
  - id: gamma
    group: gamma-sealed-test
    input:
      prompt: 'Token: Gamma'
    checks:
      - id: exact-token
        eval: equals
        input: output.text
        value: ack:gamma
```

Both shared plans have the same digest. Each record adds its exact expected
answer as evaluator-only truth. `input.prompt` is sent to the subject; `checks`
are not. A response with the right shape but the wrong token still fails.

## Growing beyond one input

- `fixtures` names shared context, setup, inputs, references and outputs within
  the same file. Records select them with `use`; conflicting selected fixtures
  fail instead of silently choosing one. Explicit record values apply afterward.
- `input.files` selects exact resource paths and SHA-256 hashes. Reference files
  remain evaluator-side and cannot also be selected as subject inputs.
- `all`, `any` and `not` compose checks. `stages` adds eligibility, hard gates and
  fixed linear scores. A weighted score cannot offset a failed hard gate.
- `tool-called`, `tool-count` and `tool-sequence` evaluate authentic captured
  observations. A textual claim that a tool ran is not a tool observation.
- `turns` adds ordered external stimuli and trusted observation bindings within
  one persistent trial. The adapter must support that native session behavior.
- Registered evaluator, ruleset, judge and preparation names keep extensions
  explicit. YAML does not contain executable code.

Unknown fields, duplicate keys, unsupported requirements, missing fixture values,
conflicting groups and changed shared criteria fail resolution. Missing native
evidence remains unknown and never passes a required check.

The canonical [authoring semantics](/paideia/reference/authoring.md) and
[fixture rules](/paideia/reference/fixtures.md) are linked as Markdown downloads;
larger examples live in `examples/newsroom-reporting/` in the repository. That newsroom
example is a synthetic authoring reference, not a proven native environment replica.
