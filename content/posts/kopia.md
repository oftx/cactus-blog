---
title: Kopia CLI 极简运维备忘录
description: 这份备忘录提炼了 Kopia CLI 在 Windows 环境下最核心的高频操作。
publishDate: 2026-02-24T17:38:56+08:00
tags: [Kopia, CLI, 运维]
draft: false
---

### 场景一：存储库 (Repository) 基础管理

存储库是存放加密数据的“水池”。在一台新电脑上，或更改了存储路径后，需要执行连接操作。

- **创建全新的本地存储库（首次使用）：**

```cmd
kopia repository create filesystem --path="C:\Users\用户名\OneDrive\KopiaBackups"
```

_(注意：执行后需设置核心加密密码，切勿遗失。)_

- **连接已存在的存储库（重装系统或换电脑后）：**

```cmd
kopia repository connect filesystem --path="C:\Users\用户名\OneDrive\KopiaBackups"
```

- **断开当前存储库连接（适用于准备给备份文件夹改名之前）：**

```cmd
kopia repository disconnect
```

- **查看当前已连接的存储库状态：**

```cmd
kopia repository status
```

---

### 场景二：快照 (Snapshot) 与日常备份

将本地工作目录的数据切片并推送到存储库中。

- **对指定单一目录进行快速备份：**

```cmd
kopia snapshot create D:\Projects
```

- **一键备份所有已配置过的目录（极其适合自动化任务）：**

```cmd
kopia snapshot create --all
```

- **后台静默备份（去除进度条，用于 PowerShell 脚本或任务计划程序）：**

```cmd
kopia snapshot create --all --no-progress
```

- **查看目前都在备份哪些目录：**

```cmd
kopia snapshot list
```

---

### 场景三：保留策略 (Policy) 设定

定义历史版本的存留规则，防止云盘空间被无限撑爆。

- **为指定目录设置祖父子 (GFS) 轮转策略：**

```cmd
kopia policy set D:\Projects --keep-latest 10 --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --keep-annual 1
```

_(参数解析：`--keep-latest 10` 为无视时间跨度，强制死保最新生成的 10 个快照；其余为按日、周、月、年保留的数量。)_

- **查看指定目录当前生效的策略：**

```cmd
kopia policy show D:\Projects
```

---

### 场景四：数据恢复 (Restore) 与灾难急救

当源文件损坏或误删时，从加密池中精准提取历史数据。

- **第一步：列出指定目录的历史快照（寻找 Object ID）：**

```cmd
kopia snapshot list D:\Projects
```

_(找到目标时间点，复制对应的那串哈希码，例如 `k12345abcdef`)_

- **第二步：透视指定快照的内部目录树（确认文件是否存在）：**

```cmd
kopia ls k12345abcdef/核心子目录
```

- **第三步：精准提取文件或目录到安全的临时位置（防二次覆盖）：**

```cmd
kopia restore k12345abcdef/核心子目录/目标文件.txt D:\TempRestore\目标文件.txt
```

- **极客恢复法：将整个存储库挂载为只读虚拟磁盘 (WebDAV)：**

```cmd
kopia mount all
```

_(执行后不要关闭终端。直接在 Windows 资源管理器地址栏输入终端里显示的 `http://127.0.0.1:端口号`，即可像普通文件夹一样复制粘贴恢复。完成后在终端按 `Ctrl+C` 退出。)_

---

### 场景五：高阶运维 (多开隔离与自动化)

- **隔离多开（同时管理多个不同密码、不同路径的存储库）：**
  执行任何操作时，加上 `--config-file` 参数指定一本独立的“配置说明书”。

```cmd
kopia --config-file="C:\Users\用户名\kopia-photos.config" snapshot create D:\Photos
```

- **自动化任务配置速查 (Windows Task Scheduler + Webhook)：**
  任务计划程序目标始终指向 PowerShell 包装脚本。核心脚本逻辑：

```powershell
kopia snapshot create --all --no-progress
if ($LASTEXITCODE -eq 0) {
    # 调用 Invoke-RestMethod 请求 Bark 或 PushPlus 接口发送成功通知
}
```
