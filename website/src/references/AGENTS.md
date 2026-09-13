# Canonical Source References

Owns static Markdown downloads from an explicit root-doc allowlist. Imports keep
one canonical source; never read a user-supplied path or copy runtime evidence.
Verify every generated Markdown response equals its source and undeclared routes
return 404 under the configured project base.

The route is registered explicitly in Astro configuration so colocated working
guides never become public Markdown page routes. This index is its public entry.

The colocated test verifies the exact allowlist and response bytes against root
files. Website check enforces90% per-file coverage for executable endpoint code;
Astro collection and framework configuration are configuration-only sources.
