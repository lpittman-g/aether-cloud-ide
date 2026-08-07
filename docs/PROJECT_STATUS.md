# Project status — Aether Cloud IDE

**Repo:** https://github.com/lpittman-g/aether-cloud-ide  
**Updated:** 2026-08-07

## Live (AWS)

| Surface | URL / value |
| --- | --- |
| IDE | http://18.225.160.49:3000 |
| API health | http://18.225.160.49:4000/api/health |
| EC2 | `i-0035b7f203de1905e` (`us-east-2`), stack `aether-ide` |
| Sandbox | Docker (JS + Python verified) |

## Azure target (pending auth / SSH)

| Field | Value |
| --- | --- |
| Public IP | `20.121.66.136` (`VMAzule-ip`) |
| Resource group | `VMAzule_group` (East US) |
| Subscription | Subscription 1 (`09ab433b-d579-4c…`) |
| Status | Documented; deploy blocked until Azure login or VM SSH access |

See `docs/AZURE.md`.

## Done

- [x] App + CI + docs vault on GitHub
- [x] IAM user `Cursor` with AdministratorAccess and active access keys
- [x] GitHub Actions secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_SSH_KEY`
- [x] GitHub variables: `AWS_ACCOUNT_ID=583968735276`, `AWS_REGION=us-east-2`, `EC2_KEY_NAME=aether-cursor`
- [x] EC2 key pair `aether-cursor`; app under `/opt/aether/app`
- [x] Frontend HTTP 200; health `{"ok":true,"sandbox":"docker",...}`
- [x] `/api/run` JS → `42`, Python → `4` (Docker)
- [x] Recorded Azure `VMAzule-ip` as alternate deploy target

## Open follow-ups

1. Complete Azure device-code / SP login; inventory VM behind `VMAzule-ip`; deploy Aether.
2. Confirm Cursor environment secrets UI saved AWS/SSH/GH values for future agents.
3. Optionally tighten AWS SG CIDRs / add HTTPS; rotate any credentials pasted in chat.
4. Deactivate unused IAM access keys on user `Cursor` (keep one active key for agents).
