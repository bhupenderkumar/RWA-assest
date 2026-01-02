#!/bin/bash
# ===========================================
# RWA Platform - EC2 Deployment Script
# ===========================================
# Run this script on a fresh EC2 instance (Ubuntu 22.04 LTS)
# Usage: chmod +x ec2-deploy.sh && ./ec2-deploy.sh

set -e

echo "=========================================="
echo "RWA Platform - EC2 Deployment"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose standalone
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js (for building)
echo "📗 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
echo "📚 Installing Git..."
sudo apt-get install -y git

# Create app directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/rwa-platform
sudo chown $USER:$USER /opt/rwa-platform
cd /opt/rwa-platform

# Clone repository (user needs to run this manually with their credentials)
echo ""
echo "=========================================="
echo "✅ System setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository:"
echo "   cd /opt/rwa-platform"
echo "   git clone https://github.com/lab49/rwa.git ."
echo ""
echo "2. Create environment file:"
echo "   cp docker/.env.example docker/.env"
echo "   nano docker/.env  # Edit with your values"
echo ""
echo "3. Start the application:"
echo "   cd /opt/rwa-platform"
echo "   docker-compose -f docker-compose.yml up -d"
echo ""
echo "4. Check status:"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
echo ""
