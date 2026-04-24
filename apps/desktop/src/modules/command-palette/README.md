# Command Palette

Opens via Cmd+K or the sidebar search button. Items are computed from settings state via `CommandPaletteCx.buildItems()`. Add new sources there.

## Keyboard navigation

Two navigation modes coexist intentionally.

**Arrow keys** navigate `activeIndex` without leaving the input. Focus stays in the search field so the user can keep typing at any point. Enter confirms the highlighted item.

**Tab** moves browser focus through every interactive element in the palette: the input, the items, and any future controls like filters. Arrow keys only navigate the item list, so they cannot substitute for Tab. Keyboard-only users and screen readers depend on Tab to reach all focusable elements in a modal.

Both modes feed the same `activeIndex` state, so Enter always confirms whichever item is highlighted regardless of how it was reached.
