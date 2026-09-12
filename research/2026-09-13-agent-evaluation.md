# Paideia: evidence for the first design

Research date: 13 September 2026. **Design proposal; no evaluator, adapters or optimizer have been implemented.**

**Recommendation:** build a small TypeScript experiment runner with readable YAML rules, trusted run capture and an extensible evaluator contract. Integrate DSPy through a thin, pinned Python bridge. Let the real agent runtime execute the work. Do not rebuild its tool loop inside DSPy. Keep frozen captures useful independently of optimization: capture once, evaluate repeatedly, and rerun the agent when its effective inputs change.

The first useful result is a demonstrated comparison: the same isolated task, evidence and evaluation plan run through two independent native harnesses, including one outside Daimon, with a validator-to-filing chain tied to the exact artifact, followed by a small DSPy prompt optimization experiment and a sealed test comparison. A framework inventory or an attractive scalar score is not that result.

## Runtime independence is a hard constraint

Paideia must be able to integrate any agent exposed through an accessible CLI,
SDK or service interface. Daimon, Claude Code, Codex and Pi are peer adapters;
external agents must not require a Daimon wrapper. The core must install and run
without any Noopolis runtime or organization compiler.

Cases, evaluator definitions, normalized captures and the optimizer protocol are
runtime-independent. New runtimes plug into the public adapter contract without
changing the core or YAML language. Each adapter declares the observations and
prompt controls it can actually provide. A callable agent with only final-output
access can still be evaluated on output; process checks it cannot expose remain
unknown, and unsupported prompt slots cannot be optimized.

Two independent native adapters are part of initial acceptance, not a deferred
extension. They establish that the common contract works across implementations;
they do not imply every possible integration is already implemented.

## What exists already

These are source inspections, not newly executed integration tests. Daimon was read on `fix/required-codex-mcp` at `afd872ebb01c82c186dae410db3c59e3df150aa0`. The inspected capture/harness/CLI files match merged `origin/main` at `599f9c06383eca2db50c99d7bcfba91e889a79ab`; raw capture v2 was introduced by `589948a99b8d8ace7e3cd645b0c9e6639e04646f`. This establishes merged source availability, **not deployment in a production image**. Other local revisions are recorded under provenance below.

| Surface | What the current code actually provides | Consequence for Paideia |
|---|---|---|
| Daimon core | `AgentHarnessAdapter.startAgent`; handle `wake`, `status`, `stop`; a wake result contains text and duration | Usable launch boundary, but no runtime-neutral event subscription or complete evaluation export |
| Daimon native Pi | Opt-in `daimon.pi.raw_training_capture.v2`: native session bytes, subscribed events, effective provider payload after prior transforms, response metadata, hashes, atomic publication and bounded retention | Reuse this capture. The documentation still says v1; detect schema from the actual artifact |
| Daimon with CLI engines | Codex/Grok/AGY session adapter emits a synthetic terminal Pi event with empty tool results and zero placeholder usage; actual usage is published separately | Do not grade tool behavior or spending from that synthetic event |
| Daimon Codex | Native JSONL decoder knows terminal usage and command/MCP counts; a thread ID joins native rollout request accounting | Add/export native events at the CLI boundary, or use instrumented fixture tools; do not scrape “newest session” |
| Daimon Grok | Decoder yields final output; broker and direct CLI paths differ | Establish capabilities separately for each path; final text is not a complete trace |
| Daimon ordinary traces | Prompt hashes, timings, summarized memory and session events; minimized world trajectory is specifically world-tool scoped | Neither is a complete general tool trace. World outcomes remain pending until joined to their owner’s evidence |
| Mneme | `createMemoryRuntime`, `prepareTurn`, `recordTurn`, policy-checked kernel; recall on/off/shuffled controls already exist | Reset a private fixture store through Mneme; do not implement another memory engine or share a live store |
| Stele | Versioned causal-event parsing, hashing and reconciliation | Reuse for genuine ecosystem causal events. Paideia’s generic trace need not pretend to be one |

Raw Pi capture is explicitly private and may contain sensitive provider material. A safe evaluation projection should omit hidden/restricted reasoning, credentials and irrelevant memory. A hash proves captured bytes have not changed; it does not prove those bytes were honest or complete. For a killed turn, an absent post-turn manifest means incomplete capture, not no activity.

The ownership boundary stays narrow: Spawnfile compiles/deploys workspaces; the runtime executes cognition; Mneme owns memory; Moltnet owns transport; Simfile owns world mechanics. Paideia may launch isolated evaluation subjects and score their outcomes. It must not wake or sequence a production organization, change Simfile’s autonomous clock, or make a second deployment compiler. Scenario-specific rules, private corpora and newsroom automation remain with their owning project.

## Reuse choices

**DSPy is the requested optimizer integration.** Its GEPA optimizer discovers named predictors, changes their instruction text, executes candidates and receives numerical scores plus textual feedback. A `Module.forward()` that merely runs a CLI does not automatically expose a tunable prompt or a predictor trace. The current source also explicitly warns that omitting a separate validation set reuses training examples for selection. [DSPy GEPA](https://dspy.ai/api/optimizers/GEPA/overview/), [implementation](https://raw.githubusercontent.com/stanfordnlp/dspy/main/dspy/teleprompt/gepa/gepa.py).

**Direct GEPA is the simpler alternative for arbitrary systems.** `GEPAAdapter` accepts named text components, opaque outputs/trajectories and an application-owned evaluator. The newer `optimize_anything` API also accepts an evaluator without requiring a DSPy program. Keep this possible behind the same optimizer protocol, but do not silently substitute it for the requested DSPy integration. Both are Python; a subprocess/JSON protocol is our proposed integration, not a claim of an existing Paideia plugin. [GEPA adapter](https://gepa-ai.github.io/gepa/api/core/GEPAAdapter/), [universal API](https://gepa-ai.github.io/gepa/api/optimize_anything/optimize_anything/).

**Promptfoo overlaps substantially.** It already supports YAML, weighted metrics, text/schema checks, embedding similarity, prompt judges, reusable assertions, custom evaluators, and trajectory tool-name/argument/sequence checks. Reuse its documented library/adapter surfaces where useful, or import compatible suites. Do not reimplement its provider catalogue or claim Paideia invented tool-use evaluation. Paideia still needs its own explicit unknown/coverage semantics, trusted artifact bindings, native capture contract and sealed optimization policy. Ordinary weighted averages and a tool-name subsequence alone do not establish those guarantees. [Assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/), [trajectory semantics](https://www.promptfoo.dev/docs/configuration/expected-outputs/deterministic/#trajectorytool-sequence), [custom provider](https://www.promptfoo.dev/docs/providers/custom-api/).

**Inspect is the strongest reference for real-agent evaluation.** It supports external agents, sandboxes, scorers and an API bridge. That bridge routes model calls through Inspect and can change generation settings unless configured otherwise. This is useful for API-based research, but it is not automatically equivalent to the native subscription execution path. Learn from its separation of agent, sandbox and scoring; consider export/import compatibility rather than requiring its Python runtime underneath every Paideia case. [Agent bridge](https://inspect.aisi.org.uk/agent-bridge.html), [scorers](https://inspect.aisi.org.uk/scorers.html).

**OpenTelemetry is an export vocabulary, not evidence authority.** Align common model/tool IDs and usage fields where sensible; record the convention version because GenAI fields are evolving. Langfuse can group experiment traces and scores, but hosting it should not be required for local files and a CLI. [GenAI attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/), [Langfuse experiment ingestion](https://langfuse.com/docs/evaluation/experiments/experiments-via-opentelemetry).

**Defer Agent Lightning.** Its current v1 documentation describes a redesigned Python training/proxy system with GPU training and Kubernetes integration. Earlier APO tutorials belong to older releases. It is relevant if weight training becomes a requirement; it adds unnecessary scope to the first local prompt-optimization slice. [Current documentation](https://microsoft.github.io/agent-lightning/stable/).

## The actual DSPy bridge

Use a normal `dspy.Predict` for one editable instruction component, with a custom public `dspy.Adapter` that sends instructions, explicitly rendered demonstrations and a case reference to Paideia. Its result contains the actual native output plus capture/report references. DSPy’s normal predictor machinery then records the predictor invocation; Paideia supplies the detailed process evidence in feedback. This follows the exposed adapter and prediction seams, but **requires a conformance experiment before it is treated as working**. [Adapter contract](https://dspy.ai/api/adapters/Adapter/), [prediction and trace construction](https://raw.githubusercontent.com/stanfordnlp/dspy/main/dspy/predict/predict.py).

DSPy also requires a `BaseLM` instance during predictor preprocessing, even if the custom adapter delegates execution externally; the bridge must satisfy that contract without inventing a model call or usage. Scope that adapter to the subject module. The reflection model and judges must use their ordinary model adapters; a global override must not route the optimizer’s own prompts back into the subject agent. Never add DSPy’s default chat field-format instructions to a native agent accidentally. The request carries a structured candidate bundle, and the runtime adapter places its contents into declared native prompt slots.

The first bridge proves one instruction slot as an integration checkpoint, not a single-string limit on the candidate contract. The product must support agent instructions, textual skills, supporting Markdown files and examples together, with references preserved and explicit editable/locked files or sections. Ordinary Markdown is a first-class input; templates are optional and the renderer is not yet selected. Adapters must distinguish installed files, effective instructions and observed on-demand skill loads, with unavailable observations explicit. Record source and rendered content digests, native destinations and any observable loading evidence. DSPy needs an explicit mapping to supported editable components; rendering files alone does not expose them to optimization. Further slots—examples, tool descriptions, role instructions—need explicit native mappings and mutation tests. A tool-description candidate must change the schema the runtime actually offers, not just a prose note beside it. Locked identity, permissions, memory policy, fixture truth and evaluator definitions are outside the candidate. GEPA’s instruction optimizer does not by itself establish arbitrary native-tool or demonstration optimization; expose each supported feature truthfully. [GEPA DSPy adapter source](https://raw.githubusercontent.com/gepa-ai/gepa/main/src/gepa/adapters/dspy_adapter/dspy_adapter.py).

Maintained product code remains TypeScript. Calling the real DSPy library requires Python somewhere. Recommendation: a minimal pinned Python integration package/process, with all capture, case resolution, assertions and budgets owned by TypeScript. If “all code must be TypeScript” also forbids that small bridge, literal DSPy integration is a genuine constraint conflict; use an external preinstalled bridge or obtain agreement on that exception, rather than calling a TypeScript imitation DSPy.

## Readable cases and an open evaluator language

The following is **illustrative syntax**, not a committed DSL or runnable configuration. Runtime definitions, models and evaluator implementations resolve through a separate version lock. A case remains about the task, not the vendor’s command line.

```yaml
schema: paideia.case.v1
id: evidence-backed-note
agent: reporter                         # selected native runtime profile
input: |
  Write a short note using the supplied evidence.
  Validate it, file the validated version, and send its receipt to the editor.
fixtures:
  evidence: ./fixtures/transport-order
  memory: ./fixtures/memory-before-assignment
  tools: ./fixtures/filing-tools
outputs:
  note: out/note.json

stages:
  - id: mechanics
    checks:
      - id: valid_json
        eval: json-schema
        input: artifact:note
        schema: ./schemas/note.schema.json
      - id: clean_copy
        not:
          eval: contains-any
          input: artifact:note#/body
          values: ["the supplied record", "this filing can say"]
      - id: valid_handoff
        eval: tool-sequence
        order: happens-before
        steps:
          - tool: validate
            result: {status: passed}
            bind: {digest: result.artifact_sha256}
          - tool: file
            args: {artifact_sha256: "$digest"}
            result: {status: accepted, artifact_sha256: "$digest"}
            bind: {receipt: result.receipt_id}
          - tool: notify
            args: {recipient: editor, receipt_id: "$receipt"}
            result: {status: delivered}
      - id: durable_bytes
        eval: fixture/filing-receipt
        artifact: note
        expected_author: reporter
    gate:
      all: [valid_json, clean_copy, valid_handoff, durable_bytes]

  - id: quality
    when: {passed: mechanics}
    checks:
      - id: grounding
        eval: llm-rubric
        input: artifact:note
        evidence: fixture:evidence
        judge: editorial-judge
        rubric: ./rubrics/grounding.md
      - id: prose
        eval: llm-rubric
        input: artifact:note#/body
        judge: editorial-judge
        rubric: ./rubrics/prose.md
      - id: relevance
        eval: embedding-similarity
        input: artifact:note#/body
        reference: ./fixtures/transport-order/abstract.txt
        model: relevance-embedding
        metric: cosine
        calibration: ./calibration/relevance.json
    score:
      linear:
        grounding: 0.60
        prose: 0.30
        relevance: 0.10
      minimum: 0.80
    gate:
      all:
        - {score: grounding, at_least: 0.90}
        - {score: quality, at_least: 0.80}
```

A recognized tool name is still raw evidence, not a semantic judge. Tool-use, arguments, results, counts, order, files, text matching and schemas are **mechanical evaluators**. Prompt judges and embedding comparisons are model-assisted evaluators. Custom plugins may introduce other methods; these categories are descriptive, not a closed dispatch list.

Each registered evaluator supplies an ID/version, configuration schema, required observations, and an async evaluation function over immutable capture/artifact references plus an abort signal and budget. It returns a common result: status, optional normalized score, evidence references, diagnostic, measured usage/cost and elapsed time. A custom TypeScript evaluator is a trusted module registered by project configuration, not arbitrary code embedded in YAML. Unknown evaluator IDs, invalid options and invalid results fail configuration/evaluation explicitly. Plugins run outside the agent’s writable workspace; a process boundary is required for genuinely untrusted plugins.

Logical nodes compose evaluator results: `all`, `any`, `not`, numeric thresholds and explicit conditions. Mechanical sequence/count operators inspect events; they are not another scripting language. References resolve to previous results or immutable inputs, with cycle detection. Future reuse should use named local references and checked argument substitution, not broad templating that can execute code or fetch remote files during parsing.

**User-required authoring flexibility:** make existence/absence, matching, counts
and temporal predicates first-class, alongside arbitrary registered evaluators.
Authors must be able to nest logical combinations and reuse parameterized
rulesets. An existence check means that matching evidence is present; it does not
require an order. No matching call in a complete trace fails an existence check;
no matching call in an incomplete trace is unknown. Absence can be established
only over a declared, completely
observed scope: a missing event in a truncated trace is unknown. An ordered check
matches a sequence and its bindings; unrelated extra events are permitted unless
the rule explicitly asks for an exact sequence. Distinguish call dispatch from
successful completion in both predicates.

**Two independent orders:** event-order predicates evaluate the subject's actual
behavior, while stages/dependencies determine when Paideia evaluates rules. A
cheap schema check before an expensive judge says nothing about the order of
the subject's tool calls. Each result must expose both its matched evidence and
its evaluation dependencies so this distinction remains visible in the UI.

Use YAML 1.2 with unique string keys, no custom executable tags, bounded input/alias expansion, no silent unknown keys and clear source locations in errors. Keep sequential stages in arrays; mapping order must not become execution order. A resolved JSON plan and its digest accompany the original YAML. [YAML specification](https://yaml.org/spec/1.2.2/), [TypeScript YAML parser controls](https://eemeli.org/yaml/).

### Results and progressive execution

| Result | Meaning | Promotion and scoring |
|---|---|---|
| `pass` | Required observation exists and the criterion is met | Eligible evidence; score may still be fractional |
| `fail` | Observation establishes a violated criterion | A mandatory gate blocks promotion |
| `unknown` | Necessary observation coverage is unavailable, incomplete or redacted, so the criterion cannot be decided | Cannot satisfy a mandatory gate; do not invent zero measurements |
| `error` | Evaluator/adapter infrastructure failed or returned invalid data | Invalid experiment evidence; retry only under the declared policy |
| `skipped` | A declared condition or earlier gate prevented execution | Not success and not an observed failure; record the reason |

`not` flips only pass/fail. `not(unknown)` stays unknown. `all` is false if a child is decisively false, true only when all are true, otherwise unresolved; `any` is true if a child is decisively true, false only when all are false, otherwise unresolved. Errors and skipped children remain visible in coverage even when another child determines a logical result. An unknown condition cannot be treated as false to evade a required branch. A failed gate blocks its dependent expensive stage, while independent cheap checks may still run to produce a useful complete diagnostic.

For a declared linear score `S = sum(w_i * s_i)` with nonnegative weights summing to one, preserve the declared denominator. Do not renormalize surviving checks to turn 0.6 of assessed work into 100%. Report the observed contribution, assessed weight and an interval `[observed, observed + missing_weight]`. A candidate can be certified only after all required gates pass and required scoring coverage is complete. Skips caused by failure stay in the experiment denominator; an intentionally inapplicable branch needs a predeclared applicability/weight policy that is independent of the candidate’s wishes. A zero weight does not automatically pass a check.

### Order must bind the result

`validate` followed by `file` is insufficient. The fixture tool authority must record which immutable bytes it validated and a successful result; the filing authority must attest the same digest and author; the accepted receipt must identify the durable object; the notification must reference that receipt. Verify the final bytes independently. Reject a changed artifact, stale receipt, copied receipt from another trial, wrong identity or unsuccessful validation followed by filing.

Use correlated call IDs, trusted monotonic sequence numbers within a source, and explicit causal references across sources. A timestamp alone cannot prove that one parallel tool completed before another began. Distinguish tool proposal, dispatch, start, completion and persisted side effect. If the event source cannot establish the required relation, return unknown. Tool aliases map a fixture operation to declared raw runtime names and schemas; preserve both identities in the trace. A shell command that mentions a tool’s name is not proof that the tool executed.

## Runtime adapters and capture

The neutral adapter contract should expose: capabilities, prepare, start/submit, an event stream, collect artifacts/terminal result, cancel and cleanup. Preparation receives a resolved case, candidate, isolated workspace/home, selected model identity and declared tool fixtures. The adapter returns a run handle, never a production agent handle. Every advertised capability needs positive and negative conformance evidence.

| Subject | Preferred observed interface | Limits to declare |
|---|---|---|
| Daimon native Pi | Public harness API and opt-in capture v2; fixture tools independently journal effects | Core lacks a neutral streaming trace API; post-turn capture may be missing on crash |
| Daimon Codex/Grok | Public execution boundary plus fixture MCP journal; future engine-owned event export | Current synthetic Pi terminal event omits the internal tool chain; native/broker paths differ |
| Standalone Codex | Pinned `exec --json`, terminal status and usage, native artifact snapshots; optional correlated rollout reader | Published events are not guaranteed to be the exact provider request; some usage arrives only at termination |
| Standalone Claude Code | Pinned `--print --output-format stream-json`; controlled tool hooks/journal and artifacts | Hooks have rejection gaps; final JSON/usage is not exact provider capture; inherited config can change the subject |
| Standalone Pi | Public SDK session events or RPC JSONL; explicit tools and resource loader | RPC acceptance is not completion; fixture/provider settings still determine reproducibility |

Codex’s documented stream distinguishes thread/turn/item events, including commands and MCP calls. Claude documents streaming mode and tool hooks, but says some validation rejections occur before hooks. Pi documents async acceptance separately from eventual completion and exposes tool start/update/end events. These distinctions belong in capability declarations and decoder tests. [Codex noninteractive](https://developers.openai.com/codex/noninteractive/), [Claude streaming](https://code.claude.com/docs/en/headless), [Claude hook limits](https://code.claude.com/docs/en/hooks#posttoolusefailure), [Pi RPC](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/rpc.md).

A trace envelope needs schema, run/case/candidate IDs, adapter/runtime/model versions, effective configuration hashes, fixture hashes, start/end state, and observation coverage by category. Each event carries source identity, sequence/call/parent IDs, kind, raw type/name, normalized operation if mapped, arguments/results or protected references, timestamps and completeness/redaction status. Store raw streams separately from normalized events. Unknown event types survive capture and degrade dependent checks; never silently disappear into a “complete” trace.

Artifacts are content-addressed snapshots with relative paths, byte counts, SHA-256, provenance and capture boundary. Assertions cite event IDs and artifact digests rather than unverified model quotations. A report contains per-check statuses, gates, scores/coverage, diagnostics, repetitions and usage—not just an average. A candidate bundle contains editable file/slot content, parent candidate ID, source hashes, fixture/evaluator locks and the evaluation report that selected it. It is a reviewed source change, not an executable deployment receipt.

## Isolation, rescoring and generalization

Clone frozen evidence, memory and initial files for every attempt. Fixture tools may have state, but it is reset per trial and their journal lives outside the subject’s writable directory. Separate deterministic fixture trials from explicitly labeled integration trials. Frozen tools answer controlled queries or produce controlled receipts; they must not replay a success to an unrelated request. Keep schemas fixed when evaluating prompt changes.

Use the existing sandbox/container boundary rather than trusting a prompt that says “do not browse.” Agent access to the external network is denied except declared model transport and fixture endpoints. Provider-hosted search or remote MCP can bypass an ordinary container egress boundary; those must also be disabled when supported and verified. Record an inability to enforce the policy. Inspect’s bridge documentation explicitly calls out this distinction. [Inspect sandbox capabilities](https://inspect.aisi.org.uk/agent-bridge.html#granted-capabilities).

Evaluation definitions, reference answers, hidden test labels, signing authority and cost ledgers stay outside agent-writable state. Native config discovery, memory, skills, prompt snapshots and session resume must be controlled and recorded. Do not resume a prior session when testing a candidate prompt: it may keep the old effective prompt or remembered answers. Preserve the subject’s actual authorized login mechanism without copying production state into fixtures.

A frozen memory *ledger* alone is insufficient if retrieval can change: pin Mneme version, authority/scopes, recall settings, embedding model/cache and evidence cutoff. Prefer Mneme’s existing memory and ablation seams. Exact replay of model behavior is not promised; reproducibility means reconstructing recorded conditions, not forcing a stochastic model to emit the same words.

Cache a capture by candidate/effective configuration, runtime/adapter/model, case/fixture/memory, tool versions, relevant environment and repetition ID. Cache a score separately by capture digest, evaluator implementation/configuration, rubric/model and judge repetition. A rescore is not another independent agent sample. If new criteria require observations the capture lacks, mark unknown or explicitly recollect; do not infer them from the final answer.


```text
   Frozen train cases + seed prompt
                   ↓
        DSPy proposes candidate ←───────┐
                   ↓                    │
       Paideia runs native agent        │ train feedback; bounded
                   ↓                    │
  Mechanical gates + semantic scores ───┘
                   ↓
     Validation selects candidate
                   ↓
      Freeze candidate and rubric
                   ↓
Sealed test: baseline versus candidate
                   ↓
  Local bundle + evidence for review
```

Before optimization, freeze the criteria, weights, references, judge calibration and promotion thresholds. Split by underlying event/evidence family and time, not random paragraphs: near-duplicate articles, shared source packets and memory entries can otherwise cross the split. Training supplies actionable feedback; validation chooses a candidate; the sealed test is opened only for the predeclared final comparison. Once results influence a new revision, that test is development data and a new holdout is needed.

Start with a small pilot and label its result exploratory. Measure the baseline on all pilot cases, identify runtime/instrumentation failures separately from prompt failures, and optimize only supported editable text. Use at most three candidate/reflection rounds for the initial experiment. Freeze the selected candidate before running baseline and candidate on the same held-out cases with fresh sessions. Repeat stochastic cases, randomize execution order and show per-case failures plus paired score/cost differences. A small set cannot justify “the organization will now always work.”

GEPA’s published experiments support studying reflective prompt optimization; their benchmark savings are not a forecast for this newsroom or its long-context CLI sessions. Budget actual rollouts and judge/reflection work, not just optimizer “metric calls.” Feedback may be requested again without another native run. A confirmed harness/tool bug goes to its owner instead of teaching prompts to work around the broken runtime. [GEPA paper](https://arxiv.org/abs/2507.19457).

### Judges must be calibrated

Calibrate against a small human-labeled set containing clearly good, clearly bad and borderline outputs. Rubrics should name observable shortcomings and require cited evidence spans, not reward elaborate self-explanations. Separate factual grounding, substantive information, clarity and voice; an attractive style cannot compensate for unsupported claims. Use blinded candidate identities and randomized A/B order for comparisons; repeat or reverse borderline comparisons and retain disagreement. A different-vendor final judge is useful independent evidence, not an objective truth oracle.

Known LLM-judge limitations include position, verbosity and self-preference biases. Report agreement with the human calibration labels and audit a sample of apparent gains. Do not claim a historical benchmark’s agreement rate applies to the current models or writing. [MT-Bench judge study](https://arxiv.org/abs/2306.05685), [self-preference study](https://arxiv.org/abs/2410.21819).

Treat candidate outputs and source documents as untrusted data inside a judge request. Delimit them, use a fixed rubric and typed response, keep judges away from tools they do not need, and include adversarial examples that say “ignore the rubric” or forge evaluator success. Those measures reduce attack surface; they do not prove immunity. Optimizing against an imperfect judge creates pressure to exploit it. [Judge prompt-injection study](https://arxiv.org/abs/2504.18333).

Embedding similarity is useful for relevance, semantic overlap or duplicate detection. Pin model/version, vector normalization, distance formula, reference digest and calibration. High similarity can coexist with a reversed fact, wrong number or negation: it is not a grounding test. Keyword bans likewise catch specific leaks, not good prose. [Embedding assertion mechanics](https://www.promptfoo.dev/docs/configuration/expected-outputs/similar/).

## Subscription-backed optimization and judging

The user requires DSPy to consume our authenticated subscriptions through
Paideia. There are two separate integrations: the subject adapter runs the agent
being evaluated, and an inference adapter supplies text generations for DSPy's
reflection/proposal model and semantic judges. They may select different CLIs,
models and subscription profiles. Using a subscription for the subject alone
does not satisfy this requirement.

Follow-up source inspection recommends pinning DSPy **3.3.1** for the first
subscription bridge: its `BaseLM` supports `forward_contract = "typed_lm"` and
`forward(LMRequest) -> LMResponse`; ordinary calls still return the text lists
GEPA reflection expects. Current main has moved toward `dspy.LM(engine=...)`,
so these contracts must not be mixed. This is source-level feasibility, with
no bridge execution yet. [Pinned BaseLM](https://github.com/stanfordnlp/dspy/blob/3.3.1/dspy/clients/base_lm.py), [pinned GEPA reflection](https://github.com/stanfordnlp/dspy/blob/3.3.1/dspy/teleprompt/gepa/gepa_utils.py), [migration](https://dspy.ai/community/normalized-lm-api-migration/).

The proposed Python bridge must connect DSPy's public custom-model interface to
Paideia's subscription inference service. A generation request and result need
versioned prompt/messages, supported options, actual model identity, output,
terminal status and honest usage metadata. This is a required integration to
prove, not an already working bridge. Authentication stays with each CLI's saved
login mechanism. Do not copy credentials into case workspaces, require API keys,
or fall back to an API provider when login, quota or a requested feature fails.
Judges and reflection run in fresh bounded contexts with unrelated tools and
customizations disabled; subject runs retain their declared native tool loop.

Capabilities must distinguish text generation, structured output, embeddings,
sampling controls and cancellation. Unsupported controls cannot be silently
dropped or reported as honored. Text subscriptions do not automatically provide
embedding vectors: use an explicitly configured local embedding model or another
authorized backend, with no hidden paid-API fallback. Judge/proposal/subject
usage remains separately attributable. CLI quota exhaustion is an explicit
experiment pause/failure reason, not a reason to bill another provider.

Bind every enabled inference route explicitly, including reflection, judges,
teachers and DSPy defaults. Reject unspecified/API-backed routes and unsupported
optimizer features before generation. The first conformance target is one text
generation, GEPA reflection and one semantic judge, not every DSPy optimizer.
Read-only CLI access is not tool-free; inference-side tool isolation needs its
own verified capability. Local CLI preflight found saved Claude and Codex
subscription logins, and a Grok login record; no generation was run in this check.

## Local training visualizer

The visualizer is a required local live-and-replay view over Paideia's persisted
experiment events. Its first useful surface should show:

- Experiment phase, active case/candidate, completed work, failures and remaining
  declared budget. A disconnected or stalled stream must be visible.
- Candidate lineage and prompt diffs, baseline comparisons and separate training,
  validation and final test results, with repeated-run variation and coverage.
- The authored rule tree, evaluation dependencies and each predicate's result,
  weighted contribution, skipped/unknown reason and matched event/artifact evidence.
- The subject's observed tool sequence separately from evaluation execution;
  inspect the exact artifact and receipt behind an order or existence assertion.
- Subject, optimizer and judge usage, plus embedding usage where applicable;
  distinguish subscription accounting, API-equivalent estimates and unknown values.

The runner owns experiments; the visualizer reads their events. Page loads,
refreshes and replay must not start cognition, rerun a judge or recompute an old
score with changed rules. A deliberate rescore is a new identified evaluation
using the saved capture. The view reconnects by event identity, retains original
results and shows capture/evaluator versions. It exposes only approved projections
of private traces, and keeps sealed test inputs/results inaccessible during
optimization. The CLI must remain usable without the visualizer.

## Cost and runtime limits

Run an initial eight native trials—four representative cases, twice—before promising an optimization budget. Record actual model identity, input tokens, cache-read/write subsets where emitted, output tokens, number of model requests if observable, tool calls, duration, terminal status and measurement completeness. Measure judge and reflection calls separately. These are proposed pilot counts, not trials already run.

Do not add cache-read tokens to an input count that already includes them. Do not count tool calls as model calls. Treat absent cost or usage as unknown, including a CLI’s placeholder zero. Keep three fields distinct: measured tokens, API-price equivalent using a dated rate card, and actual billed dollars. A subscription seat normally does not report a per-run bill; this package cannot infer a percentage of subscription allowance from tokens alone. Failed, canceled and retried runs are part of cost.

Enforce wall-clock/process limits and bounded output immediately. Reserve budget before dispatch; stop launching work when the remaining budget cannot cover its declared maximum. A CLI that reports tokens only at the end cannot enforce an exact live token/dollar ceiling; label that bound as terminal accounting and expose possible overshoot. A faithful API/proxy adapter with request-level usage can enforce more closely. Unknown usage prevents a claim of compliance with a strict dollar cap, even if a time cap was honored.

After the pilot, report `native trial cost × planned trials + judge cost + reflection cost`, with an observed range and cancellation allowance. Set explicit experiment-wide limits, one infrastructure retry policy and a no-improvement stop. Prefer the cheapest candidate meeting the fixed quality gates, and publish quality/cost separately in the local report. No expected savings percentage is justified yet.

## First vertical slice and acceptance

1. **Capture and rescore:** one small fixture task through two independent native harnesses, including one outside Daimon, fixture MCP/tool journal, artifact snapshots, JSONL capture and readable YAML using mechanical checks plus one semantic judge. An exported trace can be rescored without invoking the subject again.
2. **DSPy propagation proof:** a real predictor and scoped adapter change one instruction slot, run the same native runtime, and show the changed text in its effective captured request. A separate test proves demonstrations reach their declared slot if that feature is included. Reflection/judging must never route through the subject adapter.
3. **A bounded experiment:** freeze cases/rubrics, run the pilot, optimize within the declared cap, select on validation, compare against baseline on a sealed small test set, and emit a local candidate bundle with evidence. No automatic deployment.
4. **Runtime neutrality acceptance:** run the same case and evaluation plan through both adapters, changing only the selected runtime profile and its declared bindings. Verify the standalone adapter works without Daimon installed. Adding it must not require runtime-specific branches in the core or evaluator language. Unsupported observations remain explicit; two working integrations do not certify unimplemented adapters.
5. **Subscription and visualizer acceptance:** run real DSPy proposal and semantic-judge generations through the selected authenticated subscription adapters, with API-key fallbacks disabled. Exercise login/quota/unsupported-option failures. Show the same experiment live and from saved events; opening, refreshing and replaying the view must create no agent or inference calls and preserve the scored evidence.

Offline mutation tests must catch: deleted tool use, failed validation, wrong digest, out-of-order completion, same digest with wrong author, fake/cross-run receipt, edited bytes after validation, truncated trace, missing terminal event, evaluator timeout, NaN/out-of-range score, duplicate YAML keys, unknown evaluator, `not(unknown)`, skipped judge denominator inflation, and attempted changes to locked prompt/policy files. Do not reject a harmless extra read unless the case explicitly requires an exact sequence.

Adapter conformance needs positive evidence that a process did real work and negative evidence that missing or malformed output is not success. For the DSPy bridge, changing/deleting the candidate instruction must change the measured native input and cause a deliberately sensitive fixture to fail. The final integration gate uses actual pinned runtimes; toy child scripts test the runner, not agent quality. Full suites/build checks happen at the commit boundary, with bounded independent review. No live production credentials, writable memory or network rooms are needed for these tests.

## Remaining decisions and limits

- The YAML is a proposal. Agree its few core nodes before implementing a large logical language.
- Literal DSPy requires the small Python boundary. The TypeScript core should not be tied to optimizer internals.
- Native CLI capture and usage completeness require engine-specific conformance; current Daimon summaries cannot supply all of it.
- Exact artifact identity requires trustworthy fixture/filing evidence, not just event-name matching.
- Existing captures can diagnose a failure; they cannot reveal unexposed provider internals or establish that a different prompt would have behaved better without another trial.
- Optimization can improve measured performance on held-out examples. It cannot certify perpetual autonomous production from a small benchmark.

## Research provenance and disagreements

The requested Grok research ran through the global deep-research wrapper on the 4090 workstation, in a separate headed Chrome profile on display `:99`. Login passed. The first attempt refused to send because Expert selection did not verify; a narrow repair for the new promo dismissal and radio menu allowed the second attempt to verify **Expert**, send, finish, and capture **20,998 characters with 26 citation links** and the requested completion sentinel. The original reply HTML was preserved. The local host timestamp was about 01:10–01:16 Berlin; the runner's own timestamps differ, so they are retained as raw evidence rather than treated as synchronized clocks.

Raw intake and HTML live under ignored `.runtime/research/`. They are untrusted research leads. This report independently checked the primary sources it cites and read actual local code. No Paideia runtime or optimization experiment ran, and the Grok subscription research run supplies no API-token invoice.

Three external-report claims were deliberately not adopted:

- Its claim that DSPy necessarily means rewriting the native agent is too strong: the public adapter/predictor seam supports a proposed bridge, subject to conformance testing.
- Its “eligible and fired” denominator wording could hide skipped checks. This proposal keeps the declared score denominator and reports missing weight explicitly.
- Its claim that GEPA has no server surface is stale: current documentation exposes `EvalServer`; that still does not establish a ready-made TypeScript Paideia bridge. [GEPA EvalServer](https://gepa-ai.github.io/gepa/api/optimize_anything/EvalServer/).

The external report's recommendation to defer all DSPy integration and its separate “behavior” evaluator type also do not reflect the user's subsequent requirements. The synthesis treats process assertions as mechanical evaluators and includes DSPy propagation proof in the first useful slice.

Local source revisions inspected:

| Repository | Commit |
|---|---|
| Daimon merged source | `599f9c06383eca2db50c99d7bcfba91e889a79ab` |
| Mneme local checkout | `28a3a299426b8af89cd69173df146ace9531edca` |
| Spawnfile local checkout | `b6afd9e74c778ea17ed0abaff5a6cc8c7eda1b0c` |
| Simfile local checkout | `4bc209e9a7c46523ba7e89dc8d253a8c89b35c8d` |
| Stele local checkout | `f904b76ea7c473da7ba2bbd5d3e39b82d799fe86` |

Inspected areas: repository guides and ownership spec; Daimon core/harness, prompt loader, raw capture, CLI spawn/session/decoder, turn usage and world-trajectory code; Mneme runtime/contract/recall controls; Simfile and Stele public ownership/export contracts. This was not an exhaustive review of all source files. Installed CLI help was checked for Codex `0.154.0` and Claude Code `2.1.270`; those versions were not assumed to match production. Current upstream DSPy/GEPA source snapshots and hashes are retained locally; an implementation must pin released versions and retest the seams.

Paideia's root README and AGENTS were checked: both correctly describe research-only status and the agreed ownership boundaries. No concrete inconsistency was found.

=== REPORT COMPLETE ===
