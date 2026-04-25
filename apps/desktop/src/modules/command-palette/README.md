# Command Palette

Opens via Cmd+K or the sidebar search button. Items are computed from settings state via `CommandPaletteCx.buildItems()`. Add new sources there.

## Keyboard navigation

The search input keeps focus while arrow keys move a virtual selection through the result list. Enter confirms the highlighted item. Escape closes the palette.

The active result is exposed to assistive technology without moving browser focus into the list. List items stay out of the Tab order, and Tab cycles only through controls in the modal, such as the search input, close action, or future controls like filters.

## Alternatives considered

**Tab through list items.** ChatGPT does this. It was implemented and tested but removed because it added some complexity and breaks the cleaner separation between modal controls and virtual result navigation.
