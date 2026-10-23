/** `mobile-ui` namespace dictionaries. English is the source; zh ships with the client. */

/** Simplified Chinese copy. */
export const zh = {
  nav: '移动端',
  intro: '整理手机上的布局和操作。这些设置只保存在这个浏览器里。',
  'layout.title': '布局',
  'layout.description': '自动在窄屏使用手机抽屉，在宽屏使用桌面布局。',
  'layout.auto': '自动',
  'layout.smartphone': '手机抽屉',
  'layout.desktop': '桌面',
  'layout.drawerNote': '会话列表放在左侧抽屉里，宽度约为屏幕的 80%。',
  'hideDesktop.title': '隐藏仅桌面的操作',
  'hideDesktop.description': '隐藏内置插件和“在文件中打开”。',
  'enter.title': 'Enter 键',
  'enter.description': '选择在消息输入栏按 Enter 时的行为。',
  'enter.newline': 'Enter 换行',
  'enter.send': 'Enter 发送',
  'enter.newlineDetail': '只能用发送按钮发送。Shift+Enter 也是换行。',
  'enter.sendDetail': 'Enter 发送消息。Shift+Enter 换行。',
  'diagnostics.title': '诊断',
  'diagnostics.screen': 'screen.height {screen}px · innerHeight {inner}px',
  'diagnostics.safe': '安全区 上 {top}px / 下 {bottom}px',
  'diagnostics.standaloneYes': '独立 PWA',
  'diagnostics.standaloneNo': '浏览器标签页',
  'diagnostics.bottomOutside': '底部条带在页面之外，因此内侧下边距为 0。',
  'diagnostics.bottomInside': '内侧下边距为 {bottom}px。',
  'diagnostics.refresh': '刷新',
  'menu.open': '打开会话',
  'menu.close': '关闭会话',
}

/** Keys owned by the mobile-ui namespace. */
export type MobileKey = keyof typeof zh

/** English copy. */
export const en: Record<MobileKey, string> = {
  nav: 'Mobile',
  intro: 'Arranges phone-style layout and controls. These settings stay in this browser.',
  'layout.title': 'Layout',
  'layout.description': 'Auto uses the smartphone drawer on narrow screens and the desktop layout on wide screens.',
  'layout.auto': 'Auto',
  'layout.smartphone': 'Smartphone drawer',
  'layout.desktop': 'Desktop',
  'layout.drawerNote': 'The session list stays in a left drawer about 80% of the screen wide.',
  'hideDesktop.title': 'Hide desktop-only actions',
  'hideDesktop.description': 'Hides Built-in plugins and Open in Files.',
  'enter.title': 'Enter key',
  'enter.description': 'Choose what Enter does in the message field.',
  'enter.newline': 'Enter inserts a newline',
  'enter.send': 'Enter sends',
  'enter.newlineDetail': 'Send only with the send button. Shift+Enter also inserts a newline.',
  'enter.sendDetail': 'Enter sends the message. Shift+Enter inserts a newline.',
  'diagnostics.title': 'Diagnostics',
  'diagnostics.screen': 'screen.height {screen}px · innerHeight {inner}px',
  'diagnostics.safe': 'Safe area top {top}px · bottom {bottom}px',
  'diagnostics.standaloneYes': 'Standalone PWA',
  'diagnostics.standaloneNo': 'Browser tab',
  'diagnostics.bottomOutside': 'The bottom band is outside the page, so inner bottom padding is 0.',
  'diagnostics.bottomInside': 'Inner bottom padding is {bottom}px.',
  'diagnostics.refresh': 'Refresh',
  'menu.open': 'Open sessions',
  'menu.close': 'Close sessions',
}
