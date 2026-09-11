# 部署到 Ubuntu 22.04

## 1. 上传代码

把项目上传到 `/var/www/yaoguang-forum`，并确保 `coder` 用户对 `data/` 目录有写权限。

用户、帖子、评论、收藏保存在服务器的 `/var/www/yaoguang-forum/data/db.json`。部署新版本前应先备份这个文件，部署包不要覆盖服务器上的 `data/` 目录。

```bash
sudo mkdir -p /var/www/yaoguang-forum
sudo chown -R coder:coder /var/www/yaoguang-forum
mkdir -p /home/coder/backups/yaoguang-forum
cp /var/www/yaoguang-forum/data/db.json /home/coder/backups/yaoguang-forum/db-$(date +%Y%m%d-%H%M%S).json
```

## 2. 启动应用

```bash
sudo cp deploy/yaoguang.service /etc/systemd/system/yaoguang.service
sudo systemctl daemon-reload
sudo systemctl enable --now yaoguang
sudo systemctl status yaoguang
```

## 3. 配置 Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/yaoguang
sudo ln -s /etc/nginx/sites-available/yaoguang /etc/nginx/sites-enabled/yaoguang
sudo nginx -t
sudo systemctl reload nginx
```

把 `server_name` 替换成真实域名后，再配置 DNS。

## 4. Cloudflare

没有域名时，Cloudflare 不能创建 DNS 记录。先用服务器公网 IP 测试；购买域名后：

1. 在 Cloudflare 添加域名。
2. 将注册商处的 Nameserver 改成 Cloudflare 提供的两个 Nameserver。
3. 添加 `A` 记录：`@` 指向服务器公网 IPv4。
4. 添加 `A` 记录：`www` 指向同一个 IPv4。
5. SSL/TLS 选择 `Full`，服务器端再用 Certbot 配置 HTTPS。

阿里云中国大陆地域的服务器公开绑定域名提供网站服务，通常还涉及 ICP 备案要求；若要免备案，应改用香港或海外节点。
