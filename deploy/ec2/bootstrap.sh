#!/usr/bin/env bash
# One-time setup for a fresh Amazon Linux 2023 instance (t3.small or larger). Run as ec2-user:  bash bootstrap.sh
# Can also be pasted as EC2 "user data" (it then runs as root).
set -euo pipefail
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user || true
# compose v2 plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
# 1 GB swap protects a small instance from OOM during image pulls and JVM warm-up
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 1G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
echo "Done. Log out and back in so the docker group applies, then copy deploy/ec2 here and run ./deploy.sh"
