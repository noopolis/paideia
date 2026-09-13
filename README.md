# Paideia

Evaluate agents against readable tasks. Improve their instructions and skills.
Test whether the improvement generalizes.

**Status: architecture and authoring seed.** Module guides are in place; the evaluator,
native adapters, DSPy integration and quality gates are not implemented. Code and
product configuration are paused while the YAML authoring surface is agreed.
Draft example YAML and native declarations are available for that discussion.

Open the [architectural view](docs/architecture.html), then the [Example Newsroom authoring example](examples/newsroom-reporting/README.md):
a production-derived Spawnfile/environment, real records inline in evals/train.paideia.yaml
and evals/test.paideia.yaml, a proposed .spawnignore policy, and one README.
The authoring syntax is a proposal to refine; no training has run.

For Spawnfile projects, the planned `spawnfile train` entry point delegates to
Paideia using the canonical agent/environment. Paideia's own CLI supports both
Spawnfile projects and other native agents. Neither training command is implemented yet.

Paideia will harness agents through their native CLI, SDK or service. Daimon,
Claude Code, Codex, Pi and OpenClaw are peer integrations; the core does not require
Daimon or another Noopolis package. The first working slice must run the same
cases and evaluations through two independent native adapters.

Candidates contain instructions, textual skills, supporting Markdown and examples
together. Authors declare editable files or sections and locked content. Templates
are optional. Adapters distinguish installed files, supplied instructions and
skills observed loading; following a skill needs evidence from the agent's work.

Readable YAML will combine mechanical checks, logic, event relationships, semantic
judges, embeddings and custom evaluators. Missing evidence remains explicit;
mandatory gates and incomplete coverage cannot disappear inside an average.

DSPy will optimize declared resources using training feedback; validation selects,
then a sealed test compares the frozen candidate with baseline. Subscription
inference for DSPy and judges is independent of the agent under test, with no
silent paid API fallback. A local viewer will show live and saved experiments
without running agents or judges on page load.

```text
paideia/
├── src/
│   ├── contracts/       neutral types, schemas and interfaces
│   ├── cases/           YAML resolution and dataset plans
│   ├── candidates/      instruction/skill files and editable sections
│   ├── experiments/     isolation, budgets and trial lifecycle
│   ├── adapters/        native subject integrations
│   ├── capture/         observed events, inputs and artifacts
│   ├── evaluation/      evaluator contracts and execution
│   │   ├── logic/      composition, coverage and scores
│   │   ├── mechanical/ observable checks and event relationships
│   │   ├── semantic/   prompt judges and calibration
│   │   └── embedding/  similarity and explicit model bindings
│   ├── optimization/   candidate feedback and DSPy integration
│   ├── inference/      subscription generations and embeddings
│   ├── storage/        persisted ledger and immutable artifacts
│   └── cli/            local command interface
├── evals/              named task suites with adjacent fixtures and splits
├── examples/           native environments and dataset examples, starting with newsroom-reporting/
├── bridges/dspy/       narrow future Python bridge to actual DSPy
├── viewer/             future local live/replay interface
├── website/            future Astro/Starlight docs; no deployment yet
├── docs/               architecture and development decisions
└── research/           dated evidence and illustrative proposals
```

Each seeded directory has a focused `AGENTS.md` and a `CLAUDE.md` symlink. Unit
tests will live beside source; task datasets stay separate. Planned gates enforce
small files and modules, local guides and 90% coverage for each metric globally
and per executable TypeScript file.

Read the [architecture](docs/architecture.md),
[YAML authoring proposal](docs/authoring.md),
[native harnessing proposal](docs/harnessing.md),
[development guidelines](docs/development.md) and
[research evidence](research/2026-09-13-agent-evaluation.md).
Paideia exports local candidates and evaluation evidence; production deployment,
memory and organization scheduling remain with their owners.
