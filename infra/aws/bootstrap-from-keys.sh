#!/usr/bin/env bash
# Usage: AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... [AWS_REGION=us-east-2] ./bootstrap-from-keys.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REGION="${AWS_REGION:-us-east-2}"
ACCOUNT_EXPECT="${AWS_ACCOUNT_ID:-583968735276}"
KEY_NAME="${KEY_NAME:-aether-cursor}"

test -n "${AWS_ACCESS_KEY_ID:-}" && test -n "${AWS_SECRET_ACCESS_KEY:-}"

aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
aws configure set region "$REGION"
aws configure set output json

ID=$(aws sts get-caller-identity --query Account --output text)
ARN=$(aws sts get-caller-identity --query Arn --output text)
echo "Authenticated as $ARN (account $ID)"
if [ "$ID" != "$ACCOUNT_EXPECT" ]; then
  echo "WARNING: expected account $ACCOUNT_EXPECT, got $ID"
fi

# Persist to GitHub Actions for hands-off deploys (requires gh auth)
if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh secret set AWS_ACCESS_KEY_ID -R lpittman-g/aether-cloud-ide --body "$AWS_ACCESS_KEY_ID"
  gh secret set AWS_SECRET_ACCESS_KEY -R lpittman-g/aether-cloud-ide --body "$AWS_SECRET_ACCESS_KEY"
  gh variable set AWS_REGION -R lpittman-g/aether-cloud-ide --body "$REGION"
  gh variable set EC2_KEY_NAME -R lpittman-g/aether-cloud-ide --body "$KEY_NAME"
  gh variable set AWS_ACCOUNT_ID -R lpittman-g/aether-cloud-ide --body "$ID" || true
  echo "GitHub Actions secrets/vars updated"
fi

# Create EC2 key pair if missing
mkdir -p "$HOME/.ssh"
KEY_FILE="$HOME/.ssh/${KEY_NAME}.pem"
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" >/dev/null 2>&1; then
  aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$REGION" \
    --query 'KeyMaterial' --output text > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "Created key pair $KEY_NAME"
else
  echo "Key pair $KEY_NAME already exists in AWS (local pem may be missing)"
  if [ ! -f "$KEY_FILE" ]; then
    echo "ERROR: $KEY_FILE missing locally; delete key pair in AWS or provide pem"
    exit 1
  fi
fi

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  gh secret set EC2_SSH_KEY -R lpittman-g/aether-cloud-ide < "$KEY_FILE"
fi

export KEY_NAME KEY_FILE AWS_REGION="$REGION" STACK_NAME="${STACK_NAME:-aether-ide}"
chmod +x "$ROOT/infra/aws/launch.sh"
"$ROOT/infra/aws/launch.sh"
