#!/usr/bin/env bash

set -euo pipefail

sudo apt update
sudo apt upgrade -y

sudo apt install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  git \
  gnupg \
  lsb-release \
  openssh-server \
  software-properties-common \
  unzip \
  wget

sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl enable ssh
sudo systemctl start ssh

sudo usermod -aG docker "$USER"

echo "Ubuntu VM prerequisites installed."
echo "Reconnect your session before using Docker without sudo."
