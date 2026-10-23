/**
 * Browser-local mobile preferences and the viewport measurements the
 * smartphone layout reads. Preferences never enter a model request.
 */

/** Layout choice stored for this browser. */
export type MobileLayoutMode = 'auto' | 'smartphone' | 'desktop'

/** What plain Enter does in the composer while smartphone layout is active. */
export type MobileEnterMode = 'newline' | 'send'

/** Resolved presentation. Auto becomes one of these from the viewport width. */
export type MobileActiveLayout = 'smartphone' | 'desktop'

/** Settings kept in localStorage for this browser profile. */
export interface MobilePreferences {
  /** Auto follows the viewport; the other two force a presentation. */
  layout: MobileLayoutMode
  /** Hide Built-in plugins and Open in Files while the smartphone layout is on. */
  hideDesktopActions: boolean
  /** Composer Enter behavior while the smartphone layout is on. */
  enterMode: MobileEnterMode
}

/** One viewport sample, including safe-area insets and standalone display. */
export interface ViewportMetrics {
  /** `window.screen.height` in CSS pixels. */
  screenHeight: number
  /** `window.innerHeight` in CSS pixels. */
  innerHeight: number
  /** `window.innerWidth` in CSS pixels. */
  innerWidth: number
  /** `env(safe-area-inset-top)` in CSS pixels. */
  safeTop: number
  /** `env(safe-area-inset-bottom)` in CSS pixels. */
  safeBottom: number
  /** `env(safe-area-inset-left)` in CSS pixels. */
  safeLeft: number
  /** `env(safe-area-inset-right)` in CSS pixels. */
  safeRight: number
  /** True for an installed standalone display, including legacy iOS `navigator.standalone`. */
  standalone: boolean
}

/** Padding the shell should add inside the visual viewport. */
export interface SafePadding {
  /** Top padding in CSS pixels. */
  top: number
  /** Bottom padding in CSS pixels. Zero when the home indicator already sits outside the page. */
  bottom: number
  /** True when standalone chrome already accounts for the bottom inset. */
  bottomOutside: boolean
}

/** localStorage key for {@link MobilePreferences}. */
export const MOBILE_STORAGE_KEY = 'dsh.mobile-ui'

/** Viewport width below which Auto selects the smartphone drawer. */
export const MOBILE_AUTO_MAX_WIDTH = 768

/** Preferences used when this browser has no stored value. */
export const DEFAULT_PREFERENCES: MobilePreferences = {
  layout: 'auto',
  hideDesktopActions: true,
  enterMode: 'send',
}

/** Tolerance when comparing `screen.height - innerHeight` with safe-area insets. */
const FRAME_TOLERANCE = 8

/**
 * Read a stored preference record.
 * @param raw - localStorage text, or null when the key is absent.
 * @returns the stored record, or the defaults when the text is missing or not a preference record.
 */
export function parsePreferences(raw: string | null): MobilePreferences {
  if (raw === null || raw === '') return { ...DEFAULT_PREFERENCES }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch (error: unknown) {
    // An interrupted write can leave truncated JSON; keep the defaults.
    if (!(error instanceof Error)) throw error
    return { ...DEFAULT_PREFERENCES }
  }
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_PREFERENCES }
  const record = value as Record<string, unknown>
  const layout = record.layout === 'smartphone' || record.layout === 'desktop' || record.layout === 'auto'
    ? record.layout
    : 'auto'
  const enterMode = record.enterMode === 'newline' || record.enterMode === 'send' ? record.enterMode : 'send'
  return {
    layout,
    hideDesktopActions: typeof record.hideDesktopActions === 'boolean' ? record.hideDesktopActions : true,
    enterMode,
  }
}

/**
 * Resolve Auto from the current width.
 * @param mode - stored layout choice.
 * @param width - viewport width in CSS pixels.
 * @returns the presentation to paint.
 */
export function resolveLayout(mode: MobileLayoutMode, width: number): MobileActiveLayout {
  if (mode === 'smartphone') return 'smartphone'
  if (mode === 'desktop') return 'desktop'
  return width < MOBILE_AUTO_MAX_WIDTH ? 'smartphone' : 'desktop'
}

/**
 * Decide inner safe-area padding.
 * Standalone iOS already excludes the status bar and home indicator from
 * `innerHeight` when `screen.height - innerHeight` covers those insets, or
 * when the difference matches the native frame (about 47px or 62px). Adding
 * `safe-area-inset-bottom` again leaves a blank band, so bottom padding is 0.
 * A cover viewport whose height still equals the screen keeps the inset so
 * content clears the home indicator.
 * @param metrics - current viewport sample.
 * @returns the padding to publish as CSS variables.
 */
export function resolveSafePadding(metrics: ViewportMetrics): SafePadding {
  const diff = Math.max(0, metrics.screenHeight - metrics.innerHeight)
  const explained = metrics.safeTop + metrics.safeBottom
  const nativeFrame = Math.abs(diff - 47) <= FRAME_TOLERANCE || Math.abs(diff - 62) <= FRAME_TOLERANCE
  const bottomAlreadyOutside = metrics.standalone && metrics.safeBottom > 0 && (
    diff + FRAME_TOLERANCE >= explained
    || Math.abs(diff - metrics.safeTop) <= FRAME_TOLERANCE
    || nativeFrame
  )
  return {
    top: metrics.safeTop,
    bottom: bottomAlreadyOutside ? 0 : metrics.safeBottom,
    bottomOutside: bottomAlreadyOutside,
  }
}
