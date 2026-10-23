/** Japanese dictionary for the `mobile-ui` namespace (client/ui-mobile/src/client/locales.ts). */
import type { LocaleDictOf } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: loads the `mobile-ui` key union declared by @deepseek-ai/dsh-client-ui-mobile.
import type {} from '@deepseek-ai/dsh-client-ui-mobile/client'

/** `mobile-ui` copy in Japanese, complete against the owner's key union. */
export const ja: LocaleDictOf<'mobile-ui'> = {
  nav: 'モバイル',
  intro: 'スマホ風の表示と操作を整えます。設定はこのブラウザに保存されます。',
  'layout.title': 'レイアウト',
  'layout.description': '自動では、狭い画面でスマホのドロワー、広い画面でデスクトップ表示を使います。',
  'layout.auto': '自動',
  'layout.smartphone': 'スマホのドロワー',
  'layout.desktop': 'デスクトップ',
  'layout.drawerNote': 'セッション一覧は画面幅の約80%の左ドロワーに入ります。',
  'hideDesktop.title': 'デスクトップ専用の操作を隠す',
  'hideDesktop.description': '組み込みプラグインと「ファイルで開く」を隠します。',
  'enter.title': 'Enter キー',
  'enter.description': 'メッセージ入力欄で Enter を押したときの動作を選びます。',
  'enter.newline': 'Enter で改行',
  'enter.send': 'Enter で送信',
  'enter.newlineDetail': '送信は送信ボタンだけです。Shift+Enter も改行します。',
  'enter.sendDetail': 'Enter でメッセージを送信します。Shift+Enter は改行します。',
  'diagnostics.title': '診断',
  'diagnostics.screen': 'screen.height {screen}px · innerHeight {inner}px',
  'diagnostics.safe': 'セーフエリア 上{top}px / 下{bottom}px',
  'diagnostics.standaloneYes': 'スタンドアロン PWA',
  'diagnostics.standaloneNo': 'ブラウザのタブ',
  'diagnostics.bottomOutside': '下の帯はページの外なので、内側の下余白は 0 です。',
  'diagnostics.bottomInside': '内側の下余白は {bottom}px です。',
  'diagnostics.refresh': '更新',
  'menu.open': 'セッションを開く',
  'menu.close': 'セッションを閉じる',
}
