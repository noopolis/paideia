# Continuous integration

Owns deterministic clean-install, lint, coverage and build checks. TypeScript uses
Node 22; the narrow DSPy bridge uses its locked Python dependencies. Native paid
subscription probes remain explicit local acceptance checks, outside CI.

- Pin third-party actions by release commit and update the label with the pin.
- Keep permissions read-only and bound every job by a timeout.
- No deploy or publish job until separately authorized.
