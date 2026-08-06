#!/usr/bin/env bash
# Launch Aether on AWS EC2 (CloudFormation + rsync over SSH).
# Prerequisites: aws CLI authenticated, an EC2 key pair in the target region.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STACK_NAME="${STACK_NAME:-aether-ide}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
KEY_NAME="${KEY_NAME:-}"

if [[ -z "$KEY_NAME" ]]; then
  echo "Set KEY_NAME to an existing EC2 key pair name in $REGION"
  echo "  KEY_NAME=my-key $0"
  exit 1
fi

KEY_FILE="${KEY_FILE:-$HOME/.ssh/${KEY_NAME}.pem}"
if [[ ! -f "$KEY_FILE" ]]; then
  echo "SSH private key not found at $KEY_FILE"
  echo "Set KEY_FILE=/path/to/key.pem"
  exit 1
fi

echo "==> Verifying AWS identity"
aws sts get-caller-identity --region "$REGION" >/dev/null

echo "==> Deploying CloudFormation stack: $STACK_NAME ($REGION)"
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --template-file "$ROOT/infra/aws/cloudformation.yaml" \
  --parameter-overrides "KeyName=$KEY_NAME" "InstanceType=$INSTANCE_TYPE" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset

PUBLIC_IP=$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='PublicIp'].OutputValue" \
  --output text)

echo "==> Instance public IP: $PUBLIC_IP"
echo "==> Waiting for SSH…"

SSH=(ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 ubuntu@"$PUBLIC_IP")

for i in $(seq 1 60); do
  if "${SSH[@]}" 'test -f /opt/aether/BOOTSTRAPPED' 2>/dev/null; then
    echo "Bootstrap ready."
    break
  fi
  if (( i == 60 )); then
    echo "Timed out waiting for bootstrap. Try: ${SSH[*]}"
    exit 1
  fi
  sleep 10
done

echo "==> Syncing app to /opt/aether/app"
RSYNC_SSH="ssh -i $KEY_FILE -o StrictHostKeyChecking=accept-new"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  -e "$RSYNC_SSH" \
  "$ROOT/backend" "$ROOT/frontend" "$ROOT/workspace" "$ROOT/package.json" \
  ubuntu@"$PUBLIC_IP":/opt/aether/app/

echo "==> Installing deps, building frontend, starting services"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
cd /opt/aether/app/backend && npm install --omit=dev
cd /opt/aether/app/frontend && npm install && NEXT_PUBLIC_API_URL=http://${PUBLIC_IP}:4000 npm run build

sudo tee /etc/systemd/system/aether-backend.service >/dev/null <<UNIT
[Unit]
Description=Aether backend
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/aether/app/backend
Environment=PORT=4000
Environment=CLIENT_ORIGIN=http://${PUBLIC_IP}:3000
Environment=WORKSPACE_ROOT=/opt/aether/app/workspace
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
User=ubuntu
Group=docker

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/aether-frontend.service >/dev/null <<UNIT
[Unit]
Description=Aether frontend
After=network.target aether-backend.service

[Service]
Type=simple
WorkingDirectory=/opt/aether/app/frontend
Environment=PORT=3000
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -H 0.0.0.0 -p 3000
Restart=always
RestartSec=3
User=ubuntu

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now aether-backend aether-frontend
sleep 2
sudo systemctl --no-pager --full status aether-backend aether-frontend || true
REMOTE

echo ""
echo "Aether is launching:"
echo "  Frontend: http://${PUBLIC_IP}:3000"
echo "  Backend:  http://${PUBLIC_IP}:4000/api/health"
echo "  SSH:      ssh -i $KEY_FILE ubuntu@${PUBLIC_IP}"
