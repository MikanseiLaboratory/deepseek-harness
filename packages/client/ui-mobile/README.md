---
description: "Smartphone layout for the Web GUI: a session drawer, compact composer, and browser-local mobile settings."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-mobile

English | [中文](README.zh.md)

## Summary

This package adds a smartphone presentation to the Web GUI. Narrow screens can hide the session list in a left drawer, tighten the composer and transcript, and keep those choices in this browser. Disable it to leave the desktop frame untouched.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

The Web bundle includes this plugin. It has no configuration fields. Settings live in `localStorage` under `dsh.mobile-ui` and never enter a model request.

Auto uses the smartphone drawer when the viewport is narrower than 768px and the desktop layout otherwise. Smartphone and Desktop force that presentation at any width. While the smartphone presentation is active, the session list sits in a left drawer about 80% of the screen wide, desktop-only actions can be hidden, and Enter can insert a newline instead of sending. The settings page also reports `screen.height`, `innerHeight`, safe-area insets, and whether the page is a standalone PWA.

Disable the following row through a profile patch to remove the presentation:

```yaml
- id: ui-mobile
  disabled: true
```

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The browser entry registers the Mobile settings page, the conversation header button, and the drawer backdrop. A presenter reads the viewport and writes `data-dsh-mobile-*` attributes and padding variables on `document.documentElement`. It reports the smartphone presentation through `ctx.layout.setMobilePresentation(active)`, which keeps the wide sidebar mounted on a zero-width track. The stylesheet then positions that column as the drawer. Registration, the store, and the presenter leave with the plugin.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

These packages own the frame, the composer, and the settings shell this plugin extends.

- [Layout](../ui-layout/README.md) — column tracks and `ctx.layout`.
- [Conversation](../ui-conversation/README.md) — header, composer, and Enter handling.
- [Settings](../ui-settings/README.md) — settings section slots.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package only changes browser layout and stores preferences in localStorage.

#### KV Cache effect

None; provider requests and their cached prefixes are unchanged.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

The smartphone presentation has these limits:

- Auto switches at 768px. Widths from 768px to 1024px keep the existing collapsed rail.
- The smartphone presentation reserves no right-column track.
- Enter inserts a newline only while the smartphone presentation is active and that option is selected. The desktop presentation keeps the current Enter behavior.
- Hiding Built-in plugins and Open in Files applies only during the smartphone presentation.
- Standalone display drops the inner bottom padding when the screen-to-viewport difference already accounts for the home indicator. A browser tab keeps `safe-area-inset-bottom`.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The presenter and `mobile.css` share the `data-dsh-mobile-layout`, `data-dsh-mobile-drawer`, `data-dsh-mobile-hide-desktop`, `data-dsh-mobile-keyboard`, and `data-dsh-composer-enter` attributes.

</details>
