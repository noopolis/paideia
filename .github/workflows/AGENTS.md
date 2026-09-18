# Continuous integration

Owns deterministic clean-install, typecheck, lint, coverage and build checks,
mirroring Daimon's `ci.yml` and adding this repository's own gates. TypeScript uses
Node 22; the narrow DSPy bridge uses its locked Python dependencies. Native paid
subscription probes remain explicit local acceptance checks, outside CI.

- Pin third-party actions by release commit and update the label with the pin.
- Keep permissions read-only and bound every job by a timeout.
- No deploy or publish job until separately authorized. The package is private and
  release is not approved, so there is no tag-triggered publish workflow yet.
- Run each gate as its own named step so a red run names the gate that failed.
- `@noopolis/daimon` is an optional peer with no installable version that satisfies
  the declared range. The typecheck covers every file with no exclusions; the two
  Daimon contract-parity suites skip at runtime and print why. Install the peer here
  as soon as a compatible release exists, and do not widen the skip in the meantime.
- Test files that drive the real DSPy/GEPA bridge belong to the serialized
  `real-bridge` vitest project. Do not fix their contention by raising the global
  test timeout, deleting them or marking them skipped.
