# Runbook

## Local development

```bash
# Terminal 1
cd backend && npm install && npm run start   # :4000

# Terminal 2
cd frontend && npm install && npm run dev    # :3000
```

Open http://localhost:3000

## AWS launch (Cutline `583968735276`)

Prereq: IAM access keys in env (see `docs/AWS.md`, `docs/SECRETS.md`).

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-2
./infra/aws/bootstrap-from-keys.sh
```

Or, after secrets are in GitHub Actions: push to `main` or run workflow **Deploy AWS EC2**.

## Tear down

```bash
aws cloudformation delete-stack --stack-name aether-ide --region us-east-2
```

## Useful links

- Repo: https://github.com/lpittman-g/aether-cloud-ide  
- Actions: https://github.com/lpittman-g/aether-cloud-ide/actions  
- IAM Cursor user keys: https://console.aws.amazon.com/iam/home#/users/details/Cursor?section=security_credentials  
- Account console: https://583968735276.signin.aws.amazon.com/console  
