# Task Corpora

Owns generic authored task datasets used to evaluate agents, not unit tests of
Paideia's source. No runnable YAML language or task suite is implemented yet.

- One YAML file is one dataset with inline records. Bind train/test roles at invocation;
  validation may partition training groups. Group related datasets, fixtures and rubrics
  into named suites, each with a guide and CLAUDE.md link when implemented.
- Nest suites by coherent task family when they grow; avoid one global cases or
  fixtures folder collecting unrelated projects.
- Keep records readable from simple checks through composed/ordered evaluations.
  Reuse named rules and fixtures through the agreed authoring contract.
- Freeze evidence families and prevent related records leaking across splits.
- Generic sample data may be tracked. Private corpora, production memory and runs
  stay with their owning projects. Illustrative project-specific authoring proposals
  belong in examples/, including the newsroom reporting reference example.
- Validate schemas, references, split integrity and representative negative cases
  once the language exists. Example YAML remains a proposal until approved.
