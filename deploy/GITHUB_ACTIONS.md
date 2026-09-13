# 手动部署说明

仓库地址：

```text
https://github.com/xyuridesu/yuri_project
```

当前已取消 GitHub Actions 自动部署。以后请在本地终端手动打包并上传。

## 手动部署

在 Windows PowerShell 执行：

```powershell
powershell -ExecutionPolicy Bypass -File ".\outputs\build-yaoguang-package.ps1"
powershell -ExecutionPolicy Bypass -File ".\outputs\deploy-yaoguang-to-aliyun.ps1"
```

部署脚本会通过 SSH 上传代码，并在服务器上保留用户数据。

## 数据保护

自动部署不会上传 `data/`。服务器上的用户、帖子、评论和收藏保存在：

```text
/var/www/yaoguang-forum/data/db.json
```

每次部署前会备份到：

```text
/home/coder/backups/yaoguang-forum/
```
