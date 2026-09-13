# Paideia Package Guide

Paideia owns isolated agent experiments, observable run capture, evaluation rules
and prompt optimization. Its core is independent of any particular runtime.
Integrations consume public interfaces; never import sibling internals.

## Current phase

This is an architecture and dataset-authoring seed, not a working product. The approved module
boundaries have local guides. The evaluator, adapters, DSPy bridge, viewer,
website and automated quality gates are not implemented. Code and configuration
are paused until the YAML authoring surface is approved. Draft example YAML and
native agent declarations are authorized for reviewing that surface.

Read [architecture](docs/architecture.md), [development](docs/development.md) and
the [research](research/2026-09-13-agent-evaluation.md) before implementation.
Research syntax is illustrative, not a runnable contract.

## Product boundaries

- Any callable agent is a potential native adapter: Daimon, Claude Code, Codex,
  Pi, OpenClaw and future CLI/SDK/service integrations are peers. The core, cases,
  evaluators and optimizer protocols have no mandatory runtime dependency.
- External agents do not need a Daimon wrapper. Add adapters without changing
  core evaluation semantics. Declare observable events and editable native
  resources; unsupported or unobserved capabilities remain explicit.
- The planned spawnfile train entry point delegates to Paideia through a public
  interface. Paideia owns training and retains its own runtime-neutral CLI;
  Spawnfile supplies the canonical agent/environment; its native runtime executes trials.
- First implementation acceptance requires the same cases and evaluator plan on
  two independent native adapters, including one outside Daimon.
- Subject adapters run isolated agents. Inference adapters independently provide
  subscription generations for DSPy and semantic judges. Never silently use paid
  API fallback or fabricate model controls, usage or success. Embedding providers
  declare their own capabilities and billing route.
- Use explicitly selected authentication outside agent-writable data. Never copy
  login credentials into candidates, cases, captures or fixtures. No mutable
  production memory, workspaces or network rooms in fixture trials.
- Candidates contain multiple instruction, textual skill and supporting Markdown
  files, with references and editable/locked files or sections. Plain Markdown
  is first-class; templates are optional. Map existing project source paths to
  native resources. Installed, loaded and followed are distinct evidence claims.
- Optimize declared editable resources only. Identity, permissions, mandatory
  criteria, fixture truth and memory policy stay locked unless explicitly redesigned.
- YAML composes existence/absence, counts, event relationships, conditions,
  thresholds, weighted scores and reusable rules. Event-order assertions and
  evaluation scheduling remain separate concepts.
- Evaluate observable behavior, not hidden reasoning. Missing observations never
  pass a required check. Hard gates cannot be offset by other scores; missing or
  skipped checks cannot inflate scores by shrinking their denominator.
- The approved initial [live policy](docs/live-evaluation.md) allows explicitly
  selected decisive mechanical failures to stop a trial. Repairable failures remain
  provisional; semantic/embedding checkpoints cannot stop or gate ongoing work.
  Terminal quality gates still apply. This policy is specified, not implemented.
- Version cases, captures, criteria and candidates. Train supplies feedback;
  validation selects; a sealed test compares a frozen candidate and baseline.
  Reset fixtures for each attempt. Rescoring is not an independent trial;
  changed effective instructions require a new subject run.
- The local viewer reads persisted events for live observation and replay. Page
  loads never invoke cognition, alter scores or expose sealed test data during
  optimization. The CLI works without the viewer.
- Production scheduling, deployment, memory and simulation remain with their
  owners. Runtime bugs go to the owning package, not prompt workarounds. Export
  local candidate files and evidence for review, never automatic deployment.

## Grow by responsibility

- Maintained product code is TypeScript, Node.js 22.19 or later. The only proposed
  language exception is the narrow real-DSPy Python bridge in bridges/dspy/.
- Use named exports and explicit folder entry points. Avoid dependency cycles
  and importing another module's implementation instead of its public interface.
- Stay under 400 lines per maintained source, test or configuration file; split
  before reaching the target. The planned emergency ESLint ceiling is 600 lines,
  not permission to defer a cohesive split. Never compress code to evade counts.
- Plan at most 30 direct maintained files per managed directory. Split earlier
  when responsibilities diverge or navigation becomes difficult. Group by behavior,
  not numbering or arbitrary file-size chunks. No generic utils/ dump.
- Every new implementation directory gets a focused AGENTS.md and CLAUDE.md
  symlink pointing to it in the same change. State ownership, public seams,
  prohibited dependencies and local verification. Inherit common rules.
- Tests live beside source. Move tests and private fixtures with extracted code.
  Adapter conformance tests stay with the adapter. YAML task corpora live under
  evals/ in named suites, separately from tests of the software itself.
- Keep illustrative project integrations under examples/: native project/environment,
  adjacent evals/ with one YAML per dataset and inline records, and one README. No required per-case,
  agent/runtime or experiment YAML. Reference private source data without copying it.
  Name datasets `<name>.paideia.yaml`; `schema: paideia.dataset.v1` identifies their
  content. Filenames do not grant training or sealed-test access.
  Spawnfile projects declare .spawnignore for evaluator files and generated trial
  artifacts; compiler enforcement is planned, not implemented. Train the canonical
  native definition with explicit isolated overrides, not a second maintained agent.
- Create nested folders for actual boundaries, not speculative vendors or empty
  source placeholders. Root files are package documentation and configuration.

## Planned mechanical enforcement

These are future requirements, not installed checks:

- ESLint warns above 400 lines, rejects above 600, checks the 30-file directory
  budget and required guide/symlink pairs, and enforces module boundaries.
  New nested implementation directories enter the same checks automatically.
- Coverage reaches 90% for each of lines, statements, functions and branches,
  globally and per executable TypeScript file. Include unimported source; empty
  tests or omitted modules cannot satisfy the gate.
- No broad lint disables, coverage exclusions, raised limits or skipped tests to
  get green. Genuine tool-imposed exceptions must be narrow and documented.
- Every claimed guard needs a negative check: violate the property and verify
  the actual gate fails. Test behavior and failure modes, not comment existence.

## Bounded maintenance and self-repair

Self-repair means development maintenance; no autonomous watcher exists. Triggers
include growth warnings, crowded folders, repeated mixed-owner changes, dependency
violations, missing local guides and failed quality gates.

1. Identify the owning layer and observable failure. Set success, at most three
   local fix/review rounds and an impasse condition before iterating.
2. Extract a cohesive submodule preserving contracts. Move its tests and fixtures,
   update named exports/imports and seed or revise focused guides.
3. Run affected tests and direct-dependent checks. Mutation-test enforcement
   changes with a representative violation of the claimed guard.
4. At the final boundary run the full checks and builds that exist, with independent
   cross-vendor review. Verify outputs, not just exit codes or process launch.
5. If the root defect remains or cannot be fixed correctly, report the impasse.
   Never relocate the bug or reset the round counter to prolong the same repair.

Behavior-preserving maintenance within an established boundary is autonomous.
Discuss material architecture, ownership or evaluation-semantics changes first.
Never repair development checks by changing production agents, rubrics, splits,
credentials, quality thresholds or deployment. Carry ordinary findings forward;
optional advice must not grow into an unbounded hardening project.

## Delivery

- Update guides and focused docs alongside changes. Proposed, implemented,
  tested and deployed capabilities are different states.
- Work on branches and land through reviewed pull requests with passing CI;
  never commit to main. Conventional single-line commits, no attribution trailers.
- Keep credentials, private datasets, captures and generated runtime state out of Git.
- Local files only for now. Future Astro/Starlight docs target a GitHub Pages
  project path without a custom domain. Publishing stays disabled until an actual
  native-agent optimization is demonstrated and release is approved.
