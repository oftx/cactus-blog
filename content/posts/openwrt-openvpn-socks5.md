---
title: OpenWrt 基于策略路由配置非侵入式 OpenVPN 与 SOCKS5 旁路网关
description: 在 OpenWrt 路由器上部署非全局的 OpenVPN 隧道，并借助 Xray 提供 SOCKS5 代理服务，供局域网设备按需接入。
publishDate: 2026-05-08T00:57:00+08:00
tags: []
draft: false
---

> 本文内容由AI生成，文中描述的流程已经过验证可行，但不保证内容的准确性。

---

### 💡 背景与目标

在 OpenWrt 路由器上部署 VPN 或透明代理时，常会遇到以下挑战：

1. **全局路由影响范围广**：全局接管容易导致局域网内其他设备（如电视、普通手机）的国内访问流量变慢或产生额外延迟。
2. **DNS 分流配置繁琐**：在全局环境下处理 DNS 分流容易出现配置遗漏，导致国内域名解析到海外节点。
3. **协议隔离需求**：有时需要建立真实的 OpenVPN 隧道，但仅限部分设备或特定场景使用，不希望改变系统默认的网关出口。

**本文目标：**
在 OpenWrt 系统后台建立独立的 OpenVPN 隧道，且**不修改系统的全局默认路由**。同时在路由器局域网内开放一个 SOCKS5 代理端口，供电脑端通过浏览器插件（如 SwitchyOmega）按需接入，实现物理宽带直连与按需代理的分离。

---

### 🏗️ 架构原理解析

本方案主要由四个模块组成，通过标记与策略路由实现流量转发：

1. **OpenVPN**：负责建立底层隧道 (`tun0`)，通过配置 `route-nopull` 参数，拒绝服务端下发全局路由，保持系统原有网络环境不变。
2. **Firewall (防火墙)**：为 `tun0` 接口配置独立区域，并开启 **IP 动态伪装 (NAT)** 和 MSS 钳制，保证外发数据包的源 IP 能够被正常转换和响应。
3. **Xray-core**：作为 SOCKS5 代理服务端，接收局域网内的代理请求，并利用 `fwmark` 机制给代理出站流量打上特定标签。
4. **策略路由 (Hotplug + iproute2)**：建立自定义路由表，捕捉带有特定标签的数据包并强制转发至 `tun0` 接口，解决无默认路由状态下的选路问题。

---

### 🛠️ 部署全过程

#### 第一阶段：建立非全局路由的 VPN 隧道

我们需要连接 OpenVPN，但不让其修改系统的默认路由表。

1. **安装 OpenVPN 客户端：**
   在 SSH 终端中执行：
   ```bash
   opkg update
   opkg install openvpn-openssl
   ```
2. **修改配置文件：**
   在您的 `.ovpn` 配置文件末尾，添加以下参数。该参数指示 OpenVPN 仅建立接口，不接管系统路由：
   ```text
   route-nopull
   ```
   将修改后的文件上传至路由器，例如：`/etc/openvpn/myvpn.conf`。
3. **配置系统服务并启动：**
   通过 UCI 机制将配置注册到系统中并设置开机自启：
   ```bash
   uci set openvpn.myvpn=openvpn
   uci set openvpn.myvpn.enabled='1'
   uci set openvpn.myvpn.config='/etc/openvpn/myvpn.conf'
   uci commit openvpn

   /etc/init.d/openvpn enable
   /etc/init.d/openvpn start
   ```
   _验证：输入 `ip addr show tun0`，若能看到 IP 地址则说明隧道建立成功。_

#### 第二阶段：配置网络接口与防火墙 NAT

为 `tun0` 接口配置网络参数及防火墙规则，确保数据包能够正常进行网络地址转换（NAT）。

1. **配置虚拟网卡：**
   - 进入 OpenWrt 网页后台：**网络 -> 接口**，点击“添加新接口”。
   - 命名为 `VPN_TUN`，协议选择 **未配置 (Unmanaged)**，设备选择 **tun0**。
2. **配置防火墙区域：**
   - 进入 **网络 -> 防火墙**，在区域列表下方点击“添加”。
   - 命名为 `vpn_zone`。
   - 入站/出站/转发规则依次设置为：**拒绝 / 接受 / 拒绝**。
   - **注意：务必勾选“IP 动态伪装”和“MSS 钳制”。**
   - 涵盖的网络勾选刚才创建的 `VPN_TUN`。
   - “允许来自源区域的转发”勾选 `lan`。
   - 点击保存并应用。

#### 第三阶段：Xray 代理与 fwmark 策略路由配置

此处需要注意 Linux 的路由机制：由于在第一阶段使用了 `route-nopull`，系统主路由表中没有指向 VPN 的默认路由。此时若直接让 Xray 绑定 `tun0` 网卡（`SO_BINDTODEVICE`），内核在路由决策时可能无法正确匹配出站的源 IP，导致 TCP 连接在 `Client Hello` 握手阶段无响应。

**解决方案**：通过 `fwmark`（防火墙标记）结合自定义策略路由来实现出站流量控制。

1. **安装 Xray-core：**
   ```bash
   opkg install xray-core
   ```
2. **编写 Xray 配置文件：**
   使用 `"mark": 255` 给特定出站流量打上标记。清空并编辑 `/etc/xray/config.json`：
   ```json
   {
   	"log": { "loglevel": "warning" },
   	"dns": { "servers": ["1.1.1.1", "8.8.8.8"] },
   	"inbounds": [
   		{
   			"tag": "socks-in",
   			"listen": "0.0.0.0",
   			"port": 10808,
   			"protocol": "socks",
   			"settings": { "auth": "noauth", "udp": true }
   		}
   	],
   	"outbounds": [
   		{
   			"tag": "tun-out",
   			"protocol": "freedom",
   			"settings": { "domainStrategy": "UseIP" },
   			"streamSettings": {
   				"sockopt": { "mark": 255 }
   			}
   		}
   	],
   	"routing": {
   		"domainStrategy": "IPIfNonMatch",
   		"rules": [
   			{
   				"type": "field",
   				"ip": ["1.1.1.1", "8.8.8.8"],
   				"outboundTag": "tun-out"
   			},
   			{
   				"type": "field",
   				"inboundTag": ["socks-in"],
   				"outboundTag": "tun-out"
   			}
   		]
   	}
   }
   ```
3. **启动 Xray 服务：**
   ```bash
   uci set xray.enabled.enabled='1'
   uci commit xray
   /etc/init.d/xray enable
   /etc/init.d/xray start
   ```

#### 第四阶段：配置 Hotplug 实现路由规则的自动化

为了识别带有 `255` 标记的数据包，我们需要创建一张独立的路由表（如编号 100）。由于 OpenVPN 重连会导致 `tun0` 接口销毁和重建，相关的路由规则会随之失效。利用 OpenWrt 的 Hotplug（热插拔）机制，可以在接口状态变化时自动重新写入规则。

在 SSH 终端中执行以下命令生成脚本：

```bash
mkdir -p /etc/hotplug.d/iface
cat << 'EOF' > /etc/hotplug.d/iface/99-xray-vpn
#!/bin/sh
# 监听网络接口事件，当 tun0 接口 up 时触发
if [ "$ACTION" = "ifup" ] &&[ "$DEVICE" = "tun0" ]; then
    # 清理可能存在的旧规则
    ip route flush table 100 2>/dev/null
    ip rule del fwmark 255 table 100 2>/dev/null

    # 写入策略路由：将 mark 255 的数据包交由 table 100 处理，该表默认出口为 tun0
    ip route add default dev tun0 table 100
    ip rule add fwmark 255 table 100

    logger -t Xray-VPN "OpenVPN tun0 is UP, routing rules for mark 255 applied."
fi
EOF
chmod +x /etc/hotplug.d/iface/99-xray-vpn
```

---

### 💻 第五阶段：客户端接入与验证

1. **配置浏览器插件：**
   在电脑浏览器中安装 SwitchyOmega（或其他支持 SOCKS5 的代理工具）。新建情景模式，协议选择 **SOCKS5**。
   - **代理服务器**：填写路由器 LAN IP（如 `192.168.1.1`）。
   - **端口**：`10808`。
2. **防 DNS 泄露设置：**
   在插件高级设置中，勾选 **“代理 DNS 解析 (Proxy DNS)”**。这会使域名解析请求封装在 SOCKS5 隧道中，交由路由器端的 Xray 通过指定 DNS（如 1.1.1.1）进行远端解析，避免本地 DNS 污染。
3. **连通性验证：**
   在浏览器中启用该代理模式，访问 `https://ipleak.net`。如果页面显示的 IP 地址为 OpenVPN 节点所在区域，且 DNS 解析服务器列表未显示本地运营商 IP，即说明配置成功。

---

### 总结

本方案通过 `route-nopull` 分离默认路由，结合 SOCKS5 代理和 `fwmark` 策略路由，实现了一套按需引流的旁路架构。局域网内的默认流量保持物理直连，而配置了代理的客户端则可将流量精确导向 VPN 隧道，满足了不同设备的网络隔离需求。
