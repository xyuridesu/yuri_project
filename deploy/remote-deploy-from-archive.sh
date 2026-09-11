#!/usr/bin/env bash
set -euo pipefail

APP="/var/www/yaoguang-forum"
ARCHIVE="/home/coder/yaoguang-forum-release.tar.gz"
RELEASE="/tmp/yaoguang-forum-release"
BACKUP_DIR="/home/coder/backups/yaoguang-forum"
BACKUP_FILE=""
NODE_BIN=""

echo "[1/7] Checking Node.js"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$HOME/.nvm/nvm.sh"
fi
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "$HOME/.nvm/versions/node/v24.21.0/bin/node" ]; then
  NODE_BIN="$HOME/.nvm/versions/node/v24.21.0/bin/node"
else
  echo "Node.js was not found. Install Node with nvm first, then deploy again."
  exit 1
fi
echo "Using Node: $NODE_BIN"

echo "[2/7] Installing system packages"
sudo apt update
sudo apt install -y nginx

echo "[3/7] Preparing release"
rm -rf "$RELEASE"
mkdir -p "$RELEASE"
tar -xzf "$ARCHIVE" -C "$RELEASE"
rm -rf "$RELEASE/data"

echo "[4/7] Preserving user data"
if [ -f "$APP/data/db.json" ]; then
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).json"
  cp "$APP/data/db.json" "$BACKUP_FILE"
  echo "User data backup: $BACKUP_FILE"
fi

echo "[5/7] Publishing files"
sudo mkdir -p "$APP"
sudo cp -a "$RELEASE/." "$APP/"
sudo mkdir -p "$APP/data"
if [ -n "$BACKUP_FILE" ] && [ -f "$BACKUP_FILE" ]; then
  sudo cp "$BACKUP_FILE" "$APP/data/db.json"
fi
sudo chown -R coder:coder "$APP"
chmod -R u+rwX "$APP"

echo "[6/7] Configuring service and Nginx"
sudo tee /etc/systemd/system/yaoguang.service >/dev/null <<SERVICE
[Unit]
Description=Crescent Yuri Forum
After=network.target

[Service]
Type=simple
User=coder
WorkingDirectory=$APP
ExecStart=$NODE_BIN $APP/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SERVICE

sudo tee /etc/nginx/sites-available/yaoguang >/dev/null <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/yaoguang /etc/nginx/sites-enabled/yaoguang
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now yaoguang
sudo systemctl restart yaoguang
sudo systemctl reload nginx

echo "[7/7] Health check"
curl -fsS http://127.0.0.1:3000/ >/dev/null
systemctl --no-pager --full status yaoguang | sed -n '1,10p'
echo "OK: forum is running locally."
