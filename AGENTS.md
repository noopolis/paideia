# Paideia Package Guide

Paideia owns isolated agent experiments, observable run capture, evaluation rules
and prompt optimization. Keep the core independent of any particular runtime.
Integrations consume documented public interfaces; never import sibling internals.

## Current phase

The architecture research is complete; implementation has not started. Read the
proposal in research/ and distinguish proposals from working capabilities. Reconcile
the evaluator language and adapter contracts with the user-directed design before
implementing them. The core and runtime adapters remain TypeScript; the proposed
DSPy bridge is a narrow Python integration boundary.

## Boundaries

- Harnessing arbitrary agents is a hard product requirement. Daimon, Claude Code,
  Codex, Pi and future CLI/SDK/service integrations are peer adapters. The core,
  case language, evaluator registry and optimizer protocol have no mandatory
  dependency on Daimon, Spawnfile, Mneme or another agent framework.
- An external agent must not need a Daimon wrapper. Add runtimes through adapters
  without modifying the core or evaluation language. Declare observable events
  and editable prompt slots explicitly; unavailable capabilities stay unavailable.
- First implementation acceptance requires the same cases and evaluator plan to
  run through two independent native adapters, including one outside Daimon.
- Runtime adapters harness agents; they do not impersonate production agents or
  borrow mutable production workspaces, credentials, memory stores or network rooms.
- Tests declare observable behavior and output criteria, not hidden reasoning.
  Missing observations are explicit; they are never a successful check.
- YAML authors composable logical rulesets: existence/absence, counts, event
  sequences, conditions, thresholds, weighted scores and reusable parameterized
  rules. Keep event-order predicates separate from evaluation scheduling.
- DSPy reflection and semantic judges use explicitly selected subscription-backed
  inference adapters, independently of the subject's runtime. Never silently fall
  back to a paid API, copy login credentials or fabricate unsupported model options
  or usage. Embedding backends declare their own capabilities and billing route.
- The local visualizer observes persisted experiment events and can replay them.
  It must not drive cognition on page loads, change evaluation results or expose
  sealed test data to the optimization phase.
- Evaluators and optimizers operate on versioned cases and captures. Production
  scheduling, deployment and memory behavior remain owned by their existing packages.
- Optimize declared editable prompts/examples. Preserve fixed identity, access
  policies and mandatory criteria. Keep training, validation and test data separate.
- Use local artifacts by default. No dataset, report or package publication is
  implied by running an experiment.

## Implementation conventions

- TypeScript, Node.js 22.19 or later; named exports and folder entry points.
- Source files under 400 lines. Tests beside the source they exercise.
- Every implementation directory has AGENTS.md and a CLAUDE.md symlink.
- No credentials, captures, private datasets or generated runtime state in Git.
- Work on branches; changes land through reviewed pull requests with passing CI.
  Never commit to main. Conventional single-line commits, no attribution trailers.
- Verify actual outputs and side effects; process launch or exit zero is insufficient.
- Before implementation/review loops, set acceptance criteria and bounded rounds.
  Use independent cross-vendor review at the final gate.
