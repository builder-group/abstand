# Interactive States On Translucent Surfaces

How to choose hover, active, and selected background treatments for controls that sit on glassy or semi-transparent UI.

## Rule

**Use opacity-based state fills when the component does not fully own an opaque background.**

```
hover:    bg-base-950/6
active:   bg-base-950/10
selected: bg-base-950/10
```

This is the default for ghost buttons, outline buttons, sidebar rows, transparent list items, toolbar items, and similar controls that sit on top of another visible surface.

**Use fixed tokens only when the component already owns a solid background fill.** The default `Button` variant (`bg-base-100 hover:bg-base-200`) is the current example.

## Why

This convention exists because the app uses translucent UI, especially on macOS.

A common case is the sidebar: Liquid Glass window material underneath, plus a `bg-base-50/90` style surface on top. Interactive rows in that sidebar do not sit on a flat opaque page. They sit on a layered surface where the background is still visually present.

In that context, the interactive state should read like a tint on the same material. If the hover or selected state suddenly becomes an opaque token such as `bg-base-100`, the control can look like a separate slab placed on top of the sidebar instead of a state change within the sidebar.

Opacity-based fills preserve material continuity. They adapt to what is behind the control, stay visually consistent across glassy and semi-transparent surfaces, and keep ghost-style controls feeling like part of the layer they live in.

In short: if the base surface is translucent, the interactive state should usually be translucent too.

## Decision Guide

Use opacity-based states when:

- the control is ghost-style or visually lightweight
- the parent surface is transparent or semi-transparent
- the layer underneath should remain perceptible during hover, active, or selected states
- the same component may appear on different backgrounds

Use fixed tokens when:

- the control already owns a solid fill
- the hover state is meant to transition between two explicit solid surfaces
- the component should visually separate itself from the background instead of blending with it

## Examples

```tsx
// Sidebar row on top of a glassy, semi-transparent surface
<button className="hover:bg-base-950/6 active:bg-base-950/10">...</button>

// Selected ghost-style item on a translucent parent
<div className={cn(isSelected && 'bg-base-950/10')}>...</div>

// Filled button owns its surface, so fixed tokens are fine
<button className="bg-base-100 hover:bg-base-200">...</button>
```
