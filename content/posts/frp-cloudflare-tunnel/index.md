---
title: frp + Cloudflare Tunnel 内网穿透
description: 用 frp 中转解决中国大陆主机连接 Cloudflare Tunnel 不稳定的问题
publishDate: 2026-10-20T12:55:14+08:00
tags:
  - frp
  - cloudflare
  - tunnel
draft: false
---
## 背景

运行在中国大陆的主机连接 Cloudflare Tunnel 不稳定，导致对外提供的服务经常无法访问。为了解决这个问题，本文提出可通过将位于中国大陆的客户端主机流量通过 frp 传输到可稳定访问 Cloudflare Tunnel 的中转服务器，在中转服务器上运行 cloudflared 服务将 http 网页公开到公网。

## 记录
### 客户端
frpc.toml
```toml
serverAddr = "***.***.***.***"
serverPort = 7000

[auth]
token = "***Token***"

[[proxies]]
name = "web"
type = "http"
localIP = "127.0.0.1"
localPort = 3000
customDomains = ["***example.com***"]
```
### 服务端
frps.toml
```toml
bindPort = 7000
vhostHttpPort = 8081

[auth]
token = "***Token***"
```

/etc/systemd/system/frps.service
```
[Unit]
Description=FRP Server Service
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/root/frp/frps -c /root/frp/frps.toml

[Install]
WantedBy=multi-user.target
```

命令运行结果
```
# sudo systemctl daemon-reload
# sudo systemctl enable --now frps
Created symlink /etc/systemd/system/multi-user.target.wants/frps.service → /etc/systemd/system/frps.service.
```

```
# sudo systemctl status frps
● frps.service - FRP Server Service
     Loaded: loaded (/etc/systemd/system/frps.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2026-10-20 11:34:39 CST; 8s ago
   Main PID: 3147989 (frps)
      Tasks: 5 (limit: 1011)
     Memory: 9.0M
        CPU: 90ms
     CGroup: /system.slice/frps.service
             └─3147989 /root/frp/frps -c /root/frp/frps.toml
```

创建 Cloudflare Tunnel
https://developers.cloudflare.com/tunnel/get-started/

![dash.cloudflare.com_tunnels_routes](1.png)

流量路径：
Frp客户端(中国大陆主机) -> Frp服务端(中转主机) -> Cloudflare Tunnel