---
title: 自部署 frp 内网穿透服务
description: 自部署 frp 使公网访问内网服务，以内网穿透 Minecraft 服务端为例
publishDate: 2024-12-07T00:00:00+08:00
tags: []
draft: false
---

## 背景

我将 Minecraft 服务端部署在家中的主机上期望可多人游玩。然而，由于家庭网络缺少公网 IPv4 地址，其他玩家无法直接连接到游戏服务器。在这种情况下，我们需要借助内网穿透技术，让外部玩家能够通过内网穿透服务器访问家中的游戏服务器。

## 概念准备

### 名词解释

| 词语         | 解释                                                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minecraft    | 由 Mojang Studios 开发的沙盒游戏，玩家可以在由像素方块构成的开放世界中进行建造、探险和生存等多种活动。                                                                                                                                                        |
| 内网穿透     | 通过将局域网内的服务映射到外部网络，使外部用户能够访问位于内网中的资源，常见应用包括通过公网访问本地的 Minecraft 服务器。                                                                                                                                     |
| 内网穿透软件 | 通过技术手段突破 NAT 和防火墙的限制，将内网设备的服务映射到公网，外部用户即可直接访问内网资源。例如，使用内网穿透软件可以让他人访问运行在家庭网络中的 Minecraft 服务器。常见工具包括 [frp](https://github.com/fatedier/frp)、[Ngrok](https://ngrok.com/) 等。 |
| 公网 IPv4    | 互联网协议第四版的公网地址，是全球唯一的，用于标识设备在公共互联网中的位置。在中国，家庭宽带用户通常没有公网 IPv4 地址，而是通过 NAT（网络地址转换）共享一个公网地址，使得外部 IPv4 网络无法直接访问家庭内网设备。                                            |

### 其他信息

Minecraft 有基岩版和 Java 版，以下表格列出它们的区别：

|                | 基岩版 | Java 版 |
| -------------- | ------ | ------- |
| 网络协议       | UDP    | TCP     |
| 默认服务器端口 | 19132  | 25565   |

## 部署

本文将使用 **frp** 来实现内网穿透。

### 环境要求

该部署需要两台机器，分别作为内网穿透的服务端和客户端。

|               | 服务端               | 客户端                                   |
| ------------- | -------------------- | ---------------------------------------- |
| 系统          | Ubuntu 22.04.4 LTS   | Windows Server 2022                      |
| 具备公网 IPv4 | ✅                   | ❌                                       |
| 服务          | 内网穿透服务端(frps) | 内网穿透客户端(frpc)<br>Minecraft 服务端 |

### 准备工作

从 [frp 发布页面](https://github.com/fatedier/frp/releases) 下载适用于各平台的 frp 软件，并解压。

例如，在有公网 IP 的服务器上，下载并解压 `frp_0.61.0_linux_amd64.tar.gz`：

```sh showLineNumbers=false wrap=false frame="none"
wget https://github.com/fatedier/frp/releases/download/v0.61.0/frp_0.61.0_linux_amd64.tar.gz
tar -zxf frp_0.61.0_linux_amd64.tar.gz
```

在家中的主机上，下载并解压 `frp_0.61.0_windows_amd64.zip`。

### 内网穿透服务端配置

1. 编辑 `frps.toml` 配置文件，内容如下：

```toml title="frps.toml"
bindPort = 7000
vhostHttpPort = 8080
```

- `bindPort`：指定服务端监听的端口，用于与客户端建立连接。确保此端口对外开放。
- `vhostHttpPort`：定义服务端接收 HTTP 请求的端口，可以通过访问 `http://[ip]:8080` 来检查内网穿透服务是否正常运行。

2. 放通端口

需要放通以下端口：

| 端口  | 类型 | 说明                    |
| ----- | ---- | ----------------------- |
| 7000  | TCP  | 内网穿透连接            |
| 8080  | TCP  | 用于 HTTP 请求检测      |
| 19132 | UDP  | Minecraft 基岩版服务端  |
| 25565 | TCP  | Minecraft Java 版服务端 |

3. 启动服务

在 frp 目录下启动 frps：

```sh showLineNumbers=false wrap=false frame="none"
nohup ./frps -c frps.toml >> frps.log &
```

> 该命令会在后台启动 frps 程序，并将日志信息追加到 `frps.log` 文件中。即使关闭终端会话，程序仍会继续运行。  
> 如果需要停止 frps，可以通过 `ps -ef | grep frps` 查找进程 ID（PID），然后通过 `kill -9 [PID]` 停止。

### 内网穿透客户端配置

0. 启动 Minecraft 服务端（此部分略）

1. 编辑 `frpc.toml` 配置文件，内容如下：

```toml title="frpc.toml" /114.51.4.19/ wrap=false
serverAddr = "114.51.4.19"
serverPort = 7000

[[proxies]]
name = "mcjava"
type = "tcp"
localIP = "127.0.0.1"
localPort = 25565
remotePort = 25565

[[proxies]]
name = "mcbedrock"
type = "udp"
localIP = "127.0.0.1"
localPort = 19132
remotePort = 19132
```

> 请根据实际情况修改 `serverAddr`（内网穿透服务端的公网 IP 地址）。

2. 编写 `frpc` 启动脚本

在 frp 文件夹下创建 `start-frpc.bat` 文件，内容如下：

```bat title="start-frpc.bat" wrap=false frame="none"
.\frpc.exe -c .\frpc.toml
```

3. 运行 `frpc`

双击 `start-frpc.bat` 启动内网穿透客户端，成功连接后将看到如下输出：

```ansi title="Windows CMD" showLineNumbers=false wrap=false
C:\Users\Administrator\Desktop\frp>.\frpc.exe -c .\frpc.toml
[1;34m2024-12-07 13:40:13.129 [I] [sub/root.go:142] start frpc service for config file [.\frpc.toml]
[0m[1;34m2024-12-07 13:40:13.177 [I] [client/service.go:295] try to connect to server...
[0m[1;34m2024-12-07 13:40:13.316 [I] [client/service.go:287] [dbb57c8289754efa] login to server success, get run id [dbb57c8289754efa]
[0m[1;34m2024-12-07 13:40:13.316 [I] [proxy/proxy_manager.go:173] [dbb57c8289754efa] proxy added: [mcjava mcbedrock]
[0m[1;34m2024-12-07 13:40:13.359 [I] [client/control.go:168] [dbb57c8289754efa] [mcjava] start proxy success
[0m[1;34m2024-12-07 13:40:13.359 [I] [client/control.go:168] [dbb57c8289754efa] [mcbedrock] start proxy success
```

4. 设置 frpc 自启动（可选）

将 `start-frpc.bat` 脚本的快捷方式拖入启动文件夹以实现自启动。

> 启动文件夹路径通常是：`C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup`

至此，内网穿透部署完成。  
接下来可以通过访问内网穿透服务器的公网 IP 来访问内网的游戏服务端。
