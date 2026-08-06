# Project status — Aether Cloud IDE

**Repo:** https://github.com/lpittman-g/aether-cloud-ide  
**Updated:** 2026-08-06 (evening)

## Done

- [x] Aether IDE codebase + GitHub repo
- [x] CI / deploy workflows + docs vault
- [x] GitHub Actions **variables** set: `AWS_ACCOUNT_ID=583968735276`, `AWS_REGION=us-east-2`, `EC2_KEY_NAME=aether-cursor`
- [x] Confirmed IAM user `Cursor` can sign into console with **AdministratorAccess**
- [x] Confirmed user currently has **0** access keys

## Blocked

- [ ] Creating IAM access key via automation failed (IAM “Create access key” UI does not open; CloudShell blocked: account verification in progress up to ~2 days)
- [ ] Without Access Key ID + Secret, agent cannot call AWS APIs or store deploy secrets

## What the human must do once

1. Open https://us-east-2.console.aws.amazon.com/iam/home?region=us-east-2#/users/details/Cursor?section=security_credentials  
2. Click **Create access key** → CLI → create  
3. Paste the two values into chat **or** Settings → Secrets → Actions as `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`  

Then the agent runs `infra/aws/bootstrap-from-keys.sh` (stores secrets + launches EC2) with no further prompts.

## Note on “paste it into GitHub”

- Non-secret config → already in `docs/` and GitHub **variables**  
- Secret values → GitHub **Actions secrets** only (never commit to git files)
