#!/bin/bash
# LCA·AI VPS Setup Script
# Run on a fresh Ubuntu 22.04 VPS

set -e

echo "=== LCA·AI VPS Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
apt-get install -y docker-compose-plugin

# Create app directory
mkdir -p /opt/lca-ai
cd /opt/lca-ai

# Clone or copy the deploy directory
# scp -r ./deploy/* root@your-vps:/opt/lca-ai/

# Create .env file
echo "Creating .env file..."
cat > .env << 'EOF'
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-flash
EOF

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit /opt/lca-ai/.env and add your DEEPSEEK_API_KEY"
echo "2. Place the TianGong LCA database in /opt/lca-ai/data/databases/tiangong/"
echo "3. Run: docker compose up -d"
echo "4. Set up SSL: certbot certonly --webroot -w /var/lib/letsencrypt -d api.lca-ai.ru"
echo "5. Configure DNS: api.lca-ai.ru -> $(curl -s ifconfig.me)"
