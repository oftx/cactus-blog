---
title: systemctl 命令：从入门到掌握
description: 从入门到精通 systemctl 操作，意味着你需要掌握 systemd 这一现代 Linux 系统的核心组件。
publishDate: 2025-11-05T21:23:05+08:00
tags: [Linux]
draft: false
---

从入门到精通`systemctl`操作，意味着你需要掌握`systemd`这一现代Linux系统的核心组件。`systemd`不仅是启动系统和管理服务的工具，更是一个庞大的系统管理套件。 `systemctl`是与`systemd`交互的主要命令行工具。

以下将循序渐进地介绍如何从入门到精通`systemctl`。

### 第一阶段：入门基础 - 日常服务管理

这个阶段的目标是掌握最核心、最常用的命令，能够进行日常的服务启停、状态查看和开机自启设置。

#### 1. 理解核心概念：单元（Unit）

`systemd`管理的对象被称为“单元”（Unit），它是`systemd`进行任务管理的基本单位。 单元有多种类型，最常见的就是服务单元（`.service`），此外还有挂载点（`.mount`）、套接字（`.socket`）、目标（`.target`）等。

#### 2. 核心管理命令

对于一项服务（以`nginx.service`为例），最常用的命令包括：

- **启动服务**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl start nginx.service
  ```
- **停止服务**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl stop nginx.service
  ```
- **重启服务**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl restart nginx.service
  ```
- **重新加载配置**（不中断服务）：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl reload nginx.service
  ```
- **查看服务状态**：这是最重要的排错命令，能显示服务是否正在运行、PID、日志摘要等关键信息。
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl status nginx.service
  ```

#### 3. 设置开机自启

- **开机自启**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl enable nginx.service
  ```
  此命令会在`/etc/systemd/system/`目录下创建服务的符号链接。
- **禁止开机自启**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl disable nginx.service
  ```
- **检查是否开机自启**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl is-enabled nginx.service
  ```

#### 4. 查看单元列表

- **列出正在运行的服务**：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemctl list-units --type=service --state=running
  ```
- **列出所有已加载的单元**（包括失败的）：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemctl list-units --all
  ```
- **列出所有已安装的服务单元文件及其状态**：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemctl list-unit-files --type=service
  ```
  状态可能包括 `enabled` (已启用), `disabled` (已禁用), `static` (不可启用，但可能被其他单元依赖) 和 `masked` (已屏蔽，完全无法启动)。

### 第二阶段：进阶操作 - 理解工作原理

此阶段的目标是深入理解`systemd`的机制，包括单元文件、依赖关系和日志系统。

#### 1. 理解单元文件（Unit File）

每个单元都有一个配置文件，它告诉`systemd`如何管理这个单元。

- **查看单元文件内容**：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemctl cat sshd.service
  ```
- **文件位置**：
  - `/usr/lib/systemd/system/`：软件包安装的默认单元文件。
  - `/etc/systemd/system/`：系统管理员自定义或修改的单元文件，优先级更高。
- **文件结构**：单元文件主要由三个部分组成：
  - `[Unit]`：定义单元的元数据和依赖关系，如描述（`Description`）、依赖（`Requires=`、`Wants=`）和启动顺序（`After=`、`Before=`）。
  - `[Service]`（或其他单元类型）：定义单元的具体行为，如启动命令（`ExecStart`）、服务类型（`Type`）和重启策略（`Restart`）。
  - `[Install]`：定义如何安装这个单元，即`systemctl enable`命令的作用，通常是指定它属于哪个目标（`WantedBy=`）。

#### 2. 管理依赖关系

`systemd`通过依赖关系管理来确保单元以正确的顺序启动。

- **查看单元的依赖关系**：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemctl list-dependencies sshd.service
  ```

#### 3. 使用`journalctl`查看日志

`systemd`拥有自己的日志系统`journald`，`journalctl`是查询这些日志的工具。

- **查看所有日志**：
  ```sh showLineNumbers=false wrap=false frame="none"
  journalctl
  ```
- **实时监控日志**（类似`tail -f`）：
  ```sh showLineNumbers=false wrap=false frame="none"
  journalctl -f
  ```
- **查看特定服务的日志**：
  ```sh showLineNumbers=false wrap=false frame="none"
  journalctl -u nginx.service
  ```
- **按时间过滤日志**：
  ```sh showLineNumbers=false wrap=false frame="none"
  journalctl --since "2024-01-01" --until "2024-01-02 12:00:00"
  ```
- **查看内核日志**：
  ```sh showLineNumbers=false wrap=false frame="none"
  journalctl -k
  ```
- **查看错误级别的日志**：
  ```sh showLineNumbers=false wrap=false frame="none"
  journalctl -p err
  ```

### 第三阶段：精通级别 - 自定义与排错

这个阶段的目标是能够自定义服务、管理系统运行状态，并能熟练地进行故障排查。

#### 1. 编写自定义服务单元

假设你有一个脚本需要作为服务运行，可以为其创建一个`.service`文件。

- **创建单元文件**：在`/etc/systemd/system/`目录下创建一个文件，例如`myapp.service`。
  ```ini
  [Unit]
  Description=My Awesome Application
  After=network.target

  [Service]
  Type=simple
  ExecStart=/usr/local/bin/myapp.sh
  User=myuser
  Restart=on-failure

  [Install]
  WantedBy=multi-user.target
  ```
- **重载`systemd`配置**：每次创建或修改单元文件后，都必须执行此命令使其生效。
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl daemon-reload
  ```
- **启动并启用你的新服务**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl start myapp.service
  sudo systemctl enable myapp.service
  ```

#### 2. 理解和管理目标（Target）

`Target`单元用于对其他单元进行分组，类似于传统init系统中的“运行级别”（Runlevel）。

- **查看当前默认目标**：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemctl get-default
  ```
  常见目标有`multi-user.target`（多用户命令行模式）和`graphical.target`（图形界面模式）。
- **切换到不同目标**：例如，切换到救援模式。
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl isolate rescue.target
  ```
- **设置默认目标**：
  ```sh showLineNumbers=false wrap=false frame="none"
  sudo systemctl set-default graphical.target
  ```

#### 3. 高级故障排查

- **定位启动慢的服务**：

  ```sh showLineNumbers=false wrap=false frame="none"
  systemd-analyze blame
  ```

- **分析启动过程的关键链**：
  ```sh showLineNumbers=false wrap=false frame="none"
  systemd-analyze critical-chain
  ```
- **深入排查失败的服务**：
  1.  使用 `systemctl status <service_name>` 查看概要和最新日志。
  2.  使用 `journalctl -u <service_name> -b` 查看该服务自本次启动以来的所有日志。
  3.  检查单元文件 `systemctl cat <service_name>` 是否有语法错误或配置问题。
  4.  如果修改了单元文件，确保运行了 `systemctl daemon-reload`。

#### 4. 安全与最佳实践

- **服务安全加固**：在`[Service]`段中，可以使用`ProtectSystem`、`PrivateTmp`、`NoNewPrivileges`等指令来限制服务的权限，提高系统安全性。
- **使用绝对路径**：在单元文件中，总是使用可执行文件或配置文件的绝对路径，因为`systemd`不依赖用户的环境变量。

通过以上三个阶段的学习和实践，你将能够全面掌握`systemctl`，从容应对各种系统服务的管理、配置和排错任务。

> 这篇文章的内容由 AI 生成。
