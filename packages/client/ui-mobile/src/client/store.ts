/**
 * Shared mobile-ui state: preferences, the resolved presentation, and the
 * latest viewport sample. One handle is created in apply and shared by the
 * settings page, the menu button, and the drawer.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import {
  DEFAULT_PREFERENCES, resolveLayout,
  type MobileActiveLayout, type MobileEnterMode, type MobileLayoutMode, type MobilePreferences,
  type SafePadding, type ViewportMetrics,
} from './preferences.ts'

/** Store snapshot. */
export interface MobileState {
  /** Browser-local preferences. */
  preferences: MobilePreferences
  /** Whether the session drawer is open. */
  drawerOpen: boolean
  /** Latest viewport sample. */
  metrics: ViewportMetrics
  /** Padding derived from the sample. */
  padding: SafePadding
  /** Presentation currently painted. */
  active: MobileActiveLayout
  /** Incremented when the settings page asks for a fresh measurement. */
  measureNonce: number
}

/**
 * Annotation twin of the actions literal below. The export needs a declared
 * return type; drift fails assignability at the defineStore call.
 */
type MobileActions = {
  setPreferences: (draft: MobileState, preferences: MobilePreferences) => void
  setLayout: (draft: MobileState, layout: MobileLayoutMode) => void
  setHideDesktopActions: (draft: MobileState, hidden: boolean) => void
  setEnterMode: (draft: MobileState, mode: MobileEnterMode) => void
  setDrawerOpen: (draft: MobileState, open: boolean) => void
  toggleDrawer: (draft: MobileState) => void
  publishViewport: (draft: MobileState, metrics: ViewportMetrics, padding: SafePadding, active: MobileActiveLayout) => void
  requestMeasure: (draft: MobileState) => void
}

/** Empty metrics before the presenter samples the viewport. */
function initialMetrics(): ViewportMetrics {
  const width = window.innerWidth
  const height = window.innerHeight
  return {
    screenHeight: height,
    innerHeight: height,
    innerWidth: width,
    safeTop: 0,
    safeBottom: 0,
    safeLeft: 0,
    safeRight: 0,
    standalone: false,
  }
}

/**
 * Create the mobile-ui store handle.
 * @returns the handle shared by this plugin's registrations.
 */
export function createMobileStore(): EngineStoreHandle<MobileState, MobileActions> {
  const metrics = initialMetrics()
  return defineStore({
    init: (): MobileState => ({
      preferences: { ...DEFAULT_PREFERENCES },
      drawerOpen: false,
      metrics,
      padding: { top: 0, bottom: 0, bottomOutside: false },
      active: resolveLayout(DEFAULT_PREFERENCES.layout, metrics.innerWidth),
      measureNonce: 0,
    }),
    actions: {
      /**
       * Replace the stored preferences.
       * @param draft - current snapshot.
       * @param preferences - next preferences.
       */
      setPreferences: (draft: MobileState, preferences: MobilePreferences) => {
        draft.preferences = preferences
      },
      /**
       * Set the layout choice.
       * @param draft - current snapshot.
       * @param layout - next layout choice.
       */
      setLayout: (draft: MobileState, layout: MobileLayoutMode) => {
        if (draft.preferences.layout === layout) return
        draft.preferences = { ...draft.preferences, layout }
      },
      /**
       * Set whether desktop-only actions stay hidden in smartphone layout.
       * @param draft - current snapshot.
       * @param hidden - next value.
       */
      setHideDesktopActions: (draft: MobileState, hidden: boolean) => {
        if (draft.preferences.hideDesktopActions === hidden) return
        draft.preferences = { ...draft.preferences, hideDesktopActions: hidden }
      },
      /**
       * Set composer Enter behavior for smartphone layout.
       * @param draft - current snapshot.
       * @param mode - next Enter behavior.
       */
      setEnterMode: (draft: MobileState, mode: MobileEnterMode) => {
        if (draft.preferences.enterMode === mode) return
        draft.preferences = { ...draft.preferences, enterMode: mode }
      },
      /**
       * Open or close the session drawer.
       * @param draft - current snapshot.
       * @param open - whether the drawer is open.
       */
      setDrawerOpen: (draft: MobileState, open: boolean) => {
        if (draft.drawerOpen === open) return
        draft.drawerOpen = open
      },
      /** Toggle the session drawer. */
      toggleDrawer: (draft: MobileState) => {
        draft.drawerOpen = !draft.drawerOpen
      },
      /**
       * Publish one viewport sample and the presentation it resolves to.
       * @param draft - current snapshot.
       * @param metrics - next sample.
       * @param padding - padding derived from that sample.
       * @param active - presentation to paint.
       */
      publishViewport: (draft: MobileState, metrics: ViewportMetrics, padding: SafePadding, active: MobileActiveLayout) => {
        const sameMetrics = draft.metrics.screenHeight === metrics.screenHeight
          && draft.metrics.innerHeight === metrics.innerHeight
          && draft.metrics.innerWidth === metrics.innerWidth
          && draft.metrics.safeTop === metrics.safeTop
          && draft.metrics.safeBottom === metrics.safeBottom
          && draft.metrics.safeLeft === metrics.safeLeft
          && draft.metrics.safeRight === metrics.safeRight
          && draft.metrics.standalone === metrics.standalone
        const samePadding = draft.padding.top === padding.top
          && draft.padding.bottom === padding.bottom
          && draft.padding.bottomOutside === padding.bottomOutside
        if (sameMetrics && samePadding && draft.active === active) return
        draft.metrics = metrics
        draft.padding = padding
        if (draft.active !== active) {
          draft.active = active
          if (active !== 'smartphone') draft.drawerOpen = false
        }
      },
      /** Ask the presenter to sample the viewport again. */
      requestMeasure: (draft: MobileState) => {
        draft.measureNonce += 1
      },
    },
  })
}
