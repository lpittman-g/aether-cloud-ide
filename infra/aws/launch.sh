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

echo "==> Syncing app + engine to host"
RSYNC_SSH="ssh -i $KEY_FILE -o StrictHostKeyChecking=accept-new"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude target \
  -e "$RSYNC_SSH" \
  "$ROOT/frontend" "$ROOT/workspace" "$ROOT/engine" \
  ubuntu@"$PUBLIC_IP":/opt/aether/app/

echo "==> Building Go/Rust/Python engine + frontend"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
sudo apt-get update -qq
sudo apt-get install -y -qq golang-go rustc cargo python3-pip python3-venv >/dev/null || true

sudo mkdir -p /opt/aether/bin /opt/aether/ai
cd /opt/aether/app/engine/sandbox-rust && cargo build --release
sudo cp -f target/release/aether-sandbox /opt/aether/bin/aether-sandbox
cd /opt/aether/app/engine/go-api && go build -o /opt/aether/bin/aether-api .
sudo chmod +x /opt/aether/bin/aether-api /opt/aether/bin/aether-sandbox

rsync -a /opt/aether/app/engine/ai-python/ /opt/aether/ai/
python3 -m venv /opt/aether/ai/.venv
/opt/aether/ai/.venv/bin/pip install -q -r /opt/aether/ai/requirements.txt

cd /opt/aether/app/frontend && npm install && NEXT_PUBLIC_API_URL=http://${PUBLIC_IP}:4000 npm run build

sudo tee /etc/systemd/system/aether-ai.service >/dev/null <<'UNIT'
[Unit]
Description=Aether Python AI
After=network.target
[Service]
Type=simple
WorkingDirectory=/opt/aether/ai
Environment=PORT=5001
ExecStart=/opt/aether/ai/.venv/bin/python /opt/aether/ai/main.py
Restart=always
RestartSec=3
User=ubuntu
[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/aether-backend.service >/dev/null <<UNIT
[Unit]
Description=Aether Go engine
After=network.target aether-ai.service
Wants=aether-ai.service
[Service]
Type=simple
Environment=PORT=4000
Environment=CLIENT_ORIGIN=http://${PUBLIC_IP}:3000
Environment=WORKSPACE_ROOT=/opt/aether/app/workspace
Environment=AETHER_SANDBOX=/opt/aether/bin/aether-sandbox
Environment=AETHER_AI_URL=http://127.0.0.1:5001
ExecStart=/opt/aether/bin/aether-api
Restart=always
RestartSec=3
User=ubuntu
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
sudo systemctl enable --now aether-ai aether-backend aether-frontend
sleep 2
sudo systemctl --no-pager is-active aether-ai aether-backend aether-frontend || true
REMOTE

echo ""
echo "Aether is launching:"
echo "  Frontend: http://${PUBLIC_IP}:3000"
echo "  Backend:  http://${PUBLIC_IP}:4000/api/health"
echo "  SSH:      ssh -i $KEY_FILE ubuntu@${PUBLIC_IP}"
