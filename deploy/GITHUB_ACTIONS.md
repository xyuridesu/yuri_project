# GitHub Actions 自动部署

仓库地址：

```text
https://github.com/xyuridesu/yuri_project
```

推送到 `main` 或 `master` 后，`.github/workflows/deploy.yml` 会自动打包代码并上传到服务器。

## 需要在 GitHub 仓库设置 Secrets

进入仓库：

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

添加：

```text
SERVER_HOST=121.43.254.231
SERVER_USER=coder
SERVER_PORT=22
SERVER_SSH_KEY=<部署私钥内容>
```

不要把私钥发到聊天里。私钥只粘贴到 GitHub Secrets。

## 服务器 sudo 权限

GitHub Actions 不能手动输入 sudo 密码。需要在服务器上允许 `coder` 执行部署所需命令时免密 sudo。

在服务器 root 终端执行：

```bash
cat >/etc/sudoers.d/yaoguang-deploy <<'EOF'
coder ALL=(root) NOPASSWD: /usr/bin/apt, /usr/bin/tee, /usr/bin/cp, /usr/bin/mkdir, /usr/bin/rm, /usr/bin/ln, /usr/sbin/nginx, /usr/bin/systemctl, /usr/bin/chown
EOF
chmod 440 /etc/sudoers.d/yaoguang-deploy
visudo -cf /etc/sudoers.d/yaoguang-deploy
```

## 数据保护

自动部署不会上传 `data/`。服务器上的用户、帖子、评论和收藏保存在：

```text
/var/www/yaoguang-forum/data/db.json
```

每次部署前会备份到：

```text
/home/coder/backups/yaoguang-forum/
```
