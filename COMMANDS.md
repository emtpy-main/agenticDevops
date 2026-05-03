# Deployment Command Cheat Sheet 📜

This is a complete list of every command used to build, deploy, and debug the Agentic DevOps system on EC2.

---

## 🏗 Infrastructure & Memory (Swap)
*Commands used to prevent the 1GB RAM instance from freezing.*

```bash
# Create a 2GB Swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent (Add to fstab)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Check memory and swap usage
free -h
```

---

## 🐳 Docker Management
*Commands used to manage the backend and queue containers.*

```bash
# Start/Restart the entire stack
sudo docker compose up --build -d

# Stop and remove all containers
sudo docker compose down

# Check live logs of the backend agent
sudo docker compose logs -f backend

# Fix "Permission Denied" for Docker socket
sudo chmod 666 /var/run/docker.sock

# CLEANUP: Remove all unused images/cache to free up disk space
sudo docker system prune -a --volumes -f
```

---

## 🌐 Nginx & Domain Setup
*Commands used to set up the reverse proxy and SSL.*

```bash
# Install Nginx
sudo apt update && sudo apt install -y nginx

# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/deploydash

# Enable config and disable default
sudo ln -s /etc/nginx/sites-available/deploydash /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config for errors
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔒 SSL & HTTPS (Certbot)
*Commands used to get the green lock icon.*

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL Certificate
sudo certbot --nginx -d deploydash-pratik.duckdns.org
```

---

## 🔍 Debugging & Networking
*Commands used to find why things were "timing out" or "failing."*

```bash
# Check if Nginx is listening on Ports 80/443
sudo ss -tulpn | grep nginx

# Check local Ubuntu firewall status
sudo ufw status
sudo ufw allow 'Nginx Full'

# DNS Lookup (Run on your local PC)
nslookup deploydash-pratik.duckdns.org

# Test internal Nginx response
curl -I http://localhost

# ADVANCED: Sniff packets to see if traffic reaches the server
sudo tcpdump -n -i any port 80 or port 443

# Check disk space remaining
df -h
```

---

## 📁 Filesystem & Permissions
*Commands used to manage the project files.*

```bash
# Force delete all cloned repositories to save space
sudo rm -rf repos/*

# Overwrite a file with a clean version (Heredoc)
cat << 'EOF' > src/tools/buildDockerImage.js
[PASTE CODE HERE]
EOF

# Fix permissions for the repos folder
sudo chmod -R 777 repos/
```
