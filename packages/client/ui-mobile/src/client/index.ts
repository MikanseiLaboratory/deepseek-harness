/** Smartphone layout for the Web GUI. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { MobileDrawer } from './MobileDrawer.tsx'
import { MobileMenuButton } from './MobileMenuButton.tsx'
import { MobileSettings } from './MobileSettings.tsx'
import { MobilePresenter } from './presenter.ts'
import { createMobileStore } from './store.ts'
import { en, zh, type MobileKey } from './locales.ts'
import './mobile.css'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Smartphone layout settings and drawer controls. */
    'mobile-ui': MobileKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'mobile-ui'

/** Required services: slots, localized copy, and the frame presentation reporter. */
export const inject = ['slots', 'locale', 'layout']

/**
 * Register the Mobile settings page, the header drawer button, and the backdrop.
 * @param ctx - client plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-mobile: dictionaries')
  ctx.effect(() => {
    const handle = createMobileStore()
    const instance = handle.create()
    const store: typeof handle = { ...handle, create: () => instance }
    const presenter = new MobilePresenter(instance, ctx.layout, localStorage)
    const disposeSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'mobile',
      order: 80,
      label: () => ctx.locale.bind(NS)('nav'),
      locale: NS,
      store,
    }, MobileSettings))
    const disposeMenu = ctx.slots.inject('conversation.header.leading', () => ctx.slots.register({
      name: 'conversation.header.leading',
      locale: NS,
      store,
    }, MobileMenuButton))
    const disposeDrawer = ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'mobile-drawer',
      locale: NS,
      store,
    }, MobileDrawer))
    return () => {
      disposeSettings()
      disposeMenu()
      disposeDrawer()
      presenter.dispose()
    }
  }, 'ui-mobile: presentation')
}
