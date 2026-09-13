# Paideia

Evaluate agents against readable tasks. Improve their instructions. Test the
frozen revision on examples the optimizer never saw.

Paideia runs agents through native adapters, records what they actually do and
evaluates that evidence. Dataset YAML combines mechanical checks, ordered tool
events, logical rules, weighted scores and semantic judges. Selected decisive
mechanical failures can stop a live trial; semantic checks remain advisory while
the agent works.

**The first native training experiment works.** Real DSPy GEPA revised a Markdown
prompt using Claude subscription inference. Both Codex and Daimon changed an
unseen result from `Gamma` to the required `ack:gamma`. The locked identity and
original source files stayed unchanged. This small [formatting experiment](examples/native-formatting/README.md)
proves the integration, not general writing quality.

## Start locally

Requires Node.js 22.19+. Validation does not run an agent or need a subscription.
From a fresh repository checkout:

```sh
npm ci
npm run build
node dist/src/cli/main.js validate examples/native-formatting/evals/train.paideia.yaml
node dist/src/cli/main.js --help
```

A dataset keeps records and reusable fixtures together:

```yaml
schema: paideia.dataset.v1
id: formatting
subject: formatter

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
```

Keep `evals/train.paideia.yaml` and `evals/test.paideia.yaml` beside the agent's
native files. Training reserves an internal validation group; a third YAML is
not required. The invocation assigns roles explicitly, rather than trusting names.

## Evaluate, train and inspect

- **Evaluate:** install an immutable candidate into a fresh workspace and run
  native Codex or Daimon. Record inputs, observations, artifacts, coverage and usage.
- **Train:** let real DSPy GEPA propose changes to explicitly editable Markdown.
  Validation selects; sealed tests compare the frozen revision with baseline.
- **Inspect:** `view OUT_DIRECTORY` opens a local read-only experiment viewer;
  `--view 0` observes evaluation/training live. Loading a page runs no cognition.
- **Extend:** public TypeScript interfaces accept new native adapters, fixture
  preparation, custom evaluators and explicit judge/embedding providers.

The [CLI guide](website/src/content/docs/run-locally.md) documents commands and
budgets. The [DSPy bridge guide](bridges/dspy/README.md) covers its locked Python
environment. Native agents and Claude inference use saved subscriptions with no
automatic API fallback. Unknown usage and partial traces remain unknown.

Candidates can contain several instruction and supporting files. The API supports
locked files, whole-file edits and editable Markdown sections. Native destinations
are explicit; installing a file does not claim the runtime loaded or followed it.

## Current limits

- Codex supports native thread continuation. Daimon currently supports one wake
  containing many steps; cross-wake continuity and configured memory are unavailable.
- Native skill discovery, automatic Spawnfile preparation, `spawnfile train` and
  `.spawnignore` enforcement still need their owning integrations. The
  [newsroom example](examples/newsroom-reporting/README.md) is a production-derived
  authoring fixture, not a runnable replica of the organization.
- Subject support currently covers Codex and Daimon. Claude supplies optimizer
  and judge inference; standalone Pi, Claude-as-subject and OpenClaw need adapters.
- Cancellation reports acknowledged scope and unknown remote work. It cannot
  roll back actions. Rescoring saved evidence is not a new independent trial.

Everything stays local. Paideia does not deploy prompts, schedule organizations,
implement memory or publish its documentation site.

## Develop

Read the [implementation status](docs/implementation.md), [architecture](docs/architecture.md), [interactive diagram](docs/architecture.html),
[YAML reference](docs/authoring.md), [native contracts](docs/harnessing.md) and
[development guide](docs/development.md).

Tests live beside their modules. The quality gate enforces public module boundaries,
small files and directories, nested guides, and 90% coverage per executable file.
The narrow Python bridge runs real DSPy; the rest of the implementation is TypeScript.
Local [Astro/Starlight documentation](website/README.md) has no publishing workflow.
