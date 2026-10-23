/** Dimmed backdrop behind the session drawer. The drawer itself is the sidebar column. */
import type { PropsLocale, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { createMobileStore } from './store.ts'
import css from './MobileDrawer.module.css'

/** Overlay props: localized copy and the mobile store. */
export type MobileDrawerProps =
  & PropsLocale<'mobile-ui'>
  & PropsStore<ReturnType<typeof createMobileStore>>

/**
 * Render the drawer backdrop while the smartphone drawer is open.
 * @param props - translator and mobile store.
 * @returns the backdrop button, or null when the drawer is closed or the desktop layout is active.
 */
export function MobileDrawer({ useStore, actions, t }: MobileDrawerProps) {
  const active = useStore(state => state.active)
  const open = useStore(state => state.drawerOpen)
  if (active !== 'smartphone' || !open) return null
  return (
    <button
      type="button"
      className={css.backdrop}
      data-mobile-drawer-backdrop=""
      aria-label={t('menu.close')}
      onClick={() => { actions.setDrawerOpen(false) }}
    />
  )
}
