# Foreign Library Bridges

Owns narrow foreign-language interoperability that cannot be supplied by the
TypeScript core. Only the real-DSPy Python boundary is currently proposed.

- Keep neutral public protocols versioned and implementation dependencies pinned.
- Do not migrate core evaluation, capture, policy or orchestration into a bridge.
- No bridge package or executable exists yet; add checks with implementation.
- Add other language boundaries only after an actual need and architecture review.
- Each bridge keeps its tests, language tooling and focused guide together.
