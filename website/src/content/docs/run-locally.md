---
title: Run locally
description: Build Paideia and run its explicit local CLI against the maintained native example.
---

Use Node.js 22.19 or later from a Paideia checkout. The training example also
requires `uv`, Python 3.14, the installed Codex and Claude CLIs, and their saved
subscription logins. Paideia does not fall back to an API key. Daimon is optional
and is only required when selecting its native adapter.

## Validate and train the example

Run this complete sequence from the repository root. The temporary output
directory is new for each invocation. The actual native acceptance used these
models and budgets through the same public training API; this command exposes
that configuration through the CLI.

```sh
npm ci
uv venv --python 3.14 bridges/dspy/.venv
uv pip install --python bridges/dspy/.venv/bin/python -r bridges/dspy/requirements.lock
uv pip install --python bridges/dspy/.venv/bin/python --no-deps -e bridges/dspy
npm run build
node dist/src/cli/main.js validate examples/native-formatting/evals/train.paideia.yaml
node dist/src/cli/main.js validate examples/native-formatting/evals/test.paideia.yaml
paideia_run_dir="$(mktemp -d "${TMPDIR:-/tmp}/paideia-training.XXXXXX")"
node dist/src/cli/main.js train \
  --train examples/native-formatting/evals/train.paideia.yaml \
  --test examples/native-formatting/evals/test.paideia.yaml \
  --source-root examples/native-formatting \
  --runtime codex --model gpt-5.6-luna \
  --instructions SOUL.md --instructions PROMPT.md --editable PROMPT.md \
  --validation-group beta-validation \
  --optimizer-model fable \
  --bridge-command bridges/dspy/.venv/bin/paideia-dspy \
  --max-trials 10 --max-proposals 2 --seed 17 --timeout-ms 600000 \
  --out "$paideia_run_dir"
```

`validate` resolves the YAML and prints its source and shared-plan digests; it
does not run an agent. `--max-trials 10` reserves two test trials and allows up to
eight optimization metric calls. The timeout is the whole command deadline.
The seed controls GEPA sampling; it does not make subscription generations
deterministic.

All declared resources are locked until explicitly made editable. Here SOUL is
still passed as native instructions, while only PROMPT may change. The native
workspace receives those selected resources, not the surrounding example or its
dataset files.

## CLI contract

| Command | Result |
| --- | --- |
| `validate DATASET` | Resolve records and criteria without cognition |
| `evaluate DATASET --runtime ... --model ... --instructions ... --out ...` | Run every record with one fixed candidate |
| `train --train ... --test ...` | Optimize using train/validation, freeze, then compare on sealed test |
| `train --train ... --test ... --dry-run` | Estimate API-equivalent model costs without compilation, authentication, DSPy or model calls |
| `view OUT_DIRECTORY --port 4322` | Open a completed invocation as a local replay viewer |

Exit codes are `0` for completed passing work, `1` for completed work with failed
checks, `2` for an error, and `130` for cancellation. A successful process launch
does not establish a completed experiment.

Results stay local. Progress identifies trials; the final `invocation.json`
contains immutable stored report and candidate references. Use `view` with that
completed output directory to inspect it without new native or inference calls.
The command prints a loopback URL; Ctrl+C closes the viewer. Its whole-command
deadline is controlled by `--timeout-ms`.

Dry-run needs no output directory or optimizer bridge. Repeat `--judge NAME=MODEL`
to select models independently for named semantic judges. The optimizer has its
own model selection. Estimates use explicit token/cache assumptions and dated
rates; they do not measure subscription quota. Unknown costs remain unknown.
An optional `--cost-config FILE` calibrates those assumptions or supplies exact
model prices. Recorded reports retain usage and API-equivalent costs even when
inference uses subscriptions; failed attempts retain a protected progress journal.

Add `--view 4322` to an `evaluate` or `train` invocation to observe persisted
progress while it runs; `--view 0` selects a free port. The live server closes
with that invocation. `view` uses the recorded frozen-candidate authorization
for completed test results. There is no separate `replay` command.

For detailed fixture recipes, multi-wake integrations and installation boundaries,
consult the canonical [harnessing reference](/paideia/reference/harnessing.md)
and [development guide](/paideia/reference/development.md) (Markdown downloads).
