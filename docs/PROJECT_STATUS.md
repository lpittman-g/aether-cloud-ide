# Project status — Aether Cloud IDE

**Repo:** https://github.com/lpittman-g/aether-cloud-ide  
**Updated:** 2026-08-06

## Done

- [x] Replit-style IDE (Next.js + Monaco + Express + Socket.io sandbox)
- [x] Repl dashboard + Python / JS / HTML templates
- [x] Docker → Judge0 → process sandbox fallback
- [x] GitHub repo + merged PRs (#1–#6)
- [x] CI workflow (backend smoke + frontend build)
- [x] Auto-merge workflow for `cursor/*` branches (repo may need auto-merge enabled)
- [x] AWS CloudFormation + `launch.sh` + `bootstrap-from-keys.sh`
- [x] Docs vault under `docs/` + agent protocol

## Blocked

- [ ] **AWS API credentials** for account `583968735276` not yet in agent/GitHub secrets  
  - Console user `Cursor` exists; need Access Key ID + Secret pasted once  
  - Then bootstrap + EC2 launch can run unattended

## Next

1. Create IAM access key for user `Cursor` and store in GitHub/Cursor secrets (`docs/SECRETS.md`)
2. Run `./infra/aws/bootstrap-from-keys.sh`
3. Confirm http://\<eip\>:3000 health
4. Rotate any passwords that appeared in chat

## Key PRs

| PR | Title | State |
| --- | --- | --- |
| #1 | Add Aether Replit-style cloud IDE | Merged |
| #2 | Hands-off CI and AWS auto-deploy | Merged |
| #5 | Default AWS deploy to ap-northeast-1 | Merged (later superseded toward us-east-2) |
| #6 | Autonomous AWS bootstrap for Cutline account | Merged |
