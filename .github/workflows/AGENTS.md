# Continuous integration

Owns deterministic clean-install, typecheck, lint, coverage and build checks,
mirroring Daimon's `ci.yml` and adding this repository's own gates. TypeScript uses
Node 22; the narrow DSPy bridge uses its locked Python dependencies. Native paid
subscription probes remain explicit local acceptance checks, outside CI.

- Pin third-party actions by release commit and update the label with the pin.
- Keep permissions read-only and bound every job by a timeout.
- `release.yml` runs on `v*` tags: it reuses `ci.yml` as its gate, refuses a tag that
  does not match `package.json` or is not on main, and attaches the packed tarball,
  `package-lock.json` and `SHA256SUMS` to a GitHub release. It never publishes to npm
  while the package is private. Consumers pin the tarball by its checksum.
- Run each gate as its own named step so a red run names the gate that failed.
- `@noopolis/daimon` is an optional peer, installed as an exact dev dependency so the
  Daimon contract-parity suites run against a released Daimon. Bump it with each
  Daimon release the native adapter depends on.
- Test files that drive the real DSPy/GEPA bridge belong to the serialized
  `real-bridge` vitest project. Do not fix their contention by raising the global
  test timeout, deleting them or marking them skipped.
