---
title: 云端 Notebooks 切换 Python 版本
description: 本文记录了在云端计算平台切换 Python 版本的操作步骤
publishDate: 2025-08-17T19:56:14+08:00
tags: []
draft: false
---

## 背景

在云端计算平台（如 [Colab](https://colab.research.google.com/) 或 [Kaggle](https://www.kaggle.com/)）上部署模型时，可能会遇到平台内置的 Python 版本与项目所需版本不匹配的情况。这种不匹配可能导致模型无法正常运行，而平台通常并未提供简便的切换 Python 版本的功能。为了解决这一问题，可以通过重新配置环境，手动安装目标版本的 Python 和 pip，并将 `python` 命令指向新的版本。

## 环境

| 环境        | 值                                |
| ----------- | --------------------------------- |
| 平台        | [Kaggle](https://www.kaggle.com/) |
| 操作系统    | Ubuntu 22.04.3 LTS                |
| Python 版本 | 3.10.12                           |

## 步骤

通过以下操作，你可以将 Python 切换到目标版本（本例中为 3.11）。

### 准备工作

首先，创建一个新的 Notebook，并连接到会话。

### 执行命令

新建一个单元格（Cell），将以下命令粘贴到其中并运行，以安装 Python 和 pip：

```sh showLineNumbers=false wrap=false frame="none"
# 安装 Python 3.11
!sudo add-apt-repository ppa:deadsnakes/ppa -y
!sudo apt-get install python3.11 -y

# 将 python3 链接到 python3.11
!sudo rm -f /usr/bin/python3
!sudo ln -s /usr/bin/python3.11 /usr/bin/python3

# 使用 update-alternatives 配置多个 Python 版本
!sudo update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

# 安装 pip
!curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
!python get-pip.py

# 验证 Python 和 pip 的版本
!python --version
!python -m pip --version
```

执行后，你可以查看命令输出的最后两行，确认安装结果：

```txt showLineNumbers=false wrap=false frame="none"
Python 3.11.11
pip 25.0.1 from /usr/local/lib/python3.11/dist-packages/pip (python 3.11)
```

这样，你的 Python 环境已经成功切换到 Python 3.11。接下来，可以通过 `python` 命令以新版本运行脚本。

## 注意事项

完成上述操作后，`sys.version` 的值仍然不会发生改变，这意味着在单元格（Cell）中直接运行 Python 代码时，使用的依旧是平台默认的 Python 版本。只有在新建文件并使用 `python <文件名>` 命令时，才会使用刚才安装的 Python 版本。如下方代码所示：

```python wrap=false frame="none"
import sys
print(f"当前 Python 版本: {sys.version}")
```

此时输出的仍是旧版本：

```txt showLineNumbers=false wrap=false frame="none"
当前 Python 版本: 3.10.12 (main, Nov  6 2024, 20:22:13) [GCC 11.4.0]
```
