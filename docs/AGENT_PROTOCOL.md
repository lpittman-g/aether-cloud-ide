# Agent protocol — always persist to GitHub

When working on this repository (Aether / Replit 2 IDE), **every meaningful action must leave a trail on GitHub**.

## Required on every coding session

1. **Code** → commit on a `cursor/*-74ec` branch and open/update a PR (or push to `main` if already approved).
2. **Decisions / setup / account facts** → update files under `docs/` in the same PR (or a docs follow-up commit).
3. **Status** → refresh `docs/PROJECT_STATUS.md` (what works, what’s blocked, next step).
4. **Never commit secrets** — see `docs/SECRETS.md`. Put credentials only in GitHub Actions secrets / Cursor environment secrets.

## What to write where

| Kind of information | File |
| --- | --- |
| Current status & next actions | `docs/PROJECT_STATUS.md` |
| AWS accounts, regions, deploy path | `docs/AWS.md` |
| Azure VMAzule target | `docs/AZURE.md` |
| How to run / deploy | `docs/RUNBOOK.md` |
| Architecture | `ARCHITECTURE.md`, `DEPLOY.md` |
| Session notes (sanitized) | `docs/sessions/YYYY-MM-DD.md` |
| Secret *names* only (not values) | `docs/SECRETS.md` |

## Session note template

Create `docs/sessions/YYYY-MM-DD.md` with:

```markdown
# Session YYYY-MM-DD

## Goal
## Done
## Blocked
## Links (PRs, AWS consoles)
## Follow-ups
```

Do **not** paste passwords, access keys, session tokens, or PEM bodies into session notes.
