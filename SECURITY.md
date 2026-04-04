# Security Policy

## Supported Scope

This repository currently focuses on the following security concerns:

- Leakage risks for local knowledge data
- Unauthorized outbound sending or exporting
- Command execution or path-safety issues in import, parsing, transcription, and OCR pipelines
- Sensitive data exposure in backups, restore flows, and object storage
- Prompt-injection risks that cause over-broad retrieval, over-broad compilation, or invalid authorization

## Reporting a Vulnerability

Do not disclose vulnerability details directly in public issues.

Suggested process:

1. Contact the maintainer privately first.
2. Describe impact scope, reproduction steps, potential risk, and suggested remediation.
3. Do not publish a full exploit or sensitive details before the issue is acknowledged.

If GitHub private vulnerability reporting is enabled, prefer that channel.

## What to Include

Please include, where possible:

- Affected module or path
- Reproduction steps
- Trigger conditions
- Actual impact
- Potential remediation ideas

## Response Goal

The project will try to move quickly after confirmation on:

- Severity classification
- Fix-plan confirmation
- Patch release
- Public disclosure when appropriate
