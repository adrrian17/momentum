# Anti-slop plugin provenance

- Source repository: unknown. The install skill bundle did not include a top-level upstream URL or repository metadata for this plugin.
- Source revision: unknown. No source commit or pristine Git snapshot was available with the bundle; provenance is not inferred from a similarly named Ultracite plugin.
- Installed path: `tools/oxlint/anti-slop/`, copied from the install skill's bundled `assets/anti-slop/` snapshot without modifying plugin source.
- Snapshot identity: SHA-256 of the sorted per-file SHA-256 manifest for the 38 copied files, excluding this document: `9050bd7830cd83b9ff9c3540b84ba0b74896a7f457a0d993b60cab59436faa3c`.
- Intentional deviations: none to bundled plugin source. Oxlint configuration retains the prior Ultracite anti-slop rule settings and `no-runtime-typeof` type-guard option while registering this local implementation, avoiding two plugins with the same `anti-slop` name.
- Nested vendored source: `vendor/eslint-stylistic/UPSTREAM.md` records ESLint Stylistic commit `435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08` and its local adaptations.

The Effect plugin is registered because `packages/infra/package.json` declares `effect` directly. Its `no-service-constructor-imports` rule currently covers relative project imports, not package-alias imports.
