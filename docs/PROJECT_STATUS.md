# Project status — Aether Cloud IDE

**Repo:** https://github.com/lpittman-g/aether-cloud-ide  
**Updated:** 2026-08-07

## Done

- [x] App + CI + docs vault on GitHub
- [x] GitHub Actions variables: `AWS_ACCOUNT_ID=583968735276`, `AWS_REGION=us-east-2`, `EC2_KEY_NAME=aether-cursor`
- [x] IAM user `Cursor` has AdministratorAccess; console login works
- [x] Bootstrap script ready: `infra/aws/bootstrap-from-keys.sh`

## Blocked (AWS account)

Cannot auto-create IAM access keys yet:

1. **CloudShell** — “account verification is in progress” (up to ~2 days for new accounts) in `us-east-1` and `us-east-2`
2. **IAM console** — “Create access key” control does not open under automation (0 keys exist)

Until an Access Key ID + Secret exist, agents cannot call AWS APIs or persist deploy credentials.

## Autonomous path once unblocked

1. Create key (CloudShell when verification clears, or human clicks Create access key once)
2. Agent runs:
   - `gh secret set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY`
   - `./infra/aws/bootstrap-from-keys.sh` → EC2 key + launch + store `EC2_SSH_KEY`
3. Future agents/deploys use GitHub + Cursor environment secrets with no prompts

## Requested Cursor environment secrets

`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_ACCOUNT_ID`, `EC2_SSH_KEY`, `GH_TOKEN`
