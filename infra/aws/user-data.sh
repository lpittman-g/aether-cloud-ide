#!/bin/bash
set -euo pipefail

# Cloud-init user data for Aether IDE on Amazon Linux 2023 / Ubuntu

export DEBIAN_FRONTEND=noninteractive

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg git
  # Docker
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  # Node 22
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
elif command -v dnf >/dev/null 2>&1; then
  dnf update -y
  dnf install -y docker git
  systemctl enable --now docker
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf install -y nodejs
fi

systemctl enable --now docker || true
usermod -aG docker ubuntu 2>/dev/null || usermod -aG docker ec2-user 2>/dev/null || true

mkdir -p /opt/aether
cd /opt/aether

# App is expected to be synced via /opt/aether/app (uploaded by deploy script)
if [ ! -d /opt/aether/app ]; then
  echo "Waiting for app bundle at /opt/aether/app…"
fi

cat >/etc/systemd/system/aether-backend.service <<'UNIT'
[Unit]
Description=Aether backend API
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/aether/app/backend
Environment=PORT=4000
Environment=CLIENT_ORIGIN=http://PLACEHOLDER_PUBLIC_HOST:3000
Environment=WORKSPACE_ROOT=/opt/aether/app/workspace
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

cat >/etc/systemd/system/aether-frontend.service <<'UNIT'
[Unit]
Description=Aether frontend IDE
After=network.target aether-backend.service

[Service]
Type=simple
WorkingDirectory=/opt/aether/app/frontend
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_URL=http://PLACEHOLDER_PUBLIC_HOST:4000
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -H 0.0.0.0 -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

echo "Aether bootstrap complete. Deploy script will install deps and start services."
