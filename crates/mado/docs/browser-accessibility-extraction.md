# Browser Accessibility Extraction

`mado` reads active-tab URLs and browser content bounds through macOS
Accessibility. It uses explicit browser bundle IDs because sharing a browser
engine does not guarantee the same Accessibility structure.

## Extraction Model

`BrowserInfo` selects the extraction path and routes address-bar lookup for
observation. Each path returns a URL and optional content bounds. Browser-specific
helpers handle tree traversal. URL normalization, bounds clipping, and metadata
assembly remain shared.

### Browser Families

- `chromium`: reads top-level web content, then falls back to an unfocused address field.
- `gecko`: uses the same extraction path as Chromium, including the address-field fallback.
- `safari`: requires the document URL because its shortened address field can omit
  the page path. A recognized native Start Page with no web document is reported
  as `about:blank`.

Shared web-content traversal stops at the nearest `AXWebArea` or `AXDocument`.
Nested web areas can represent embedded pages rather than the active tab.

### Special Cases

- `ego`: hit-tests the window center and follows parents to the outermost web
  document inside that window, excluding iframe URLs. It requires the hit-tested
  document's URL and has no address-bar fallback.
- `vivaldi`: traverses the browser's interface web area to reach the active page,
  excluding web panels and inactive tabs.

### Shared Behavior

An `AXTextField` or `AXComboBox` can expose the address bar value. `AXWebArea.AXURL`
or `AXDocument.AXURL` can expose the loaded document URL. The document URL takes
precedence so an uncommitted address edit does not change the reported website.
Stable Accessibility or DOM identifiers identify known address fields independently
of localized labels.

Address-field fallback requires the field to report that it is not focused. An
unreadable focus state produces no fallback URL. When no scheme is present,
`localhost`, bracketed IPv6, and dot-free `host:port` values use HTTP. Other dotted
values use HTTPS.

The document URL and content bounds come from the same selected element. Bounds
are clipped to the browser window. Accessibility reads are not atomic, but
extraction does not select a second document for bounds. Bounds alone do not
produce browser metadata, and missing metadata does not establish an internal page.

The monitor observes address-bar value changes and window titles to detect
same-title tab switches. An address-bar notification does not establish that the
document URL has changed. Optional reconciliation recovers updates when no later
notification arrives. If neither a URL nor a known internal page is available,
extraction produces no browser metadata.

## Probe Workflow

Use `https://example.com/` as the probe page. A stable top-level HTTPS page
avoids redirects and embedded application UI.

Run the probe from the repository root:

```bash
cd crates/mado
swift run browser-ax-probe /tmp/mado-browser-ax-probe.md
```

Focus the browser during the three-second delay. The terminal running the probe
needs macOS Accessibility permission.

The generated Markdown records the browser identity, URL fields, top-level web
content, and bounds. Compare those signals with the observations below before
assigning a browser kind. Prefer missing metadata over guessing when a
browser exposes a new structure.

Use an existing `BrowserKind` when its extraction rules match. For a distinct
structure, add a helper returning `BrowserPage` and route it in `BrowserInfo.extract`.
Check `BrowserInfo.findAddressBar` too, so observation reaches the browser's URL field.

## Browser Observations

| Browser        | Bundle ID                    | Kind       | Browser chrome URL field | Web content `AXURL` |
| -------------- | ---------------------------- | ---------- | ------------------------ | ------------------- |
| Brave          | `com.brave.Browser`          | `chromium` | Found                    | Found               |
| Google Chrome  | `com.google.Chrome`          | `chromium` | Found                    | Found               |
| Microsoft Edge | `com.microsoft.edgemac`      | `chromium` | Found                    | Found               |
| Opera          | `com.operasoftware.Opera`    | `chromium` | Found                    | Not observed        |
| Arc            | `company.thebrowser.Browser` | `chromium` | Found                    | Found               |
| ego lite       | `com.citrolabs.ego.lite`      | `ego`      | Found                    | Found               |
| Vivaldi        | `com.vivaldi.Vivaldi`        | `vivaldi`  | Found                    | Found               |
| Safari         | `com.apple.Safari`           | `safari`   | Found                    | Found               |
| Firefox        | `org.mozilla.firefox`        | `gecko`    | Found (`AXComboBox`)     | Found               |
| Zen            | `app.zen-browser.zen`        | `gecko`    | Not observed             | Found               |

## Browser Observations

### Brave

- Bundle ID: `com.brave.Browser`
- Browser kind: `chromium`
- Browser version: 1.91.171, Chromium 149.0.7827.103 (arm64)
- Observed: 2026-06-23 on macOS 26.5.1 (25F80)

Browser chrome URL field: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXToolbar
> AXGroup
> AXTextField desc="Address and search bar" placeholder="Search Google or type a URL"
```

Web content `AXURL`: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXWebArea
```

### Google Chrome

- Bundle ID: `com.google.Chrome`
- Browser kind: `chromium`
- Browser version: 151.0.7922.108 (7922.108)
- Observed: 2026-08-08 on macOS 26.5.2 (25F84)

Browser chrome URL field: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXToolbar
> AXGroup
> AXTextField desc="Address and search bar" placeholder="Search Google or type a URL"
```

Web content `AXURL`: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXWebArea
```

### Microsoft Edge

- Bundle ID: `com.microsoft.edgemac`
- Browser kind: `chromium`
- Browser version: 149.0.4022.80 (arm64)
- Observed: 2026-06-23 on macOS 26.5.1 (25F80)

Browser chrome URL field: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXToolbar desc="App bar"
> AXGroup
> AXTextField desc="Address and search bar" placeholder="Search or enter web address"
```

Web content `AXURL`: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXWebArea
```

### Opera

- Bundle ID: `com.operasoftware.Opera`
- Browser kind: `chromium`
- Browser version: 132.0.5905.73 (arm64)
- Observed: 2026-06-23 on macOS 26.5.1 (25F80)

Browser chrome URL field: Found. Opera exposed a parent address-bar text field
and a nested field containing the URL.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup desc="Browser client"
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup desc="Browser contents"
> AXToolbar desc="Navigation"
> AXGroup
> AXTextField desc="Address bar"
> AXGroup
> AXTextField desc="Address field" placeholder="Enter search or web address"
```

Web content `AXURL`: Not observed.

### Arc

- Bundle ID: `company.thebrowser.Browser`
- Browser kind: `chromium`
- Browser version: 1.152.0 (82313), Chromium 149.0.7827.156
- Observed: 2026-06-23 on macOS 26.5.1 (25F80)

Browser chrome URL field: Found.

```text
AXWindow
> AXTextField placeholder="Search or Enter URL..."
```

Web content `AXURL`: Found.

```text
AXWindow
> AXSplitGroup
> AXWebArea
```

### ego lite

- Bundle ID: `com.citrolabs.ego.lite`
- Browser kind: `ego`
- Browser version: 0.6.0.20 (6.0.20)
- Observed: 2026-10-24 on macOS 27.0.1 (26A434)

Browser chrome URL field: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXToolbar
> AXGroup
> AXTextField desc="Address and search bar" placeholder="Search Google or type a URL"
```

Web content `AXURL`: Found.

```text
AXWindow
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXGroup
> AXScrollArea
> AXWebArea
```

Inactive Spaces remain in the accessibility tree and can report the same bounds
and focus state as the visible page. Tree order, bounds, and focus flags do not
reliably identify the active Space.

Extraction hit-tests the window center and follows parent elements to the
outermost web document inside that window. The document supplies both URL and
content bounds. Embedded iframe URLs are ignored, and missing hits or document
URLs produce no browser metadata.

Switching between Spaces selected the visible document. Editing the address
without navigating preserved the loaded document URL. The Space overview produced
no browser metadata.

### Vivaldi

- Bundle ID: `com.vivaldi.Vivaldi`
- Browser kind: `vivaldi`
- Browser version: 8.2.4133.52
- Observed: 2026-09-12 on macOS 26.6.2

Vivaldi renders its browser interface in an `AXWebArea` with the URL
`chrome-extension://mpognobbkildjkofajifpdfhcoklimli/window.html`. The address bar
is an `AXTextField` with `AXDOMIdentifier="urlFieldInput"` inside that interface.

The actual page is a nested `AXWebArea` under `webpage-stack`. Extraction follows
the `webpageview` container with the `active` DOM class, including through the
intermediate containers used by tiled tabs. It skips `panels-container` because web
panels expose independent page URLs and bounds. Content bounds exclude web panels
and browser controls.

In tiled views, only the selected tile's URL and bounds are reported. Other visible
tiles are not tracked independently.

Native internal content uses the `internal-page` DOM class within the active page.
After a complete traversal finds no web document, mado reports it as `about:blank`.
An unreadable document or incomplete traversal cannot confirm an internal page.

### Safari

- Bundle ID: `com.apple.Safari`
- Browser kind: `safari`
- Browser version: 26.5.2 (21624.2.5.11.8)
- Observed: 2026-08-08 on macOS 26.5.2 (25F84)

Browser chrome URL field: Found.

```text
AXWindow
> AXToolbar
> AXGroup
> AXTextField desc="smart search field"
```

Web content `AXURL`: Found.

```text
AXWindow
> AXSplitGroup
> AXTabGroup
> AXGroup
> AXGroup
> AXScrollArea
> AXWebArea
```

The normal and private Start Page expose an `AXList` with
`AXIdentifier="StartPageCollectionView"` and no web document (observed on macOS
26.6.2). The collection can coexist with web content during navigation, so its
presence alone does not establish that the Start Page is active. Window titles
can also lag behind the loaded page and are not used for this decision.

### Firefox

- Bundle ID: `org.mozilla.firefox`
- Browser kind: `gecko`
- Browser version: 155.0.1
- Observed: 2026-09-11 on macOS 26.6.2 (25G83)

Browser chrome URL field: `AXComboBox` with the description "Search with Google or enter address".
Same-title switches between `example.com` and `example.org` produced window updates.
Editing the address without navigating preserved the loaded document URL.

Web content `AXURL`: Found.

```text
AXWindow
> AXGroup
> AXGroup id="tabbrowser-tabpanels"
> AXGroup id="panel-3-1"
> AXScrollArea
> AXWebArea
```

### Zen

- Bundle ID: `app.zen-browser.zen`
- Browser kind: `gecko`
- Browser version: 1.21.12b (126.8.7)
- Observed: 2026-08-08 on macOS 26.5.2 (25F84)

Browser chrome URL field: Not observed.

Web content `AXURL`: Found.

```text
AXWindow
> AXGroup
> AXGroup id="tabbrowser-tabpanels"
> AXGroup id="panel-3-4"
> AXScrollArea
> AXWebArea
```
