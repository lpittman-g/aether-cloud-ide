# Launch Aether on AWS

Uses a single **EC2** instance with Docker (needed for the code sandbox), plus
systemd units for the Next.js frontend and Express backend.

## Prerequisites

1. AWS CLI **v2.32+** (`aws --version`)
2. Authenticated session — prefer `aws login` (short-lived credentials)
3. An **EC2 key pair** in your target region
4. The matching `.pem` file locally

## One-command launch

```bash
# After aws login succeeds:
export AWS_REGION=us-east-1
export KEY_NAME=your-keypair-name
export KEY_FILE=~/.ssh/your-keypair-name.pem   # if not at default path

chmod +x infra/aws/launch.sh
./infra/aws/launch.sh
```

The script will:

1. Deploy `infra/aws/cloudformation.yaml` (Ubuntu 24.04, t3.medium, EIP, SG)
2. Wait for Docker + Node bootstrap
3. `rsync` the app to the instance
4. Build the frontend and start systemd services

Open the printed `http://<eip>:3000` URL.

## Tear down

```bash
aws cloudformation delete-stack --stack-name aether-ide --region us-east-1
```

## Notes

- Security group allows `0.0.0.0/0` on 22/3000/4000 for a quick demo — tighten CIDRs for real use.
- For production, put the API behind an ALB + HTTPS and keep Docker sandboxes on a private subnet or dedicated worker fleet.
