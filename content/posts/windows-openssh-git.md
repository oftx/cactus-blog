---
title: Windows 部署 Git 服务
description: Windows 11 专业版部署原生 Git 服务操作指南
publishDate: 2026-02-24T14:55:48+08:00
tags: [Windows, OpenSSH, Git]
draft: false
---

### 部署步骤

#### 1. 安装 Git 并配置环境变量

- 下载并安装 [Git for Windows](https://git-scm.com/download/win)。
- 按 `Win + R` 输入 `sysdm.cpl`，进入 **高级 -> 环境变量 -> 系统变量**。
- 找到 `Path` 变量，确保已添加 Git 的 cmd 路径（通常为 `C:\Program Files\Git\cmd`）。

#### 2. 安装并启用 OpenSSH 服务器

**方法 1：通过 PowerShell 在线安装（推荐）**
在管理员 PowerShell 中执行：

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
```

**方法 2：通过 Windows 图形界面安装**

进入 **设置 > 系统 > 可选功能**，搜索“OpenSSH 服务器”并点击安装。安装后在 `services.msc` 中启动 OpenSSH SSH Server 并设为自动运行。

**方法 3：纯手动安装（适用于方法 1 报 Access Denied 且受 WSUS 策略限制的机器）**

1. 前往 GitHub 下载最新版 [Win32-OpenSSH Release](https://www.google.com/search?q=https://github.com/PowerShell/Win32-OpenSSH/releases)。
2. 解压并重命名文件夹为 `OpenSSH`，将其移动到 `C:\Program Files\`。
3. 在管理员 PowerShell 中进入该目录并安装：

```powershell
cd "C:\Program Files\OpenSSH"
.\install-sshd.ps1
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
```

#### 3. 配置防火墙（放行 22 端口）

在**高级安全 Windows Defender 防火墙** (Windows Defender Firewall with Advanced Security) 放通 22 端口

或者

在管理员 PowerShell 中执行：

```powershell
New-NetFirewallRule -Name "Raw-Port-22-Allow" -DisplayName "Absolute Allow Port 22" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -Profile Any
```

#### 4. 更改 SSH 默认 Shell 为 Git Bash（解决路径解析问题）

Windows 原生的 `cmd` 或 `powershell` 无法正确处理 Git 客户端传来的单引号路径。必须将 OpenSSH 的默认 Shell 改为 Git Bash。

在管理员 PowerShell 中执行：

```powershell
# 将 DefaultShell 指向 Git Bash 的完整路径
New-ItemProperty -Path "HKLM:\SOFTWARE\OpenSSH" -Name DefaultShell -Value "C:\Program Files\Git\bin\bash.exe" -PropertyType String -Force

# 重启服务生效
Restart-Service sshd
```

#### 5. 创建 Git 裸仓库 (Bare Repository)

服务端必须使用裸仓库来接收推送的代码。打开 PowerShell，选择任意盘符创建目录：

```powershell
mkdir D:\GitRepos\my-project.git
cd D:\GitRepos\my-project.git
git init --bare
```

#### 6. 客户端克隆与推送代码

在客户端设备上，使用 SCP 格式（Unix 风格绝对路径）进行克隆。注意使用正斜杠 `/` 且无需 `ssh://` 前缀。

```bash
# 克隆仓库 (注意：Windows 盘符 D:/ 在 Bash 中表示为 /d/)
git clone user@192.168.9.100:/d/GitRepos/my-project.git

# 进入目录，提交代码并推送
cd my-project
git add .
git commit -m "Initial commit"
git push -u origin master
```

---

### 高阶安全配置（可选）：SSH 密钥免密登录

为了安全与便捷，建议废弃密码登录，改用 Ed25519 密钥认证。

**1. 客户端生成密钥并推送：**

```bash
ssh-keygen -t ed25519 -C "Client-Device"
ssh-copy-id user@192.168.9.100
```

**2. 服务端修复管理员组权限坑（关键）：**
以管理员权限打开 `C:\ProgramData\ssh\sshd_config`，将文件最底部的这两行注释掉：

```text
# Match Group administrators
#       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

**3. 彻底关闭密码登录：**
在同一个 `sshd_config` 文件中，找到并修改为：

```text
PasswordAuthentication no
```

保存后，在管理员 PowerShell 中执行 `Restart-Service sshd` 重启服务。

---

### 日常推送：如何编写 `git push` 命令

在本地完成代码的 `commit` 后，需要通过 `push` 命令同步到 Windows 服务器。

1. **绑定远程地址（首次配置）**：
   将服务器地址命名为 `origin`。

```bash
git remote add origin user@192.168.9.100:/d/GitRepos/my-project.git
```

2. **首次推送并绑定分支**：
   使用 `-u` 参数将本地的 `master`（或 `main`）与服务器分支建立永久关联。

```bash
git push -u origin master
```

3. **日常极简推送**：
   后续完成代码提交后，只需执行即可自动推送到默认关联的服务器：

```bash
git push
```

_附加高频命令_：

- **推送到指定分支**：`git push origin feature-dev`
- **强制覆盖服务器（慎用）**：`git push -f origin master`

---

### 多端托管：如何将代码同步提交到 GitHub

将代码同时托管在私有 Windows 服务器和 GitHub 上，可实现双重本地与云端备份。

1. 在 GitHub 上创建一个**完全为空**的仓库（切勿勾选初始化 README 或 .gitignore）。
2. **方案 A：作为独立的辅助远程仓库（按需分别推送）**

```bash
# 添加 GitHub 地址并命名为 github
git remote add github git@github.com:YourName/my-project.git

# 单独向 GitHub 推送代码
git push -u github master
```

3. **方案 B：配置“一键双推” (Dual Push)**

修改 `origin` 的推送规则列表，实现一次 `git push` 命令同时将代码发往两个服务器：

```bash
# 显式添加原有的 Windows 服务器推送地址
git remote set-url --add --push origin user@192.168.9.100:/d/GitRepos/my-project.git

# 叠加添加 GitHub 的推送地址
git remote set-url --add --push origin git@github.com:YourName/my-project.git
```

---

### 权限管理：如何为新设备新增 SSH Key

由于服务器已彻底关闭密码登录，新设备无法直接使用常规的 `ssh-copy-id` 命令。可通过以下两种方式授权新设备的公钥：

- **方法 1：在 Windows 服务器上直接修改（最直观防错）**

通过 RDP 或直接在服务器上，使用记事本打开 `C:\Users\<你的Windows用户名>\.ssh\authorized_keys`。将新设备生成的 `id_ed25519.pub` 公钥内容另起一行粘贴并保存。

- **方法 2：通过已授权的老设备远程追加（命令行操作）**

在已经拥有免密权限的旧设备终端中执行以下命令（利用管道流和追加重定向 `>>` 写入）：

```bash
echo 'ssh-ed25519 AAAAC3NzaC...你的新设备公钥... New-Device' | ssh user@192.168.9.100 "cat >> ~/.ssh/authorized_keys"
```

---

### 地址管理：如何替换当前设定的 remote 地址

当 Windows 服务器的局域网 IP 发生变动，或者配置了内网穿透换用公网域名时，需要更新本地关联的远程地址。

1. **直接修改当前 URL**：

```bash
git remote set-url origin user@new-domain.com:/d/GitRepos/my-project.git
```

2. **验证修改结果**：

```bash
git remote -v
```

如果终端输出列表中 `(fetch)` 和 `(push)` 对应的地址已更新为你设置的新 URL，即代表替换成功。

---

### 自动化部署：在 Windows 服务器配置 Git Hooks

在服务端的裸仓库中配置 `post-receive` 钩子，可以在代码 `push` 成功后自动执行代码解包、重启服务或运行特定脚本等 CI/CD 动作。由于之前已将 Windows OpenSSH 的默认 Shell 改为了 Git Bash，我们可以直接使用极其方便的 Linux Bash 语法来编写这个钩子。

**1. 创建 Hook 脚本文件**

进入 Windows 服务器上裸仓库的 hooks 目录（例如 `D:\GitRepos\my-project.git\hooks`）。
在该目录下新建一个**无任何后缀名**的文本文件，严格命名为 `post-receive`（切勿带 `.txt` 或 `.sh` 等后缀，否则 Git 无法识别）。

**⚠️ Windows 核心踩坑预警：**
在使用编辑器（如 VS Code 或 Notepad++）保存此文件时，必须确保：

- **换行符**：强制设为 Linux 风格的 `LF (\n)`，绝不能用 Windows 默认的 `CRLF (\r\n)`。
- **编码格式**：强制设为 `UTF-8`（不要带 BOM）。

**2. 编写自动化部署脚本**

打开 `post-receive` 文件，你可以使用以下经典模板。该脚本会在每次收到推送后，自动将纯数据裸仓库里的代码，提取（Checkout）到一个真实的运行目录中：

```bash
#!/bin/bash

# 1. 定义你的真实工作目录（代码解包后实际运行的地方，路径必须使用正斜杠 /）
TARGET_DIR="D:/Deployments/my-project"

# 2. 如果目标目录不存在，则自动创建
if [ ! -d "$TARGET_DIR" ]; then
  mkdir -p "$TARGET_DIR"
fi

echo "==============================================="
echo "🚀 收到最新代码，正在 Windows 服务器上自动部署..."

# 3. 核心命令：将裸仓库的代码强制检出（checkout）到真实工作目录
git --work-tree="$TARGET_DIR" --git-dir="D:/GitRepos/my-project.git" checkout -f master

echo "📦 代码解包完成！存放在: $TARGET_DIR"

# ---------------------------------------------------------
# 4. 在这里可以继续追加你需要自动执行的后续任务
# ---------------------------------------------------------
# cd "$TARGET_DIR"
# echo "🐍 正在执行 Python 脚本..."
# python main.py
# 或调用 Windows 系统命令重启服务：
# sc stop MyService && sc start MyService

echo "✅ 自动化部署流水线执行完毕！"
echo "==============================================="
```

**3. 触发自动化流水线**

保存文件后，不需要重启任何服务。
回到客户端机器上，修改任意代码并执行常规的推送命令：

```bash
git push origin master
```

**效果验证**：
推送进度条走完后，你的客户端终端会直接回显打印出脚本中的 `echo` 信息（带有 🚀 和 ✅ 的日志）。此时去 Windows 服务器的 `D:\Deployments\my-project` 目录下查看，你最新提交的代码文件已经自动解包并部署完毕。

---

### 常见问题与排查指南

#### 1. 安装 OpenSSH 报错：`Add-WindowsCapability : Access is denied`

- **原因**：系统连接过企业内网，被配置了本地更新服务器（WSUS），无法连接微软官方组件库。
- **解决**：使用**步骤 2 中的方法 3（纯手动安装）**，直接下载二进制文件绕过更新组件限制。

#### 2. 客户端连接或克隆时卡住，最终报错：`Operation timed out`

- **原因**：网络物理连通，但 22 端口被 Windows 防火墙或第三方杀毒软件静默拦截。
- **解决**：

1. 退出所有第三方杀毒/安全软件（火绒、360 等）。
2. 按照**步骤 3** 创建“纯端口”放行规则。

#### 3. 克隆报错：`fatal: ''D:/...'' does not appear to be a git repository`

- **原因**：Git 底层通过 SSH 传递路径时使用了单引号包围（例如 `'D:/Repo.git'`），Windows 默认命令行无法剥除单引号，导致路径寻找失败。
- **解决**：按照**步骤 4**，通过注册表将 OpenSSH 的 DefaultShell 强制修改为 Git Bash (`bash.exe`)。

#### 4. macOS 客户端报错：`Unable to read current working directory: Operation not permitted`

- **原因**：macOS 隐私安全机制拦截了终端软件对“桌面”、“文稿”等敏感目录的读取权限。
- **解决**：进入 Mac 的 **系统设置 > 隐私与安全性 > 文件和文件夹**，为当前使用的终端（如 Terminal/iTerm/VS Code）授予对应文件夹的访问权限，并完全重启终端。
