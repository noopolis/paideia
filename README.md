# Paideia

Evaluate agents against readable tasks. Improve their prompts. Test whether the
improvement generalizes.

**Status: researched design proposal.** This is a new local repository. The
evaluator, runtime adapters and DSPy integration are not implemented yet. Read
the [architecture research](research/2026-09-13-agent-evaluation.md) for the
proposed YAML language, integration evidence and first implementation slice.

Paideia is designed to harness any agent with an accessible CLI, SDK or service
interface through a pluggable adapter. Daimon, Claude Code, Codex and Pi are
peer integrations. The core must work without Daimon or the rest of Noopolis
installed; an external agent does not have to be wrapped in Daimon.

Task datasets, evaluation rules, captured-run analysis and optimization are
independent of the selected runtime. Adding an agent means implementing an
adapter, without changing the evaluation language or core. Adapters declare
which observations and prompt controls they actually support.

The first implementation is accepted only after the same cases and evaluators
run against two independently integrated native harnesses, including one outside
Daimon. It will capture observable actions and outputs, evaluate them under YAML
rules, and supply feedback to DSPy for prompt optimization.

The evaluation language must support:

- Mechanical checks on text, structured output, files, tool calls, arguments,
  results, ordering and the identity of artifacts used across steps.
- Existence and absence, counts, reusable parameterized rulesets and nested
  `all`/`any`/`not` expressions. Event-order assertions and evaluation-stage
  execution order are separate: independent checks need no invented sequence.
- Prompt-based semantic judges, embedding comparisons and custom evaluators.
- Logical composition, conditions, thresholds, progressive evaluation and
  weighted scores. Mandatory gates cannot be offset by a higher average.
- Explicit results for failures, unavailable observations and skipped checks.
  A runtime that cannot expose a required event cannot silently pass it.

Captured runs can be evaluated again under new criteria without rerunning the
agent. Testing a changed prompt requires a fresh isolated run.

Optimization uses training data for feedback, validation data for candidate
selection and a sealed test set for final comparison with the baseline. Evidence,
memory fixtures, model identity and evaluation rules must be recorded so that
apparent gains can be distinguished from leakage or changed conditions. Quality,
latency and token/cost measurements remain visible separately.

DSPy's optimizer and semantic judges must use Paideia's subscription-backed
inference adapters to the authenticated coding CLIs. The tested agent runtime is
selected independently from the optimizer and judge. Authentication failures or
unsupported requests must not silently fall back to paid APIs. Embeddings need
their own declared backend, such as a local model; a text CLI does not imply an
embedding endpoint.

A local visualizer is part of the product: watch training progress, inspect
candidate prompt diffs and per-case evidence, follow the rule tree and its
pass/fail/unknown/skipped results, and compare baseline, validation and final test
scores alongside measured usage. The same view replays saved runs. It observes
the experiment ledger; opening or refreshing it must not rerun agents or judges,
or expose sealed test results during optimization.

Paideia owns experiments and evaluation. Daimon owns cognition, Mneme owns memory,
Spawnfile owns workspace compilation and deployment, Moltnet owns transport, and
Simfile owns world simulation. Paideia does not steer a production organization
or deploy its optimized candidates automatically.

The core and runtime adapters will be TypeScript. The researched design proposes
a thin Python bridge to the actual DSPy library, with prompt-propagation tests
before claiming that integration works. YAML is the task and evaluation authoring
format; it is not a place for embedded executable code.

Research findings belong in `research/`. Captures, credentials, private datasets,
experiment outputs and generated state belong outside Git.
