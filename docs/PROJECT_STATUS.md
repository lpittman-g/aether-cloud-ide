# Project status — Aether Cloud IDE

**Repo:** https://github.com/lpittman-g/aether-cloud-ide  
**Updated:** 2026-08-07

## Live

| Surface | URL / value |
| --- | --- |
| IDE | http://18.225.160.49:3000 |
| API health | http://18.225.160.49:4000/api/health |
| EC2 | `i-0035b7f203de1905e` (`us-east-2`), stack `aether-ide` |
| Sandbox | Docker (JS + Python verified) |

## Done

- [x] App + CI + docs vault on GitHub
- [x] IAM user `Cursor` with AdministratorAccess and active access keys
- [x] GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_SSH_KEY`
- [x] GitHub variables: `AWS_ACCOUNT_ID=583968735276`, `AWS_REGION=us-east-2`, `EC2_KEY_NAME=aether-cursor`
- [x] EC2 key pair `aether-cursor`; app under `/opt/aether/app`
- [x] Frontend HTTP 200; health `{"ok":true,"sandbox":"docker",...}`
- [x] `/api/run` JS → `42`, Python → `4` (Docker)
- [x] Auto-merge workflow updated to pass repository explicitly to `gh pr` commands (fixes non-checkout runner failure)

## Open follow-ups

1. Confirm Cursor environment secrets UI saved AWS/SSH/GH values for future agents (names in `docs/SECRETS.md`).
2. Keep `tsx` as a production dependency so EC2 `npm start` does not fail after fresh installs (this PR).
3. Optionally tighten security-group CIDRs / add HTTPS; rotate any credentials that were pasted in chat.
4. Deactivate unused IAM access keys on user `Cursor` (keep one active key for agents).

## Notes

- Screenshot key prefix `AKIA5FS2…` is **not** valid for account `583968735276` (`InvalidClientTokenId`). Active keys for `Cursor` use prefix `AKIAYP5Z…`.
- CloudShell “account verification” may still block CloudShell itself; API keys + CLI deploy path are unblocked.
