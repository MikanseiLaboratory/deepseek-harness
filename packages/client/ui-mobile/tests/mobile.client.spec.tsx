// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { GlobalStandardProps } from '@deepseek-ai/dsh-client-ui-slots'
import { allowAllAccess, bindSnapshotSelector, SlotTestRuntime } from '@deepseek-ai/dsh-client-test-runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileDrawer } from '../src/client/MobileDrawer.tsx'
import { MobileMenuButton } from '../src/client/MobileMenuButton.tsx'
import { MobileSettings } from '../src/client/MobileSettings.tsx'
import * as ClientPlugin from '../src/client/index.ts'
import { en, type MobileKey } from '../src/client/locales.ts'
import {
  DEFAULT_PREFERENCES, parsePreferences, resolveLayout, resolveSafePadding,
  type MobileActiveLayout, type ViewportMetrics,
} from '../src/client/preferences.ts'
import { MobilePresenter, type PreferenceStorage } from '../src/client/presenter.ts'
import { createMobileStore } from '../src/client/store.ts'
import * as HostPlugin from '../src/index.ts'

const presenters: MobilePresenter[] = []

class MemoryStorage implements PreferenceStorage {
  value: string | null = null
  failRead: unknown
  failWrite: unknown
  writes = 0
  getItem(): string | null {
    if (this.failRead !== undefined) {
      const error: unknown = this.failRead
      this.failRead = undefined
      throw error
    }
    return this.value
  }
  setItem(_key: string, value: string): void {
    if (this.failWrite !== undefined) {
      const error: unknown = this.failWrite
      this.failWrite = undefined
      throw error
    }
    this.writes += 1
    this.value = value
  }
}

function setBox(width: number, height: number, screenHeight = height): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
  Object.defineProperty(window.screen, 'height', { configurable: true, value: screenHeight })
}

function metrics(overrides: Partial<ViewportMetrics> = {}): ViewportMetrics {
  return {
    screenHeight: 800, innerHeight: 800, innerWidth: 1280,
    safeTop: 0, safeBottom: 0, safeLeft: 0, safeRight: 0, standalone: false,
    ...overrides,
  }
}

const useResource = (() => ({ status: 'none' as const, value: undefined, failure: undefined, reload: () => {} })) as GlobalStandardProps['useResource']
const usePanelInfo: GlobalStandardProps['usePanelInfo'] = selector => selector({ activePanelId: null })
const unusedHook = (() => { throw new Error('unused by mobile components') }) as never
const kit = {
  useSessions: unusedHook,
  useSessionStatus: unusedHook,
  useSessionRetainInfo: () => undefined,
  usePanelInfo,
  useResource,
  useWorkspaces: unusedHook,
  ...allowAllAccess,
}

function translate(key: string, params?: Record<string, unknown>): string {
  return en[key as MobileKey].replace(/\{(\w+)\}/g, (_match, name: string) => String(params?.[name] ?? ''))
}

function store() {
  return createMobileStore().create()
}

function activate(instance: ReturnType<typeof store>, active: MobileActiveLayout): void {
  const width = active === 'smartphone' ? 390 : 1280
  act(() => {
    instance.actions.publishViewport(
      metrics({ innerWidth: width }),
      { top: 0, bottom: 0, bottomOutside: false },
      active,
    )
  })
}

beforeEach(() => {
  setBox(1280, 800)
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: null })
  localStorage.clear()
})

function installMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches, media: '', onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }),
  })
}

afterEach(() => {
  for (const presenter of presenters.splice(0)) presenter.dispose()
  document.body.replaceChildren()
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('preferences', () => {
  it('returns defaults for missing, empty, and non-record text', () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('{')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('null')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences('1')).toEqual(DEFAULT_PREFERENCES)
    expect(parsePreferences(JSON.stringify({ layout: 'phone', enterMode: 'return', hideDesktopActions: 'yes' }))).toEqual(DEFAULT_PREFERENCES)
  })

  it('rethrows a non-Error from JSON parsing', () => {
    const parse = vi.spyOn(JSON, 'parse').mockImplementation(() => { throw 'truncated' })
    expect(() => { parsePreferences('x') }).toThrow('truncated')
    parse.mockRestore()
  })

  it('reads a stored record and fills invalid fields from the defaults', () => {
    expect(parsePreferences(JSON.stringify({
      layout: 'desktop', hideDesktopActions: false, enterMode: 'newline',
    }))).toEqual({ layout: 'desktop', hideDesktopActions: false, enterMode: 'newline' })
    expect(parsePreferences(JSON.stringify({ layout: 'smartphone' })).layout).toBe('smartphone')
  })

  it('resolves Auto from the viewport width and keeps a forced choice', () => {
    expect(resolveLayout('smartphone', 2000)).toBe('smartphone')
    expect(resolveLayout('desktop', 100)).toBe('desktop')
    expect(resolveLayout('auto', 767)).toBe('smartphone')
    expect(resolveLayout('auto', 768)).toBe('desktop')
  })

  it('drops standalone bottom padding only when the native frame already includes it', () => {
    const row = (overrides: Partial<ViewportMetrics>) => resolveSafePadding(metrics(overrides))
    expect(row({ safeBottom: 34 })).toEqual({ top: 0, bottom: 34, bottomOutside: false })
    expect(row({ standalone: true, safeTop: 47, safeBottom: 0 })).toEqual({ top: 47, bottom: 0, bottomOutside: false })
    expect(row({ standalone: true, safeTop: 47, safeBottom: 34, screenHeight: 800, innerHeight: 719 }))
      .toEqual({ top: 47, bottom: 0, bottomOutside: true })
    expect(row({ standalone: true, safeTop: 20, safeBottom: 100, screenHeight: 800, innerHeight: 780 }))
      .toEqual({ top: 20, bottom: 0, bottomOutside: true })
    expect(row({ standalone: true, safeTop: 100, safeBottom: 40, screenHeight: 800, innerHeight: 753 }))
      .toEqual({ top: 100, bottom: 0, bottomOutside: true })
    expect(row({ standalone: true, safeTop: 100, safeBottom: 40, screenHeight: 800, innerHeight: 738 }))
      .toEqual({ top: 100, bottom: 0, bottomOutside: true })
    expect(row({ standalone: true, safeTop: 100, safeBottom: 40, screenHeight: 800, innerHeight: 762 }))
      .toEqual({ top: 100, bottom: 40, bottomOutside: false })
    expect(row({ standalone: true, safeTop: 100, safeBottom: 40, screenHeight: 800, innerHeight: 761 }))
      .toEqual({ top: 100, bottom: 0, bottomOutside: true })
    expect(row({ standalone: true, safeTop: 47, safeBottom: 34, screenHeight: 700, innerHeight: 800 }))
      .toEqual({ top: 47, bottom: 34, bottomOutside: false })
  })
})

describe('store', () => {
  it('starts from the current viewport and ignores repeated writes', () => {
    setBox(390, 800)
    const instance = store()
    expect(instance.getSnapshot().active).toBe('smartphone')
    const initial = instance.getSnapshot()
    instance.actions.setLayout('auto')
    instance.actions.setHideDesktopActions(true)
    instance.actions.setEnterMode('send')
    instance.actions.setDrawerOpen(false)
    expect(instance.getSnapshot()).toBe(initial)
    instance.actions.setLayout('desktop')
    instance.actions.setHideDesktopActions(false)
    instance.actions.setEnterMode('newline')
    instance.actions.setDrawerOpen(true)
    instance.actions.toggleDrawer()
    expect(instance.getSnapshot().preferences).toEqual({ layout: 'desktop', hideDesktopActions: false, enterMode: 'newline' })
    expect(instance.getSnapshot().drawerOpen).toBe(false)
  })

  it('keeps instances independent and closes the drawer when leaving the smartphone presentation', () => {
    const handle = createMobileStore()
    const first = handle.create()
    const second = handle.create()
    first.actions.setPreferences({ layout: 'smartphone', hideDesktopActions: false, enterMode: 'newline' })
    expect(second.getSnapshot().preferences.layout).toBe('auto')
    first.actions.setDrawerOpen(true)
    const sample = metrics({ innerWidth: 390 })
    const padding = { top: 1, bottom: 2, bottomOutside: false }
    first.actions.publishViewport(sample, padding, 'smartphone')
    const shown = first.getSnapshot()
    first.actions.publishViewport(sample, padding, 'smartphone')
    expect(first.getSnapshot()).toBe(shown)
    expect(shown.drawerOpen).toBe(true)
    first.actions.publishViewport(metrics({ innerWidth: 1280 }), padding, 'desktop')
    expect(first.getSnapshot().drawerOpen).toBe(false)
    expect(first.getSnapshot().active).toBe('desktop')
    first.actions.requestMeasure()
    expect(first.getSnapshot().measureNonce).toBe(1)
  })
})

describe('presenter', () => {
  function mount(storage = new MemoryStorage()) {
    const layout = vi.fn()
    const instance = store()
    const presenter = new MobilePresenter(instance, { setMobilePresentation: layout }, storage)
    presenters.push(presenter)
    return { presenter, storage, layout, instance }
  }

  it('starts when the visual viewport is missing', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
    const { instance } = mount()
    expect(instance.getSnapshot().metrics.innerWidth).toBe(1280)
    expect(document.documentElement.dataset.dshMobileKeyboard).toBeUndefined()
  })

  it('hydrates a stored smartphone choice and paints newline mode without hiding desktop actions', () => {
    installMedia(false)
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({ layout: 'smartphone', hideDesktopActions: false, enterMode: 'newline' })
    const { layout } = mount(storage)
    const root = document.documentElement
    expect(root.dataset.dshMobileLayout).toBe('smartphone')
    expect(root.dataset.dshComposerEnter).toBe('newline')
    expect(root.dataset.dshMobileHideDesktop).toBeUndefined()
    expect(root.style.getPropertyValue('--dsh-mobile-pad-bottom')).toBe('0px')
    expect(layout).toHaveBeenCalledWith(true)
    expect(storage.writes).toBe(0)
  })

  it('starts from defaults when storage cannot be read', () => {
    const storage = new MemoryStorage()
    storage.failRead = new Error('denied')
    mount(storage)
    expect(document.documentElement.dataset.dshMobileLayout).toBeUndefined()
  })

  it('rethrows a non-Error storage read', () => {
    const storage = new MemoryStorage()
    storage.failRead = 'blocked'
    expect(() => new MobilePresenter(store(), { setMobilePresentation: vi.fn() }, storage)).toThrow('blocked')
  })

  it('stops writing after a storage failure and rethrows a non-Error write', () => {
    const denied = new MemoryStorage()
    denied.failWrite = new Error('quota')
    const first = mount(denied)
    first.instance.actions.setLayout('smartphone')
    expect(denied.writes).toBe(0)
    first.instance.actions.setEnterMode('newline')
    expect(denied.writes).toBe(0)
    const rejected = new MemoryStorage()
    rejected.failWrite = 'blocked'
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const second = mount(rejected)
    second.instance.actions.setLayout('desktop')
    expect(error).toHaveBeenCalled()
    expect(rejected.value).toBeNull()
  })

  it('follows resize, safe-area padding, standalone display, and the keyboard viewport', () => {
    const readStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element instanceof HTMLElement && element.dataset.dshMobileSafeProbe !== undefined) {
        return { paddingTop: '47px', paddingRight: '8px', paddingBottom: '34px', paddingLeft: 'nope' } as CSSStyleDeclaration
      }
      return readStyle(element)
    })
    installMedia(true)
    const listeners = new Map<string, Set<() => void>>()
    const visual = {
      height: 800,
      offsetTop: 0,
      addEventListener(type: string, listener: () => void) {
        const group = listeners.get(type) ?? new Set()
        group.add(listener)
        listeners.set(type, group)
      },
      removeEventListener(type: string, listener: () => void) {
        listeners.get(type)?.delete(listener)
      },
    }
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visual })
    const { presenter, instance } = mount()
    const root = document.documentElement
    expect(instance.getSnapshot().metrics).toMatchObject({ safeTop: 47, safeRight: 8, safeBottom: 34, safeLeft: 0, standalone: true })
    setBox(390, 844, 900)
    window.dispatchEvent(new Event('resize'))
    expect(root.dataset.dshMobileLayout).toBe('smartphone')
    visual.offsetTop = 12
    for (const listener of listeners.get('scroll') ?? []) listener()
    expect(root.dataset.dshMobileKeyboard).toBe('1')
    expect(root.style.getPropertyValue('--dsh-mobile-vv-offset')).toBe('12px')
    visual.offsetTop = 0
    visual.height = 500
    for (const listener of listeners.get('resize') ?? []) listener()
    expect(root.dataset.dshMobileKeyboard).toBe('1')
    visual.height = 800
    window.dispatchEvent(new Event('orientationchange'))
    expect(root.dataset.dshMobileKeyboard).toBeUndefined()
    presenter.dispose()
    expect(listeners.get('resize')?.size ?? 0).toBe(0)
    presenter.dispose()
    expect(root.dataset.dshMobileLayout).toBeUndefined()
    expect(root.style.getPropertyValue('--dsh-mobile-pad-top')).toBe('')
  })

  it('treats a legacy standalone navigator as a PWA without a keyboard', () => {
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
    const { instance } = mount()
    expect(instance.getSnapshot().metrics.standalone).toBe(true)
    expect(document.documentElement.dataset.dshMobileKeyboard).toBeUndefined()
    Reflect.deleteProperty(navigator, 'standalone')
  })

  it('closes the drawer from a sidebar control or Escape, and leaves it open otherwise', () => {
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({ layout: 'smartphone', hideDesktopActions: true, enterMode: 'send' })
    const { instance } = mount(storage)
    const root = document.documentElement
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    instance.actions.setDrawerOpen(true)
    expect(root.dataset.dshMobileDrawer).toBe('open')
    expect(root.dataset.dshMobileHideDesktop).toBe('1')
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    const column = document.createElement('div')
    column.setAttribute('data-sidebar-col', '')
    const plain = document.createElement('div')
    const button = document.createElement('button')
    const text = document.createTextNode('Session')
    button.append(text)
    column.append(plain, button)
    document.body.append(column)
    plain.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    text.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    const group = document.createElement('div')
    group.setAttribute('role', 'treeitem')
    group.setAttribute('aria-expanded', 'false')
    column.append(group)
    group.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    const session = document.createElement('div')
    session.setAttribute('role', 'treeitem')
    session.setAttribute('aria-selected', 'false')
    const title = document.createElement('span')
    title.textContent = 'Session'
    session.append(title)
    column.append(session)
    title.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    instance.actions.setDrawerOpen(true)
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    instance.actions.setDrawerOpen(true)
    document.body.append(Object.assign(document.createElement('div'), { role: 'dialog' }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    document.querySelector('[role="dialog"]')?.remove()
    const prevented = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    prevented.preventDefault()
    document.dispatchEvent(prevented)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    instance.actions.setLayout('desktop')
    instance.actions.setDrawerOpen(true)
    expect(root.dataset.dshMobileDrawer).toBeUndefined()
    expect(root.dataset.dshMobileHideDesktop).toBeUndefined()
    expect(root.dataset.dshComposerEnter).toBeUndefined()
  })

  it('opens the drawer from a rightward touch that starts at the left edge', () => {
    const storage = new MemoryStorage()
    storage.value = JSON.stringify({ layout: 'smartphone', hideDesktopActions: true, enterMode: 'send' })
    const { instance } = mount(storage)
    const pointer = (type: string, x: number, y: number, pointerType = 'touch', pointerId = 1): void => {
      document.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId, pointerType, isPrimary: true,
      }))
    }
    pointer('pointerdown', 200, 40)
    pointer('pointerup', 280, 40)
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    pointer('pointerdown', 8, 40, 'mouse')
    pointer('pointerup', 90, 40, 'mouse')
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    pointer('pointerdown', 8, 40)
    pointer('pointermove', 20, 80)
    pointer('pointerup', 90, 120)
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    pointer('pointerdown', 8, 40)
    pointer('pointerup', 30, 42)
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    pointer('pointerdown', 8, 40)
    pointer('pointermove', 40, 44)
    pointer('pointercancel', 40, 44)
    pointer('pointerup', 100, 44)
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    pointer('pointerdown', 8, 40)
    pointer('pointerup', 90, 48)
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    expect(document.documentElement.dataset.dshMobileDrawer).toBe('open')
    pointer('pointerdown', 8, 40)
    pointer('pointerup', 120, 40)
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    instance.actions.setLayout('desktop')
    instance.actions.setDrawerOpen(false)
    pointer('pointerdown', 8, 40)
    pointer('pointerup', 120, 40)
    expect(instance.getSnapshot().drawerOpen).toBe(false)
  })
})

describe('components', () => {
  it('renders the settings page and writes each control', () => {
    const instance = store()
    const view = render(<MobileSettings
      {...kit}
      close={() => {}}
      useStore={bindSnapshotSelector(instance)}
      actions={instance.actions}
      t={translate}
    />)
    expect(view.getByText(en.intro)).toBeTruthy()
    expect(view.getByText('Browser tab')).toBeTruthy()
    expect(view.getByText('Inner bottom padding is 0px.')).toBeTruthy()
    expect(view.getAllByRole('tabpanel', { hidden: true })).toHaveLength(5)
    fireEvent.click(view.getByRole('tab', { name: 'Smartphone drawer' }))
    fireEvent.click(view.getByRole('tab', { name: 'Enter inserts a newline' }))
    fireEvent.click(view.getByRole('switch', { name: 'Hide desktop-only actions' }))
    fireEvent.click(view.getByRole('button', { name: 'Refresh' }))
    expect(instance.getSnapshot().preferences).toEqual({ layout: 'smartphone', hideDesktopActions: false, enterMode: 'newline' })
    expect(instance.getSnapshot().measureNonce).toBe(1)
    expect(view.getByText(en['enter.newlineDetail'])).toBeTruthy()
    act(() => {
      instance.actions.publishViewport(
        metrics({ screenHeight: 852, innerHeight: 771, safeTop: 47, safeBottom: 34, standalone: true }),
        { top: 47, bottom: 0, bottomOutside: true },
        'smartphone',
      )
    })
    expect(view.getByText('screen.height 852px · innerHeight 771px')).toBeTruthy()
    expect(view.getByText('Safe area top 47px · bottom 34px')).toBeTruthy()
    expect(view.getByText('Standalone PWA')).toBeTruthy()
    expect(view.getByText('The bottom band is outside the page, so inner bottom padding is 0.')).toBeTruthy()
  })

  it('shows the drawer button and backdrop only for the smartphone presentation', () => {
    const instance = store()
    const menu = render(<MobileMenuButton {...kit} useStore={bindSnapshotSelector(instance)} actions={instance.actions} t={translate} />)
    const drawer = render(<MobileDrawer {...kit} useStore={bindSnapshotSelector(instance)} actions={instance.actions} t={translate} />)
    const menuView = within(menu.container)
    const drawerView = within(drawer.container)
    expect(menuView.queryByRole('button')).toBeNull()
    expect(drawerView.queryByRole('button')).toBeNull()
    activate(instance, 'smartphone')
    fireEvent.click(menuView.getByRole('button', { name: 'Open sessions' }))
    expect(instance.getSnapshot().drawerOpen).toBe(true)
    expect(menuView.getByRole('button', { name: 'Close sessions' }).getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(drawerView.getByRole('button', { name: 'Close sessions' }))
    expect(instance.getSnapshot().drawerOpen).toBe(false)
    activate(instance, 'desktop')
    act(() => { instance.actions.setDrawerOpen(true) })
    expect(menuView.queryByRole('button')).toBeNull()
    expect(drawerView.queryByRole('button')).toBeNull()
  })
})

describe('plugin', () => {
  it('has no host behavior', () => {
    expect(HostPlugin.apply()).toBeUndefined()
    expect(ClientPlugin.inject).toEqual(['slots', 'locale', 'layout'])
  })

  it('registers the page, header button, and backdrop, then removes the presentation', async () => {
    const host = await SlotTestRuntime.create()
    const locale = new LocaleRuntime(host.ctx)
    locale.setLocale('en')
    const setMobilePresentation = vi.fn()
    host.ctx.provide('locale', locale)
    host.ctx.provide('layout', { setMobilePresentation })
    host.slots.installLocale(locale)
    await host.declare({
      'settings.section': { kind: 'list', scope: 'root' },
      'conversation.header.leading': { kind: 'single', scope: 'root' },
      'shell.overlay': { kind: 'list', scope: 'root' },
    })
    const handle = await host.mount(ClientPlugin)
    const section = host.slots.entries('settings.section')[0]!
    expect(section.options).toMatchObject({ id: 'mobile', order: 80 })
    const label = section.options.label
    expect(typeof label).toBe('function')
    if (typeof label === 'function') expect(label()).toBe('Mobile')
    expect(host.slots.entries('conversation.header.leading')).toHaveLength(1)
    expect(host.slots.entries('shell.overlay').some(entry => entry.options.id === 'mobile-drawer')).toBe(true)
    const shared = section.store
    expect(shared).toBeDefined()
    if (shared !== undefined && 'create' in shared) {
      expect(shared.create()).toBe(shared.create())
    }
    expect(setMobilePresentation).toHaveBeenCalledWith(false)
    await handle.dispose()
    expect(document.querySelector('[data-dsh-mobile-safe-probe]')).toBeNull()
    expect(document.documentElement.hasAttribute('data-dsh-mobile-layout')).toBe(false)
    await host.dispose()
  })
})
