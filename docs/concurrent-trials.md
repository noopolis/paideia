# Concurrent trial implementation status

Implemented: `TrainingOptions.concurrency` and `train --concurrency` accept 1..8.
The default is the provisioned descriptor count (Spawnfile defaults to 4),
or the existing serial behavior when `/run/paideia/slots.json` is absent. Explicit
parallelism without descriptors fails before launching work. `slotsFile` /
`--slots-file` select another read-only descriptor file; trusted integrations may
supply `TrainingOptions.slots` directly. These are execution controls, not new YAML
fields. Comparison mode does not accept these controls.

The expected document is `{schema:"spawnfile.training-slots.v1", slots:[...]}`.
Each descriptor carries `index`, `workerUid`, opaque `roots`, and `ports:{base,count}`.
Preparation receives it as `NativePreparationContext.slot`; subject start receives
it as `SubjectStart.slot`. Preparation remains responsible for provisioning and
mapping the isolated resources. The native Daimon launch verifier binds the prepared
receipt to `roots.workspace`, `runtimeHome`, `workerHome`, `usageLedger`,
`preflightReceipt`, `controlRoot`, and the descriptor's identity and port block.
It does not rewrite digest-bound receipts or reconstruct a broker projection.

Leases remain held until stored trial closure, collection and report publication.
Unknown closure quarantines a slot for the run; zero usable slots fails explicitly.
The pool can continue serving other callers after quarantine. The current optimizer
still treats an unscorable native trial as an infrastructure failure, so automatic
optimization continuation after such a failure remains unsupported.

DSPy protocol v2 multiplexes callbacks with configured GEPA threads. Its replay IDs
use canonical request content and a per-content occurrence ordinal, saved in the
paired checkpoint. Host journals, training checkpoints and progress publication
serialize mutations. Terminal capture identity is independent of completion order.
Cancellation drains cooperative callbacks within the existing closure deadline;
noncooperative work remains explicitly incomplete and retains its resources.

Model-free tests cover four simultaneous stored trials, a fifth blocked until
closure and collection, out-of-order response correlation, quarantine, concurrent
journal/checkpoint publication and atomic callback budget reservations.

Paideia does not accept a runtime-neutral `maxRunRequests` option: post-hoc token
accounting cannot enforce model admission. Brokered Spawnfile training configures
`broker.maxRunRequests` (default 1000) in Daimon's shared proxy instead. That cap
covers subject, judge and optimizer requests routed through the broker, including
credential retries, and survives slot recycle and broker restart. Spawnfile retains
the budget in a dedicated volume keyed by the run's output directory across container
replacement. Capped containers set `PAIDEIA_MODEL_REQUEST_CAP=broker`; Paideia
rejects non-broker judge/optimizer routes, fallbacks and legacy defaults before
provider construction. Native graders are also rejected because their model routes
do not share broker admission. Uncapped runs retain the existing provider choices.
The launcher does not inject optimizer concurrency controls into comparisons;
comparison execution remains serial.
The full cross-repository descriptor/launch contract and actual native-agent overlap
still require integration verification. No models or external services were used.

## Declared shared-container sessions

The production CLI accepts Spawnfile's emitted `--spawnfile-execution` receipt
before parsing datasets. A static `CliDependencies.spawnfileDeclaration` registration
supplies named domain case/reconstruction hooks and explicit inference model routes.
The optional public `spawnfile/training` receiver validates canonical authoring,
context and complete dataset pins, lowers all splits inside the output mount,
and binds real compiler/reset operations. The CLI validates the provisioned slot
count, creates one persisted freshness store and constructs the native session.
Neither compiler operations nor a `trainingSession` dependency are injected by
the image integration. A conflicting injected session is refused.

Lowered moments and their immutable byte inventory persist under
`OUT/.spawnfile-execution`; resume verifies this evidence and preserves execution
identity. Each trial's generic rewind happens before its domain reconstruction
hook, which receives the fresh moment root, compilation and broker projection.
Legacy explicit `createSpawnfileSessionIntegration` composition remains available
through `@noopolis/paideia/cli`; it is independent of declared receipt activation.

Every admitted trial resets its leased slot with a fresh nonce/generation floor,
binds candidate scratch to that slot, compiles canonical source plus selected
candidate resources, then calls only the moment's declared reconstruction hook.
The hook receives the compilation receipt and supervisor-attested broker mapping.
It projects domain state and writes the native launch, including the moment's
`effectiveAt` task clock. The built-in path refuses agent/model/engine or clock
mismatches; existing rewind and native launch verifiers enforce their own evidence
contracts. No per-trial authentication copies or external staging queue are used.

After the native adapter proves closure and capture completes, `trial.captured`
durably references an immutable protected report blob containing the final
artifact bytes. Only then may `closeEnvironment` reset the slot again and advance
its persisted freshness floor. Protected preparation evidence stores the original
preflight bytes and SHA256, with its former pathname as provenance, before native
execution; overwriting that pathname during reset cannot change its evidence.
Protected
`environment.prepared` / `environment.closed` events retain candidate, moment,
compilation, generation and closure evidence. Reset and evidence persistence must
finish before `trial.completed` or durable evaluation; failure quarantines the
lease and cannot be recovered as a completed trial. Cleanup has a separate bounded
deadline, so cancellation cannot skip reset or quietly authorize slot reuse.
Capture persistence failure prevents destructive reset and retains subject scratch;
reset or closure-event persistence failure retains the already durable capture.

Adjacent tests exercise simultaneous admission, blocked callers, clean reuse,
candidate overlays, canonical broker binding, clock mutations and reset refusal.
These are fake-runtime tests. Real native moment fidelity, private-hook adoption
and a complete authored training run remain integration acceptance work.
# Declared native callbacks

`SpawnfileDeclarationIntegration.native.transportDelivery` reserves and publishes
domain transport wakes. `native.execution.externalInputs` supplies bounded domain
continuations, including research responses. Both are registered callbacks, not
JSON receipt fields. The built-in session fixes child execution and its persisted
freshness store, and retains public compiler, lease and supervisor-reset ownership.
Registrations cannot replace those operations through native options.

Declaration subprocess tests require `SPAWNFILE_TEST_SOURCE_ROOT` to point at an
explicitly provisioned, receiver-capable compiler source. CI must provision a pinned
paired revision; an arbitrary sibling directory or published package without the
receiver does not satisfy this contract.
