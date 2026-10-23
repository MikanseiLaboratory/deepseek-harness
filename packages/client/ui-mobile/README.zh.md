---
description: "Web GUI 的手机布局：会话抽屉、紧凑输入栏，以及只保存在本浏览器的移动端设置。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-mobile

[English](README.md) | 中文

## 概述

本包为 Web GUI 增加手机呈现。窄屏可以把会话列表收进左侧抽屉，收紧输入栏和对话记录，并把这些选择保存在这个浏览器里。停用后桌面框架保持原样。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## 使用本包

Web bundle 包含本插件。本包没有配置字段。设置保存在 `localStorage` 的 `dsh.mobile-ui` 中，不会进入模型请求。

自动在视口窄于 768px 时使用手机抽屉，否则使用桌面布局。手机和桌面则在任何宽度下强制该呈现。手机呈现生效时，会话列表位于宽度约为屏幕 80% 的左侧抽屉中，可以隐藏仅桌面的操作，也可以让 Enter 插入换行而不是发送。设置页同时报告 `screen.height`、`innerHeight`、安全区 insets，以及页面是否为独立 PWA。

通过 profile patch 停用以下条目即可移除该呈现：

```yaml
- id: ui-mobile
  disabled: true
```

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

浏览器入口注册移动端设置页、会话标题栏按钮和抽屉遮罩。呈现器读取视口，并在 `document.documentElement` 上写入 `data-dsh-mobile-*` 属性和边距变量。它通过 `ctx.layout.setMobilePresentation(active)` 报告手机呈现，使宽侧栏保持挂载并占用宽度为 0 的轨道。样式表再把该列定位为抽屉。注册、存储和呈现器随插件一起离开。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

这些包拥有本插件所扩展的框架、输入栏和设置壳。

- [布局](../ui-layout/README.zh.md) — 列轨道与 `ctx.layout`。
- [会话](../ui-conversation/README.zh.md) — 标题栏、输入栏和 Enter 处理。
- [设置](../ui-settings/README.zh.md) — 设置分区 slot。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包只改变浏览器布局，并把偏好保存在 localStorage 中。

#### KV Cache effect

无；提供方请求及其缓存前缀保持不变。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

手机呈现有以下限制：

- 自动切换点是 768px。768px 到 1024px 仍使用现有的收起栏。
- 手机呈现不为右栏保留轨道。
- 只有手机呈现生效且选中该选项时，Enter 才插入换行。桌面呈现保持当前的 Enter 行为。
- 隐藏内置插件和“在文件中打开”只在手机呈现期间生效。
- 当屏幕高度与视口高度之差已经包含 home indicator 时，独立显示会去掉内侧下边距。浏览器标签页保留 `safe-area-inset-bottom`。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

呈现器与 `mobile.css` 共用 `data-dsh-mobile-layout`、`data-dsh-mobile-drawer`、`data-dsh-mobile-hide-desktop`、`data-dsh-mobile-keyboard` 和 `data-dsh-composer-enter` 属性。

</details>
