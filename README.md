# 新月百合会论坛

一个可自托管的论坛 MVP，包含注册、登录、发帖、评论、收藏、搜索和分类浏览。

## 本地运行

需要 Node.js 18+：

```bash
npm start
```

打开 <http://localhost:3000>。

数据会保存到 `data/db.json`。正式上线前建议换成 PostgreSQL/MySQL，并增加邮箱验证、限流、内容审核、管理员后台、备份和 CSRF 防护。

## Ubuntu 部署概览

```bash
sudo apt update
sudo apt install -y nginx nodejs npm
git clone <你的仓库地址> /var/www/yaoguang-forum
cd /var/www/yaoguang-forum
npm start
```

建议使用 systemd 或 pm2 管理进程，再让 Nginx 反向代理到 `127.0.0.1:3000`。Cloudflare 只有在你购买域名后才能完成 DNS 解析；没有域名时可先使用服务器 IP 测试。
