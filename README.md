# Paideia

Evaluate agents against readable tasks. Improve their prompts. Test whether the
improvement generalizes.

**Status: researched design proposal.** This is a new local repository. The
evaluator, runtime adapters and DSPy integration are not implemented yet. Read
the [architecture research](research/2026-09-13-agent-evaluation.md) for the
proposed YAML language, integration evidence and first implementation slice.

Paideia will run isolated tasks through Daimon, Claude Code, Codex, Pi or another
runtime adapter. It will capture observable actions and outputs, evaluate them
under YAML rules, and supply feedback to DSPy for prompt optimization.

The evaluation language must support:

- Mechanical checks on text, structured output, files, tool calls, arguments,
  results, ordering and the identity of artifacts used across steps.
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
