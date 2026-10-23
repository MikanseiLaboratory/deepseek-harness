/**
 * Paints smartphone presentation onto the document from the mobile store.
 * Preferences stay in localStorage. Nothing here enters a model request.
 */
import {
  DEFAULT_PREFERENCES, MOBILE_STORAGE_KEY, parsePreferences, resolveLayout, resolveSafePadding,
  type MobilePreferences, type ViewportMetrics,
} from './preferences.ts'
import type { createMobileStore } from './store.ts'
import type { MobileState } from './store.ts'

/** Store instance shared with the settings page, menu, and drawer. */
type MobileInstance = ReturnType<ReturnType<typeof createMobileStore>['create']>

/** The layout service method this presenter calls. */
export interface MobileLayout {
  /**
   * Report whether the smartphone drawer owns the sidebar column.
   * @param active - true while the smartphone presentation is painted.
   */
  setMobilePresentation(active: boolean): void
}

/** Storage used for browser-local preferences. Tests supply a memory stand-in. */
export interface PreferenceStorage {
  /**
   * Read one key.
   * @param key - storage key.
   * @returns the stored text, or null when the key is absent.
   */
  getItem(key: string): string | null
  /**
   * Write one key.
   * @param key - storage key.
   * @param value - text to store.
   */
  setItem(key: string, value: string): void
}

/** Difference that reads as the on-screen keyboard rather than browser chrome. */
const KEYBOARD_THRESHOLD = 150

/**
 * Read a CSS pixel length. Non-lengths (including an empty computed value) are 0.
 * @param value - a computed padding string.
 * @returns the pixel length.
 */
function readPx(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Set or remove one attribute. */
function setAttr(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name)
  else element.setAttribute(name, value)
}

/**
 * Subscribe to viewport changes and the mobile store, then project both onto
 * the document element and `ctx.layout`.
 */
export class MobilePresenter {
  private readonly probe: HTMLDivElement
  private unsubscribe: (() => void) | null = null
  private visual: VisualViewport | null = null
  private seenNonce = 0
  private seenPreferences: MobilePreferences = { ...DEFAULT_PREFERENCES }
  private lastWritten = ''
  private writesEnabled = true

  /**
   * Hydrate preferences, sample the viewport, and start listening.
   * @param store - the shared mobile store instance.
   * @param layout - the frame's presentation reporter.
   * @param storage - browser storage for preferences.
   */
  constructor(
    private readonly store: MobileInstance,
    private readonly layout: MobileLayout,
    private readonly storage: PreferenceStorage,
  ) {
    this.probe = document.createElement('div')
    this.probe.dataset.dshMobileSafeProbe = ''
    this.probe.style.position = 'fixed'
    this.probe.style.visibility = 'hidden'
    this.probe.style.pointerEvents = 'none'
    this.probe.style.paddingTop = 'env(safe-area-inset-top)'
    this.probe.style.paddingRight = 'env(safe-area-inset-right)'
    this.probe.style.paddingBottom = 'env(safe-area-inset-bottom)'
    this.probe.style.paddingLeft = 'env(safe-area-inset-left)'
    document.body.append(this.probe)
    const stored = parsePreferences(this.readRaw())
    this.lastWritten = JSON.stringify(stored)
    this.store.actions.setPreferences(stored)
    const hydrated = this.store.getSnapshot()
    this.seenNonce = hydrated.measureNonce
    this.seenPreferences = hydrated.preferences
    this.unsubscribe = this.store.subscribe(() => { this.onStore() })
    window.addEventListener('resize', this.onViewport)
    window.addEventListener('orientationchange', this.onViewport)
    // Bubble, so a session row's own click selects the session before the drawer closes.
    document.addEventListener('click', this.onClick)
    document.addEventListener('keydown', this.onKeyDown)
    const visual = window.visualViewport ?? null
    if (visual !== null) {
      visual.addEventListener('resize', this.onViewport)
      visual.addEventListener('scroll', this.onViewport)
      this.visual = visual
    }
    this.remeasure()
  }

  /** Remove listeners, the probe, and every attribute and variable this presenter wrote. */
  dispose(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    window.removeEventListener('resize', this.onViewport)
    window.removeEventListener('orientationchange', this.onViewport)
    document.removeEventListener('click', this.onClick)
    document.removeEventListener('keydown', this.onKeyDown)
    this.visual?.removeEventListener('resize', this.onViewport)
    this.visual?.removeEventListener('scroll', this.onViewport)
    this.visual = null
    this.probe.remove()
    this.clearPaint()
    this.layout.setMobilePresentation(false)
  }

  private readonly onViewport = (): void => { this.remeasure() }

  private readonly onClick = (event: MouseEvent): void => {
    if (document.documentElement.dataset.dshMobileDrawer !== 'open') return
    const node = event.target
    if (!(node instanceof Element)) return
    if (node.closest('[data-sidebar-col]') === null) return
    // Session and search rows are treeitems with aria-selected. Group headers
    // are treeitems too, but they only expand, so they leave the drawer open.
    // Row menus stop the click before it reaches the document.
    const opensSession = node.closest('[role="treeitem"][aria-selected]') !== null
    const control = node.closest('button, a')
    if (!opensSession && control === null) return
    this.store.actions.setDrawerOpen(false)
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (document.documentElement.dataset.dshMobileDrawer !== 'open') return
    if (document.querySelector('[role="menu"], [role="dialog"], [data-shortcut-modal]') !== null) return
    this.store.actions.setDrawerOpen(false)
  }

  private onStore(): void {
    const state = this.store.getSnapshot()
    const preferencesChanged = state.preferences !== this.seenPreferences
    const nonceChanged = state.measureNonce !== this.seenNonce
    this.seenNonce = state.measureNonce
    this.seenPreferences = state.preferences
    // Layout and Enter choices change the sampled presentation, so measure again.
    if (preferencesChanged || nonceChanged) {
      this.remeasure()
      return
    }
    this.paint(state)
    this.persist(state.preferences)
  }

  private remeasure(): void {
    const metrics = this.sample()
    const state = this.store.getSnapshot()
    this.store.actions.publishViewport(
      metrics,
      resolveSafePadding(metrics),
      resolveLayout(state.preferences.layout, metrics.innerWidth),
    )
    const next = this.store.getSnapshot()
    this.paint(next)
    this.persist(next.preferences)
  }

  private readRaw(): string | null {
    try {
      return this.storage.getItem(MOBILE_STORAGE_KEY)
    } catch (error: unknown) {
      // A blocked storage API cannot hydrate; start from the defaults.
      if (!(error instanceof Error)) throw error
      return null
    }
  }

  private persist(preferences: MobilePreferences): void {
    if (!this.writesEnabled) return
    const json = JSON.stringify(preferences)
    if (json === this.lastWritten) return
    try {
      this.storage.setItem(MOBILE_STORAGE_KEY, json)
      this.lastWritten = json
    } catch (error: unknown) {
      // A full or blocked localStorage cannot accept another write; later edits stay in memory.
      if (!(error instanceof Error)) throw error
      this.writesEnabled = false
    }
  }

  private standaloneDisplay(): boolean {
    if (typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(display-mode: standalone)').matches
  }

  private sample(): ViewportMetrics {
    const style = getComputedStyle(this.probe)
    const nav = navigator as Navigator & { standalone?: boolean }
    return {
      screenHeight: window.screen.height,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      safeTop: readPx(style.paddingTop),
      safeBottom: readPx(style.paddingBottom),
      safeLeft: readPx(style.paddingLeft),
      safeRight: readPx(style.paddingRight),
      standalone: nav.standalone === true || this.standaloneDisplay(),
    }
  }

  private viewportBox(): { height: number; offset: number; keyboard: boolean } {
    const visual = window.visualViewport ?? null
    if (visual === null) return { height: window.innerHeight, offset: 0, keyboard: false }
    const offset = visual.offsetTop
    const keyboard = offset > 0 || window.innerHeight - visual.height > KEYBOARD_THRESHOLD
    return { height: visual.height, offset, keyboard }
  }

  private paint(state: MobileState): void {
    const root = document.documentElement
    const smartphone = state.active === 'smartphone'
    const box = this.viewportBox()
    setAttr(root, 'data-dsh-mobile-layout', smartphone ? 'smartphone' : null)
    setAttr(root, 'data-dsh-mobile-drawer', smartphone && state.drawerOpen ? 'open' : null)
    setAttr(root, 'data-dsh-composer-enter', smartphone && state.preferences.enterMode === 'newline' ? 'newline' : null)
    setAttr(root, 'data-dsh-mobile-hide-desktop', smartphone && state.preferences.hideDesktopActions ? '1' : null)
    setAttr(root, 'data-dsh-mobile-keyboard', smartphone && box.keyboard ? '1' : null)
    if (smartphone) {
      root.style.setProperty('--dsh-mobile-pad-top', `${state.padding.top}px`)
      root.style.setProperty('--dsh-mobile-pad-bottom', `${state.padding.bottom}px`)
      root.style.setProperty('--dsh-mobile-vv-height', `${box.height}px`)
      root.style.setProperty('--dsh-mobile-vv-offset', `${box.offset}px`)
    } else {
      this.clearVariables(root)
    }
    this.layout.setMobilePresentation(smartphone)
  }

  private clearPaint(): void {
    const root = document.documentElement
    setAttr(root, 'data-dsh-mobile-layout', null)
    setAttr(root, 'data-dsh-mobile-drawer', null)
    setAttr(root, 'data-dsh-composer-enter', null)
    setAttr(root, 'data-dsh-mobile-hide-desktop', null)
    setAttr(root, 'data-dsh-mobile-keyboard', null)
    this.clearVariables(root)
  }

  private clearVariables(root: HTMLElement): void {
    root.style.removeProperty('--dsh-mobile-pad-top')
    root.style.removeProperty('--dsh-mobile-pad-bottom')
    root.style.removeProperty('--dsh-mobile-vv-height')
    root.style.removeProperty('--dsh-mobile-vv-offset')
  }
}
