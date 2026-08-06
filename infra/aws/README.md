# Launch Aether on AWS

Uses a single **EC2** instance with Docker (needed for the code sandbox), plus
systemd units for the Next.js frontend and Express backend.

## Hands-off (GitHub Actions)

One-time setup on https://github.com/lpittman-g/aether-cloud-ide/settings/secrets/actions :

| Type | Name | Value |
| --- | --- | --- |
| Secret | `AWS_ACCESS_KEY_ID` | IAM access key |
| Secret | `AWS_SECRET_ACCESS_KEY` | IAM secret |
| Secret | `AWS_SESSION_TOKEN` | (optional) |
| Secret | `EC2_SSH_KEY` | Full `.pem` private key contents |
| Variable | `EC2_KEY_NAME` | EC2 key pair name in the region |
| Variable | `AWS_REGION` | e.g. `us-east-1` (optional) |

After that, every push to `main` that touches the app/infra runs **Deploy AWS EC2** automatically. No local `aws login` needed.

## Manual one-command launch

```bash
export AWS_REGION=us-east-1
export KEY_NAME=your-keypair-name
export KEY_FILE=~/.ssh/your-keypair-name.pem

chmod +x infra/aws/launch.sh
./infra/aws/launch.sh
```

## Tear down

```bash
aws cloudformation delete-stack --stack-name aether-ide --region us-east-1
```

## Notes

- Security group allows `0.0.0.0/0` on 22/3000/4000 for a quick demo — tighten CIDRs for real use.
- For production, put the API behind an ALB + HTTPS and keep Docker sandboxes on a private subnet or dedicated worker fleet.
