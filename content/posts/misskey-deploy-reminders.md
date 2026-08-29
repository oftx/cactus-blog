---
title: Misskey 部署及配置避坑
description: 在 Misskey 部署时容易遇到的问题，内容包括主机配置、对象存储、反向代理配置等相关的问题，最后给出了一些另外的建议。
publishDate: 2025-11-08T17:11:46+08:00
tags: []
draft: false
---

# 前言

昨日突发奇想搭建了 Misskey 联邦宇宙实例，用于记录短的即时想法。部署过程中遇到了一些问题，甚至去询问最先进的生成式人工智能都无法解决，所以在此记录了这些问题。

> 注意，此篇文章不详细描述 Misskey 部署和配置流程，仅对部署过程中遇到的问题进行记录以便未来参考。

> Misskey 版本: v2025.10.2

借助官方文档和他人博客细致的部署流程，我得以搭建成功，感谢这些内容！下面列出了一些对我帮助较大的内容：

- [使用 Docker Compose 构建 Misskey](https://misskey-hub.net/cn/docs/for-admin/install/guides/docker/)
- [Misskey——自建一个去中心化社交平台](https://leonxie.cn/archives/misskey-deploy)
- [甲骨文云Oracle Cloud对象存储使用及用Alist和Rclone挂载](https://www.microcharon.com/tech/265.html)

接下来开始看看遇到的问题和解决方法吧。

# 遇到的问题

## 1️⃣ 服务器性能配置未达标

搭建 Misskey 的服务器需要有充足的运行内存以支持构建，引用他人博客中的内容，至少需要2核、1.5GB空余内存才有可能部署成功。

> 我正好踩到此坑。最初搭建时什么也不懂，只是按照官方文档的流程 `Ctrl + C` `Ctrl + V`，以至于我自信使用1c1g的主机运行docker构建命令，然而不出意外地因内存不足而构建失败。后来决定换到我的家里云主机（系统: Windows Server）上运行，并通过 [Cloudflare Tunnels](https://www.cloudflare-cn.com/products/tunnel/) 内网穿透提供给公网访问，使用 Tunnels 的好处是 i) 无需配置 SSL 证书和 ii) 无需服务器等。

## 2️⃣ 大陆网络 Git 克隆缓慢

大陆网络环境从 GitHub 仓库克隆缓慢，可使用代理。

代理配置完成后，打开 Git Bash，设置临时环境变量再尝试克隆，可享受较快的速度。

```
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
git clone -b master https://github.com/misskey-dev/misskey.git
```

> 因为官方文档中提到克隆后需要检出 master 分支，而官方克隆到本地的分支默认检出为 develop 分支，所以可直接使用 `-b master` 参数指定分支克隆。

## 3️⃣ 大陆网络无法构建 Docker 镜像

构建镜像过程中应全程使用代理让 Docker 访问国际网络，否则会报错。

> 构建 Docker 镜像大约耗时 3000 秒，构建过程内存几乎都是占满状态，看别人只需要 500 秒，比我主机耗时少得多。影响构建时间可能的因素是代理服务端网速、主机性能等。

## 4️⃣ 反向代理配置不全

> 如果是通过 Cloudflare Tunnels 内网穿透，则无需配置反向代理。

配置 nginx 时需要注意配置客户端上传文件大小限制和 WebSocket 支持，否则在网页使用时会出现对应的问题。

官方文档已经有关于[Nginxの設定](https://misskey-hub.net/cn/docs/for-admin/install/resources/nginx/)的说明，给出的配置是完整且可用的，但我在配置过程中只是一味地按照 AI 的操作指令做事，几乎没有看官方文档，AI 确实仍然不够可靠。

另外，在使用 frp 进行内网穿透时，我使用了 certbot 实现 SSL 证书自动部署。

可用的配置内容参考（来自官方文档）：

```nginx title="/etc/nginx/conf.d/misskey.conf" wrap=false
# For WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=cache1:16m max_size=1g inactive=720m use_temp_path=off;

server {
    listen 80;
    listen [::]:80;
    server_name <替换为你的域名>;

    # For SSL domain validation
    root /var/www/html;
    location /.well-known/acme-challenge/ { allow all; }
    location /.well-known/pki-validation/ { allow all; }
    location / { return 301 https://$server_name$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name <替换为你的域名>;

    ssl_session_timeout 1d;
    ssl_session_cache shared:ssl_session_cache:10m;
    ssl_session_tickets off;

    # To use Let's Encrypt certificate
    ssl_certificate     /etc/letsencrypt/live/<替换为你的域名>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<替换为你的域名>/privkey.pem;

    # To use Debian/Ubuntu's self-signed certificate (For testing or before issuing a certificate)
    #ssl_certificate     /etc/ssl/certs/ssl-cert-snakeoil.pem;
    #ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # SSL protocol settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Change to your upload limit
    client_max_body_size 80m;

    # Proxy to Node
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_redirect off;

        # If it's behind another reverse proxy or CDN, remove the following.
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # For WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Cache settings
        proxy_cache cache1;
        proxy_cache_lock on;
        proxy_cache_use_stale updating;
        proxy_force_ranges on;
        add_header X-Cache $upstream_cache_status;
    }
}
```

## 5️⃣ 错误配置对象存储

如果对象存储链接设置错误，会导致用户无法上传图片到存储桶或无法从存储桶中访问图像。

首先，应该在云服务商控制台创建存储桶，并将其访问权限设置为公开以便所有人可访问，并获取后续配置对象存储时需要的字段值。需要注意存储桶名称中的英文字符应为**全小写**。

接下来实现配置，需要配置的设置项有：

- Base URL
- 存储桶
- 端点
- 可用区
- Access key
- Secret key
- 使用 SSL (开)
- 使用代理 (关)
- s3ForcePathStyle (开)

以上设置项目，可用区、存储桶名称、Access key、Secret key 这 4 个配置项应该不会配置错误，需要特别注意的配置项是 **Base URL** 和**端点**，它们分别决定资源是否**可成功被外部访问**和能否**成功上传到存储桶**。

以下使用 Oracle Cloud 的服务进行举例。

对于端点(Endpoints)，可参考文档说明找到你所选地域的专用 API 端点，比如对于日本东京区域，可找到以下端点：

```
https://<object_storage_namespace>.compat.objectstorage.ap-tokyo-1.oci.customer-oci.com
```

注意需要将 `<object_storage_namespace>` 替换为存储桶的名称空间，这在控制台可看到。替换后，这就是正确的端点链接，可填写到 Misskey 对象存储配置项“端点”的输入框中。

对于 Base URL，Misskey 将使用 `Base URL + /文件名` 组成访问链接。它的获取方法的话，可以手动上传一个文件到存储桶，并复制其访问链接，删除最后的**斜杠**和文件名，即是正确的 Base URL。比如有以下文件访问链接：

```txt /https://objectstorage.ap-tokyo-1.oraclecloud.com/n/n14514191981/b/misskey-media/o/
https://objectstorage.ap-tokyo-1.oraclecloud.com/n/n14514191981/b/misskey-media/o/b43d6709-a490-46dc-9668-57f2167d7e56.png
```

高亮部分即是我们需要的 Base URL。另外你可以注意到链接中包含了可用区（ap-tokyo-1）、名称空间（n14514191981）和存储桶名称（misskey-media）的值。

## 6️⃣ 添加中继总是显示“待审核”

添加中继总是显示“待审核”，大概是因为部署 Misskey 主机的网络问题，大陆网络无法访问这些中继的网站，可以使用代理以便访问网站，中继添加完成后可关闭代理。

> 如果主机处于中国大陆网络环境，关闭代理后将无法访问那些在中国大陆无法访问的实例，即便本实例用户处于国际网络环境，也无法搜索到位于那些实例的用户。

# 其他的话

如果使用 frp 内网穿透，可在 frp 目录下使用 `nohup ./frps -c frps.toml >> frps.log &` 命令在后台启动 frps 并将日志记录到文件；停止内网穿透服务可使用命令 `ps aux | grep frps` 查看正在运行服务的PID和 `kill -9 <PID>` 来终止进程。

踩坑点应该写完了，希望配置顺利
