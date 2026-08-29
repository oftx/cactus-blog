---
title: 借助 SteamCMD 在 macOS 获取 Wallpaper Engine 资源
description: 借助 SteamCMD 在 macOS 上获取 Wallpaper Engine 资源的简要流程。
publishDate: 2026-06-09T00:43:47+08:00
tags: [Steam, macOS]
draft: false
---

> 下面以和AI对话的形式展示具体流程，下载资源的流程已经过验证可行，其他部分AI回答内容未经实操验证。

---

`Q:` 账号是否需要购买 Wallpaper Engine？

`A:` 是的，**必须需要**。

你使用的 Steam 账号库中**必须已经购买并拥有 Wallpaper Engine**。

因为 Wallpaper Engine 是一款付费软件，Steam 的防盗版和权限验证机制规定：**只有拥有本体游戏/软件的账号，才有权限下载其专属创意工坊的资源。**

如果你尝试绕过这一限制，会遇到以下情况：

1. **无法使用匿名登录：** 如果你在 SteamCMD 中使用 `login anonymous`，系统会拒绝下载请求。
2. **未购买账号报错：** 如果你登录了一个没有买过 Wallpaper Engine 的账号，执行 `workshop_download_item 431960 <壁纸ID>` 命令时，终端不会下载，而是会直接报错，通常提示为 `ERROR! Download item <ID> failed (Access Denied)` 或类似无权限的错误。

---

`Q:` 借助 SteamCMD 在 macOS 上获取 Wallpaper Engine 的资源的简要流程？

`A:` 以下是借助 SteamCMD 在 macOS 上获取 Wallpaper Engine 资源的核心精简流程：

### 1. 环境准备

在终端（Terminal）中使用 Homebrew 安装 SteamCMD：

```bash
brew install steamcmd

```

### 2. 首次完整登录（用于保存登录凭证）

必须执行一次完整登录并正常退出，以便系统缓存你的登录状态，后续免密下载：

1. 终端输入 `steamcmd` 进入交互界面。
2. 输入 `login <你的Steam账号> <你的密码>`。
3. 输入 Steam Guard 手机令牌验证码。
4. 看到 `Logged in OK` 后，**务必输入 `quit` 回车退出**（不要直接关窗口），完成状态保存。

### 3. 一键下载资源

在 Steam 网页端找到心仪的壁纸，复制网址末尾的 **壁纸ID**。
在 macOS 终端中直接运行以下单行命令（将 `<你的账号>` 和 `<壁纸ID>` 替换为实际内容）：

```bash
steamcmd +login <你的账号> +workshop_download_item 431960 <壁纸ID> +quit

```

- **如何看进度：** 终端不会显示进度条。可以通过 Mac 的“活动监视器 -> 网络 -> 搜索 steamcmd” 查看下载网速，或者观察目标文件夹的体积变化。

### 4. 提取与使用

1. 下载完成后，前往默认保存路径提取文件：
   `~/Library/Application Support/Steam/steamapps/workshop/content/431960/<壁纸ID>`
2. 找到里面的视频文件（`.mp4` 或 `.webm`）。
3. 配合 macOS 端的 **IINA**（画中画桌面模式）或 **Plash** 等软件，将其设置为动态桌面。

---

`Q:` 如何查看scene.pkg？

```
➜  ~ cd "/Users/user/Library/Application Support/Steam/steamapps/workshop/content/431960/3714466840"
➜  3714466840 tree
.
├── preview.jpg
├── project.json
└── scene.pkg

1 directory, 3 files
```

`A:`

### 方案一：使用在线解包工具（最简单，免安装）

这是 Wallpaper Engine 官方 FAQ 文档中也提到过的社区开发者维护的网页端解包工具，完全在浏览器本地运行，非常适合 Mac 用户。

1. 用浏览器打开：[https://wetranslate.thiscould.work/scene.pkg/](https://wetranslate.thiscould.work/scene.pkg/)
2. 直接将你刚才目录下的 `scene.pkg` 文件拖拽到网页中。
3. 网页会自动解析里面的内容，你可以直接预览并下载其中的高清背景图（`.png` 或 `.jpg`）和音频文件。

### 方案二：使用 macOS 原生解包应用（功能最全）

如果你经常需要解包，或者遇到了包含视频材质（MP4）的高级 TEX 容器格式，GitHub 上有一款专门为 macOS 开发的原生 Swift 应用：**WallpaperExtractor**。

1. **项目地址：** [https://github.com/trinityhades/WallpaperExtractor](https://github.com/trinityhades/WallpaperExtractor)
2. 在该项目的 **Releases** 页面下载打包好的 `.app` 或 `.zip`。
3. 运行这个 App，点击 `Open PKG...` 选择你的 `scene.pkg`。
4. 这个软件非常强大，它可以**自动将 Wallpaper Engine 独有的 `.tex` 文件转换为 macOS 可读的 `.png` 格式**，并且支持批量导出。

### 方案三：通过 Whisky / CrossOver 运行原版 repkg

如果你更喜欢使用命令行，并且你的 M1 Mac 上正好安装了 Whisky 或 CrossOver 等转译工具。

1. 前往 `notscuffed/repkg` 的 GitHub Releases 页面，直接下载编译好的 Windows 可执行文件压缩包（例如 `RePKG.zip`）。
2. 解压后得到 `repkg.exe`。
3. 打开 Whisky（或进入 Wine 的终端环境），通过它来执行这个 exe 文件：

```bash
# 假设你使用的是 wine
wine /路径到/repkg.exe extract /Users/user/Library/Application\ Support/Steam/steamapps/workshop/content/431960/3714466840/scene.pkg
```
