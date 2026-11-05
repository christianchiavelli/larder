# 3. The design system is a Nuxt layer

**Status:** Accepted · **Decided:** 2026-09-14 · **Commit:** `1024d1b`

## Context

The components that are not about food — the button, the dialog, the pagination, the chart wrapper — are used by every page, are shown in Storybook on their own, and carry translatable words of their own ("Close", "Next page").

Kept as a folder of components inside the app, they would be importable from anywhere, would share the app's i18n namespace, and could quietly start depending on pages.

## Decision

`layers/ui` is a Nuxt layer with its own `nuxt.config.ts`, its own i18n messages, its own CSS entry point, components prefixed `Ui`, and a story beside each component. The app extends it (`nuxt.config.ts`) and consumes it by auto-import.

The dependency direction is one way: the app knows the layer, never the reverse.

## Consequences

- Storybook boots the layer alone, so a component is checked where nothing else exists.
- The layer's words are merged into the app's messages, and neither can drift from the other without `test/app/messages.spec.ts` noticing.
- **One known exception, recorded here because the README used to claim otherwise:** the layer's tokens define the regulated Nutri-Score and NOVA palette (`layers/ui/app/assets/css/tokens.css`), and `ui.css` maps them to the `bg-nutri-*` and `bg-nova-*` utilities that the two badges use. The components stay generic; the palette does not.
- Moving that palette out is not a file move. Tailwind's entry point is the layer's `ui.css`, because `@theme` only takes effect in the file that imports Tailwind, so the palette and the entry point would have to move together and Storybook's build with them. It has not been worth it: a design system carrying a brand palette is ordinary, and the cost of the alternative is a real restructuring against no benefit a reader would see.
- ESLint enforces multi-word component names everywhere except in this directory, where the `Ui` prefix is what keeps them unambiguous.
