/** Mobile settings page: layout, desktop-action visibility, Enter behavior, and viewport diagnostics. */
import { Button, SegmentedControl, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { MobileEnterMode, MobileLayoutMode } from './preferences.ts'
import type { createMobileStore } from './store.ts'
import css from './MobileSettings.module.css'

/** Full page props: section owner share, localized copy, and the mobile store. */
export type MobileSettingsProps =
  & PropsRuntime<'settings.section'>
  & PropsLocale<'mobile-ui'>
  & PropsStore<ReturnType<typeof createMobileStore>>

const LAYOUTS: readonly MobileLayoutMode[] = ['auto', 'smartphone', 'desktop']
const ENTERS: readonly MobileEnterMode[] = ['newline', 'send']

/**
 * Render the hidden tab panels a segmented control names with `aria-controls`.
 * @param props.id - the control's base id.
 * @param props.values - segment values, in display order.
 * @param props.active - the selected value; other panels stay in the document but hidden.
 * @returns one tabpanel per segment.
 */
function SegmentPanels({ id, values, active }: { id: string; values: readonly string[]; active: string }) {
  return values.map(value => (
    <div
      key={value}
      id={`${id}-${value}-panel`}
      role="tabpanel"
      aria-labelledby={`${id}-${value}`}
      hidden={value !== active}
    />
  ))
}

/**
 * Render the Mobile settings page.
 * @param props - section share, translator, and mobile store.
 * @returns the page element.
 */
export function MobileSettings({ useStore, actions, t }: MobileSettingsProps) {
  const preferences = useStore(state => state.preferences)
  const metrics = useStore(state => state.metrics)
  const padding = useStore(state => state.padding)
  return (
    <div className={css.page} data-mobile-settings="">
      <p className={css.intro}>{t('intro')}</p>
      <section className={css.block}>
        <div className={css.title}>{t('layout.title')}</div>
        <p className={css.description}>{t('layout.description')}</p>
        <SegmentedControl
          id="mobile-layout"
          className={css.segments}
          label={t('layout.title')}
          value={preferences.layout}
          options={LAYOUTS.map(value => ({ value, label: t(`layout.${value}`) }))}
          onChange={(layout) => { actions.setLayout(layout) }}
        />
        <SegmentPanels id="mobile-layout" values={LAYOUTS} active={preferences.layout} />
        <p className={css.note}>{t('layout.drawerNote')}</p>
      </section>
      <div className={css.row}>
        <div>
          <div className={css.title}>{t('hideDesktop.title')}</div>
          <p className={css.description}>{t('hideDesktop.description')}</p>
        </div>
        <Switch
          checked={preferences.hideDesktopActions}
          label={t('hideDesktop.title')}
          onChange={(hidden) => { actions.setHideDesktopActions(hidden) }}
        />
      </div>
      <section className={css.block}>
        <div className={css.title}>{t('enter.title')}</div>
        <p className={css.description}>{t('enter.description')}</p>
        <SegmentedControl
          id="mobile-enter"
          className={css.segments}
          label={t('enter.title')}
          value={preferences.enterMode}
          options={ENTERS.map(value => ({ value, label: t(`enter.${value}`) }))}
          onChange={(mode) => { actions.setEnterMode(mode) }}
        />
        <SegmentPanels id="mobile-enter" values={ENTERS} active={preferences.enterMode} />
        <p className={css.note}>{t(preferences.enterMode === 'newline' ? 'enter.newlineDetail' : 'enter.sendDetail')}</p>
      </section>
      <section className={css.block}>
        <div className={css.title}>{t('diagnostics.title')}</div>
        <dl className={css.diagnostics}>
          <div>{t('diagnostics.screen', { screen: metrics.screenHeight, inner: metrics.innerHeight })}</div>
          <div>{t('diagnostics.safe', { top: metrics.safeTop, bottom: metrics.safeBottom })}</div>
          <div>{metrics.standalone ? t('diagnostics.standaloneYes') : t('diagnostics.standaloneNo')}</div>
          <div>{padding.bottomOutside
            ? t('diagnostics.bottomOutside')
            : t('diagnostics.bottomInside', { bottom: padding.bottom })}</div>
        </dl>
        <Button size="sm" variant="outline" onClick={() => { actions.requestMeasure() }}>{t('diagnostics.refresh')}</Button>
      </section>
    </div>
  )
}
