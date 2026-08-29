---
title: 配置 MediaMTX 认证、录制，测试推流
description: 在 Windows 上配置 MediaMTX 媒体服务器的认证、录制，并测试推流
publishDate: 2025-09-01T15:31:06+08:00
tags: []
draft: false
---

## MediaMTX 简介

[MediaMTX](https://github.com/bluenviron/mediamtx) 是一个即用型、无依赖的实时媒体服务器和媒体代理，允许发布、读取、代理、录制和播放视频和音频流。它被设计为一个“媒体路由器”，将媒体流从一端路由到另一端。

特色功能：

- 通过 SRT、WebRTC、RTSP、RTMP、HLS、MPEG-TS、RTP [发布](https://mediamtx.org/docs/usage/publish) 直播流到服务器
- 通过 SRT、WebRTC、RTSP、RTMP、HLS 从服务器[读取](https://mediamtx.org/docs/usage/read) 直播流
- 流会自动从一种协议转换到另一种协议
- 在不同的路径中同时服务多个流
- 将流[录制](https://mediamtx.org/docs/usage/record)到磁盘
- [回放](https://mediamtx.org/docs/usage/playback)录制的流
- [认证](https://mediamtx.org/docs/usage/authentication)用户
- 将流[转发](https://mediamtx.org/docs/usage/forward)到其他服务器
- [代理](https://mediamtx.org/docs/usage/proxy)请求到其他服务器
- 通过控制 API [控制](https://mediamtx.org/docs/usage/control-api)服务器
- 在不中断现有客户端连接的情况下重新加载配置（热重载）
- 通过与 Prometheus 兼容的指标[监控](https://mediamtx.org/docs/usage/metrics)服务器
- 当客户端连接、断开、读取或发布流时[运行钩子](https://mediamtx.org/docs/usage/hooks)（外部命令）
- 兼容 Linux、Windows 和 macOS，无需任何依赖或解释器，是一个单一的可执行文件
- ...以及更多[其他功能](https://mediamtx.org/docs/kickoff/introduction)。

本文主要介绍借助 MediaMTX 进行直播流的推送和录制。

## 环境

- 系统: Windows Server 2022

## 准备

虽然 MediaMTX 是开箱即用的，但是配置时需要一些额外的东西。  
在开始配置前，你可能需要准备：

1. Linux 环境或在线 Argon2 哈希生成器  
   在配置用户认证时，需要用到 Argon2 命令生成加密后的账号和密码。有 Linux 环境可以方便运行命令，使用在线的 Argon2 哈希生成器也可以。

2. [OBS Studio](https://obsproject.com/download) 等推流软件  
   用于向服务端推流。

以上就是可能需要准备的东西，准备好后可以开始进行配置。

## 配置步骤

### 获取软件

在以下链接获取软件压缩包，Windows 系统选择后缀为 `windows_amd64.zip` 的文件下载。

- [Releases · bluenviron/mediamtx](https://github.com/bluenviron/mediamtx/releases)

下载完成后，将其中的文件解压到一个文件夹内。

进入解压后的目录，当前目录应该有以下文件：

```txt showLineNumbers=false wrap=false frame="none"
.
├── LICENSE
├── mediamtx.exe
└── mediamtx.yml
```

### 用户认证配置

在 `mediamtx.yml` 配置文件找到 `authInternalUsers` 的行，可以看到以下结构的内容：

```yml title="mediamtx.yml" /user:/ /pass:/ wrap=false
authInternalUsers:
  # Username. 'any' means any user, including anonymous ones.
  - user: any
    # Password. Not used in case of 'any' user.
    pass:
    # IPs or networks allowed to use this user. An empty list means any IP.
    ips: []
    # List of permissions.
    permissions:
      # Available actions are: publish, read, playback, api, metrics, pprof.
      - action: publish
        # Paths can be set to further restrict access to a specific path.
        # An empty path means any path.
        # Regular expressions can be used by using a tilde as prefix.
        path:
      - action: read
        path:
      - action: playback
        path:
```

在这里，需要编辑的是 `user` 和 `pass` 字段。

> [官方文档](https://mediamtx.org/docs/usage/authentication)有提到: 如果在配置文件中存储明文凭据存在安全问题，用户名和密码可以存储为哈希字符串。支持 Argon2 和 SHA256 哈希算法。要使用 Argon2，必须使用 Argon2id（推荐）或 Argon2i 进行字符串哈希。

遵循官方的建议，对用户名和密码进行字符串哈希，此处使用 Argon2 哈希。

要将 `username` 和 `password` 分别作为用户名和密码，可以使用以下命令：

```bash title="Terminal" showLineNumbers=false wrap=false
➜  ~ echo -n "username" | argon2 saltItWithSalt -id -l 32 -e
$argon2id$v=19$m=4096,t=3,p=1$c2FsdEl0V2l0aFNhbHQ$jbGRv3uI/8+RJPUZC5Xv0ybu23qVpUpUOj0x7cG3FeU
➜  ~ echo -n "password" | argon2 saltItWithSalt -id -l 32 -e
$argon2id$v=19$m=4096,t=3,p=1$c2FsdEl0V2l0aFNhbHQ$xSAZuztQ7foMRIPyqR5vSr3zeOGKXk9Bm0l3FTxl1LE
```

命令的输出结果就是哈希值，将哈希值写入配置文件：

```yml title="mediamtx.yml" /argon2:/ wrap=false
authInternalUsers:
  # Username. 'any' means any user, including anonymous ones.
  - user: argon2:$argon2id$v=19$m=4096,t=3,p=1$c2FsdEl0V2l0aFNhbHQ$jbGRv3uI/8+RJPUZC5Xv0ybu23qVpUpUOj0x7cG3FeU
    # Password. Not used in case of 'any' user.
    pass: argon2:$argon2id$v=19$m=4096,t=3,p=1$c2FsdEl0V2l0aFNhbHQ$xSAZuztQ7foMRIPyqR5vSr3zeOGKXk9Bm0l3FTxl1LE
    # IPs or networks allowed to use this user. An empty list means any IP.
    ips: []
    # List of permissions.
    permissions:
      # Available actions are: publish, read, playback, api, metrics, pprof.
      - action: publish
        # Paths can be set to further restrict access to a specific path.
        # An empty path means any path.
        # Regular expressions can be used by using a tilde as prefix.
        path:
      - action: read
        path:
      - action: playback
        path:
```

> 注意在哈希值前需要加 `argon2:`

用户认证配置完成，后续可使用用户名 `username` 和密码 `password` 进行推流。

### 录制配置

在 `mediamtx.yml` 配置文件中查找文本 `record:`，可找到以下配置：

```yml title="mediamtx.yml" /record:/ /recordDeleteAfter:/ wrap=false
# Record streams to disk.
record: yes
# Path of recording segments.
# Extension is added automatically.
# Available variables are %path (path name), %Y %m %d %H %M %S %f %s (time in strftime format)
recordPath: ./recordings/%path/%Y-%m-%d_%H-%M-%S-%f
# Format of recorded segments.
# Available formats are "fmp4" (fragmented MP4) and "mpegts" (MPEG-TS).
recordFormat: fmp4
# fMP4 segments are concatenation of small MP4 files (parts), each with this duration.
# MPEG-TS segments are concatenation of 188-bytes packets, flushed to disk with this period.
# When a system failure occurs, the last part gets lost.
# Therefore, the part duration is equal to the RPO (recovery point objective).
recordPartDuration: 1s
# Minimum duration of each segment.
recordSegmentDuration: 1h
# Delete segments after this timespan.
# Set to 0s to disable automatic deletion.
recordDeleteAfter: 24h
```

将 `no` 修改为 `yes` 即可开启录制功能。

你可以额外地将 `recordDeleteAfter` 参数数值改为 `0s` 来禁用自动删除录制的内容。

### 放通防火墙端口

后续将在 `1935` 端口使用 RTMP 推流，所以需要在防火墙放通端口，请放通需要的端口以便使其他设备可向本机推流。

### 推流

1. 双击启动 `mediamtx.exe`
2. 在直播软件设置推流链接
   推流链接类似于：

```txt showLineNumbers=false wrap=false frame="none"
rtmp://server:1935/mystream?user=username&pass=password
```

> 请将 `server` 修改为服务器 IP，`username` 修改为你设置的用户名，`password` 修改为你设置的密码。

设置完成后开始直播。

3. 查看推流状态和录制的内容
   成功连接后，可以看到 `mediamtx.exe` 有以下输出：

```cmd title="mediamtx.exe" showLineNumbers=false wrap=false
2025/08/31 22:54:20 INF MediaMTX v1.9.2
2025/08/31 22:54:20 INF configuration loaded from D:\Desktop\mediamtx\mediamtx.yml
2025/08/31 22:54:20 INF [RTSP] listener opened on :8554 (TCP), :8000 (UDP/RTP), :8001 (UDP/RTCP)
2025/08/31 22:54:20 INF [RTMP] listener opened on :1935
2025/08/31 22:54:20 INF [WebRTC] listener opened on :8889 (HTTP), :8189 (ICE/UDP)
2025/08/31 22:54:20 INF [SRT] listener opened on :8890 (UDP)
2025/08/31 23:02:24 INF [RTMP] [conn (IP地址:端口号)] opened
2025/08/31 23:02:24 INF [path mystream] [recorder] recording 2 tracks (H264, MPEG-4 Audio)
```

查看目录，可以看到多了一个 `recordings` 文件夹，这个文件夹用于放置录制的内容。  
配置完成！

## 其他信息

- MediaMTX 在运行时会检测配置文件的修改并实时生效。
- 使用 ffmpeg 录制直播流：

```sh showLineNumbers=false wrap=false frame="none"
ffmpeg -i "rtmp://localhost/mystream?user=username&pass=password" -c copy output.mp4
```

- 使用 ffmpeg 推送视频流：
  假设您有一个视频文件 myvideo.mp4，可以使用以下命令将其循环推送到 MediaMTX：

```sh showLineNumbers=false wrap=false frame="none"
ffmpeg -re -stream_loop -1 -i myvideo.mp4 -c copy -f rtsp "rtsp://localhost:8554/mystream?user=username&pass=password"
```

## 参考

- [Authentication | MediaMTX](https://mediamtx.org/docs/usage/authentication)
- [Record streams to disk | MediaMTX](https://mediamtx.org/docs/usage/record)
