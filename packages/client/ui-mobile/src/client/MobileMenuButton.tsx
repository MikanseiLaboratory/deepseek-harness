/** Header control that opens the session drawer while smartphone layout is active. */
import { IconPanelLeftOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createMobileStore } from './store.ts'
import css from './MobileMenuButton.module.css'

/** Header-leading props: localized copy and the mobile store. */
export type MobileMenuButtonProps =
  & PropsLocale<'mobile-ui'>
  & PropsStore<ReturnType<typeof createMobileStore>>

/**
 * Render the session-drawer button, or nothing outside smartphone layout.
 * @param props - translator and mobile store.
 * @returns the button, or null on the desktop presentation.
 */
export function MobileMenuButton({ useStore, actions, t }: MobileMenuButtonProps) {
  const active = useStore(state => state.active)
  const open = useStore(state => state.drawerOpen)
  if (active !== 'smartphone') return null
  return (
    <button
      type="button"
      className={css.menu}
      data-mobile-menu=""
      aria-label={open ? t('menu.close') : t('menu.open')}
      aria-expanded={open}
      onClick={() => { actions.toggleDrawer() }}
    >
      <IconPanelLeftOutlineRegular size={16} />
    </button>
  )
}
