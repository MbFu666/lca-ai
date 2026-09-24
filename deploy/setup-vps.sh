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

# Firewall: only SSH/HTTP/HTTPS from outside; openLCA(8080) and API(8000) stay on 127.0.0.1 via compose
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

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
ALLOWED_ORIGINS=https://lca-ai.ru,https://www.lca-ai.ru
EOF

# Bootstrap TLS: create a self-signed placeholder so nginx starts on a fresh VPS.
# Certbot will replace it with a real Let's Encrypt cert below.
mkdir -p /etc/letsencrypt/live/api.lca-ai.ru
if [ ! -f /etc/letsencrypt/live/api.lca-ai.ru/fullchain.pem ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/api.lca-ai.ru/privkey.pem \
    -out /etc/letsencrypt/live/api.lca-ai.ru/fullchain.pem \
    -subj "/CN=api.lca-ai.ru"
  echo "Placeholder self-signed cert created (nginx can start)."
fi
mkdir -p /var/lib/letsencrypt

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit /opt/lca-ai/.env and add your DEEPSEEK_API_KEY"
echo "2. Place the TianGong LCA database in /opt/lca-ai/data/databases/tiangong/"
echo "3. Configure DNS: api.lca-ai.ru -> $(curl -s ifconfig.me)"
echo "4. Run: docker compose up -d"
echo "5. Issue real cert:  docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt certbot/certbot certonly --webroot -w /var/lib/letsencrypt -d api.lca-ai.ru --email you@example.com --agree-tos --no-eff-email"
echo "6. Reload nginx:     docker compose exec nginx nginx -s reload"
