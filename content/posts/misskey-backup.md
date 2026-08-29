---
title: Misskey 数据备份与恢复测试
publishDate: 2025-11-11T01:53:11+08:00
description: Misskey 实例需要备份以防丢失数据。本文介绍基于 Docker Compose 部署的 Misskey 实例如何备份和恢复数据。
tags: []
draft: false
---

# 前言

作为 Misskey 实例服务器管理员，应该需要了解数据存放位置和备份方法，以防数据丢失。

本文接下来将介绍如何正确地备份 Misskey 服务器数据，并测试验证备份的数据是否可以完整地恢复 Misskey 实例。

此文章基于 Misskey 2025.10.2 编写，Misskey 部署方式是 Docker Compose。

# 数据备份

## 备份之前

在备份前，你需要知道要备份哪些文件。

如果你部署过 Misskey，应该会对 `compose.yml` 文件有印象，这个文件告诉 Docker 如何运行镜像。在这个文件中，需要特别注意那些 `volumes` 键对应的值，它指定了 Misskey 相关文件在本机的存放位置。

通过观察 `compose.yml` 的内容，可以发现数据保存在**当前文件夹**下的以下文件夹中：

```
.config\
db\
redis\
files\
```

加上 `compose.yml` 文件，这些就是我们需要备份的文件。

> 经过测试，`redis` 文件夹的数据备份是必要的，否则恢复后打开的网页将出现问题。

> 如果未启用过对象存储，所有媒体文件保存在 `files` 文件夹中，其存储容量可能会很大，备份复制文件时可能会花费大量时间，需要注意。

另外，在备份之前，如果已启用 **Bot 防御**功能，需要临时禁用，以确保后续在本机 localhost 上可成功登录账号。

## 开始备份

备份需要遵循以下步骤：

1. 停止容器运行（ `docker compose down` ）
2. 复制数据文件
3. 运行容器（ `docker compose up -d` ）

> 经过测试，停止容器是必要的，否则无法复制某些数据文件。

这三个步骤非常简单，你可以手动做，需要注意的是 `docker compose` 的停止和启动命令需要在 Misskey 项目文件夹下运行。

如果是 Windows 平台，我借助 AI 写了一个备份 bat 脚本，用于一键备份需要的文件到 7z 压缩包中，并将其移动到 OneDrive 备份文件夹实现自动云端备份。脚本内容见下：

```
@echo off
setlocal enabledelayedexpansion

REM --- 用户配置 ---
REM 1. 7-Zip 的安装路径。
set "SEVENZIP_PATH=D:\Program Files\7-Zip\7z.exe"
REM 2. 备份文件最终移动到的目标文件夹。
set "BACKUP_DESTINATION=C:\Users\Administrator\OneDrive\Misskey_Backups"
REM 3. 临时文件名，脚本会自动创建和删除。
set "LIST_FILENAME=_backup_filelist.txt"


REM --- 脚本正文 ---

:init
cls
echo ==========================================================
echo                   Misskey 备份脚本
echo ==========================================================
echo.

REM 检查依赖
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [严重错误] 未在系统中找到 "docker" 命令。
    goto end_script
)
if not exist "%SEVENZIP_PATH%" (
    echo [严重错误] 7z.exe 未在指定的路径找到: "%SEVENZIP_PATH%"
    goto end_script
)
if exist "%LIST_FILENAME%" (
    del /f /q "%LIST_FILENAME%"
)

echo [重要提示] 此脚本将通过 "stop/start" 模式来确保数据备份的完整性和一致性。
echo.
choice /c yn /m "是否确认开始执行备份流程？"
if errorlevel 2 (
    echo [取消] 用户取消了备份操作。
    goto end_script
)
echo.

REM --- 步骤 1: 停止 Docker 容器 ---
echo [步骤 1/5] 正在停止 Docker 容器以释放文件...
docker-compose stop
if %errorlevel% neq 0 (
    echo [严重错误] 停止 Docker 容器失败！请检查 Docker 是否正在运行。
    goto end_script
)
echo [成功] 所有 Misskey 相关容器已停止。
echo.

REM --- 步骤 2: 生成精确的文件列表 ---
echo [步骤 2/5] 正在生成精确的备份文件列表...
set "HAS_FILES=0"

REM 检查并将存在的文件/文件夹路径写入到 listfile 中
if exist "compose.yml" (
    echo compose.yml>>"%LIST_FILENAME%"
    echo   [状态] 已添加: compose.yml
    set "HAS_FILES=1"
) else (
    echo   [状态] 跳过: compose.yml (未找到)
)

if exist ".\.config\default.yml" (
    echo .config\default.yml>>"%LIST_FILENAME%"
    echo   [状态] 已添加: .config\default.yml
    set "HAS_FILES=1"
) else (
    echo   [状态] 跳过: .config\default.yml (未找到)
)

if exist ".\.config\docker.env" (
    echo .config\docker.env>>"%LIST_FILENAME%"
    echo   [状态] 已添加: .config\docker.env
    set "HAS_FILES=1"
) else (
    echo   [状态] 跳过: .config\docker.env (未找到)
)

if exist ".\db\" (
    echo db>>"%LIST_FILENAME%"
    echo   [状态] 已添加: 整个 db\ 文件夹
    set "HAS_FILES=1"
) else (
    echo   [状态] 跳过: db\ 文件夹 (未找到)
)

if exist ".\redis\" (
    echo redis>>"%LIST_FILENAME%"
    echo   [状态] 已添加: 整个 redis\ 文件夹
    set "HAS_FILES=1"
) else (
    echo   [状态] 跳过: redis\ 文件夹 (未找到)
)

if exist ".\files\" (
    echo files>>"%LIST_FILENAME%"
    echo   [状态] 已添加: 整个 files\ 文件夹
    set "HAS_FILES=1"
) else (
    echo   [状态] 跳过: files\ 文件夹 (未找到)
)
echo.

if %HAS_FILES% equ 0 (
    echo [错误] 未找到任何可备份的文件或文件夹！备份已中止。
    goto restart_services
)

REM --- 步骤 3: 使用文件列表执行备份 ---
echo [步骤 3/5] 正在根据文件列表执行备份...
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set "dt=%%b-%%c-%%d"
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "tm=%%a-%%b"
set "TIMESTAMP=%dt%_%tm%"
set "BACKUP_FILENAME=misskey_files_backup_%TIMESTAMP%.7z"

echo      - 备份目标文件: %BACKUP_FILENAME%
echo      - 正在压缩，请稍候...

"%SEVENZIP_PATH%" a -t7z -mx=9 -bso0 "%BACKUP_FILENAME%" @"%LIST_FILENAME%" > nul

if %errorlevel% neq 0 (
    echo.
    echo [错误] 文件备份失败！7-Zip 返回了错误。
    goto cleanup
)

echo.
echo [成功] 备份文件 "%BACKUP_FILENAME%" 已在当前目录下成功创建！
echo.

REM --- 步骤 4: 移动备份文件 ---
echo [步骤 4/5] 正在移动备份文件至目标文件夹...

REM 检查目标文件夹是否存在，如果不存在则创建
if not exist "%BACKUP_DESTINATION%\" (
    echo      - 目标文件夹不存在，正在创建:
    echo        "%BACKUP_DESTINATION%"
    mkdir "%BACKUP_DESTINATION%"
    if errorlevel 1 (
        echo      - [错误] 创建目标文件夹失败！文件将保留在当前目录。
        goto cleanup
    )
)

REM 移动文件
move /Y "%BACKUP_FILENAME%" "%BACKUP_DESTINATION%\" > nul

if %errorlevel% neq 0 (
    echo      - [错误] 移动文件失败！文件将保留在当前目录。
) else (
    echo      - [成功] 文件已移动至: "%BACKUP_DESTINATION%\"
)
echo.

:cleanup
REM --- 清理临时文件 ---
if exist "%LIST_FILENAME%" (
    del /f /q "%LIST_FILENAME%"
)

REM --- 步骤 5: 重启 Docker 容器 ---
:restart_services
echo [步骤 5/5] 正在恢复容器运行...
docker-compose start
if %errorlevel% neq 0 (
    echo [严重错误] 恢复 Docker 容器失败！请手动执行 "docker-compose start" 命令。
) else (
    echo [成功] 所有容器已恢复运行。
)
echo.

:end_script
echo ==========================================================
echo 备份流程结束。
echo ==========================================================
pause
exit /b
```

> 你可以修改脚本，将脚本中的路径改为实际可用的路径。

运行后，你将会看到类似以下输出：

```
==========================================================
                  Misskey 备份脚本
==========================================================

[重要提示] 此脚本将通过 "stop/start" 模式来确保数据备份的完整性和一致性。

是否确认开始执行备份流程？ [Y,N]?Y

[步骤 1/5] 正在停止 Docker 容器以释放文件...
[+] Stopping 3/3
 ✔ Container misskey-web-1    Stopped                                                                              0.7s
 ✔ Container misskey-db-1     Stopped                                                                              1.2s
 ✔ Container misskey-redis-1  Stopped                                                                              1.3s
[成功] 所有 Misskey 相关容器已停止。

[步骤 2/5] 正在生成精确的备份文件列表...
  [状态] 已添加: compose.yml
  [状态] 已添加: .config\default.yml
  [状态] 已添加: .config\docker.env
  [状态] 已添加: 整个 db\ 文件夹
  [状态] 已添加: 整个 redis\ 文件夹
  [状态] 已添加: 整个 files\ 文件夹

[步骤 3/5] 正在根据文件列表执行备份...
     - 备份目标文件: misskey_files_backup_2025-11-11_00-36.7z
     - 正在压缩，请稍候...

[成功] 备份文件 "misskey_files_backup_2025-11-11_00-36.7z" 已在当前目录下成功创建！

[步骤 4/5] 正在移动备份文件至目标文件夹...
     - [成功] 文件已移动至: "C:\Users\Administrator\OneDrive\Misskey_Backups\"

[步骤 5/5] 正在恢复容器运行...
[+] Running 3/3
 ✔ Container misskey-db-1     Healthy                                                                              5.9s
 ✔ Container misskey-redis-1  Healthy                                                                              5.9s
 ✔ Container misskey-web-1    Started                                                                              0.4s
[成功] 所有容器已恢复运行。

==========================================================
备份流程结束。
==========================================================
Press any key to continue . . .
```

这样，数据备份即完成了。

如果不确定备份是否有效，接下来可进行备份恢复测试。

# 恢复测试

> 「未经测试的备份相当于没有备份」

我们应定期进行备份的有效性检查，下面将给出备份恢复测试的流程。

## 恢复流程

恢复流程大致如下：

1. 克隆同版本 Misskey 到本地
2. 将备份的文件移动至 Misskey 目录
3. [可选] 修改 `compose.yml` 文件，将网页映射端口(默认`3000`)修改到另外端口，以便本机测试，避免影响现实联邦宇宙
4. 关闭正在运行的容器（如果有），启动测试容器，等待完全启动完成
5. 打开本机浏览器，输入 `http://localhost:<port>/` 以查看恢复效果
6. 关闭测试容器，启动主要容器。

按照以上述程操作即可，具体操作细节不赘述。

# 结语

希望此篇文章可帮助你了解 Misskey 数据备份流程
