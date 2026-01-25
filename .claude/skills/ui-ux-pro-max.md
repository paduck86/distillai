---
name: ui-ux-pro-max
description: "UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks. Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, check UI/UX code."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications. Contains 50+ styles, 97 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types.

## When to Apply

Reference these guidelines when:
- Designing new UI components or pages
- Choosing color palettes and typography
- Reviewing code for UX issues
- Building landing pages or dashboards
- Implementing accessibility requirements

## Rule Categories by Priority

| Priority | Category | Impact | Domain |
|----------|----------|--------|--------|
| 1 | Accessibility | CRITICAL | `ux` |
| 2 | Touch & Interaction | CRITICAL | `ux` |
| 3 | Performance | HIGH | `ux` |
| 4 | Layout & Responsive | HIGH | `ux` |
| 5 | Typography & Color | MEDIUM | `typography`, `color` |
| 6 | Animation | MEDIUM | `ux` |
| 7 | Style Selection | MEDIUM | `style`, `product` |
| 8 | Charts & Data | LOW | `chart` |

## Quick Reference

### 1. Accessibility (CRITICAL)

- `color-contrast` - Minimum 4.5:1 ratio for normal text
- `focus-states` - Visible focus rings on interactive elements
- `alt-text` - Descriptive alt text for meaningful images
- `aria-labels` - aria-label for icon-only buttons
- `keyboard-nav` - Tab order matches visual order
- `form-labels` - Use label with for attribute

### 2. Touch & Interaction (CRITICAL)

- `touch-target-size` - Minimum 44x44px touch targets
- `hover-vs-tap` - Use click/tap for primary interactions
- `loading-buttons` - Disable button during async operations
- `error-feedback` - Clear error messages near problem
- `cursor-pointer` - Add cursor-pointer to clickable elements

### 3. Performance (HIGH)

- `image-optimization` - Use WebP, srcset, lazy loading
- `reduced-motion` - Check prefers-reduced-motion
- `content-jumping` - Reserve space for async content

### 4. Layout & Responsive (HIGH)

- `viewport-meta` - width=device-width initial-scale=1
- `readable-font-size` - Minimum 16px body text on mobile
- `horizontal-scroll` - Ensure content fits viewport width
- `z-index-management` - Define z-index scale (10, 20, 30, 50)

### 5. Typography & Color (MEDIUM)

- `line-height` - Use 1.5-1.75 for body text
- `line-length` - Limit to 65-75 characters per line
- `font-pairing` - Match heading/body font personalities

### 6. Animation (MEDIUM)

- `duration-timing` - Use 150-300ms for micro-interactions
- `transform-performance` - Use transform/opacity, not width/height
- `loading-states` - Skeleton screens or spinners

### 7. Style Selection (MEDIUM)

- `style-match` - Match style to product type
- `consistency` - Use same style across all pages
- `no-emoji-icons` - Use SVG icons, not emojis

---

## Verba Design System

### Theme: "Clean & Focus"

Based on the project requirements, Verba should use:

**Style**: Soft Dark Mode (장시간 학습 고려)
**Pattern**: Dashboard with Split View (Notion-like)

### Color Palette

```css
:root {
  /* Primary - Deep Indigo (신뢰감) */
  --color-primary: #4F46E5;
  --color-primary-light: #6366F1;
  --color-primary-dark: #4338CA;

  /* Accent - Vibrant Mint (요약/강조) */
  --color-accent: #10B981;
  --color-accent-light: #34D399;
  --color-accent-dark: #059669;

  /* Surface - Dark Mode */
  --color-surface: #18181B;
  --color-surface-elevated: #27272A;
  --color-surface-overlay: #3F3F46;

  /* Text */
  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  --color-text-muted: #71717A;

  /* Borders */
  --color-border: #3F3F46;
  --color-border-light: #52525B;

  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}
```

### Typography

**Font Pairing:**
- Display/Headings: `'Outfit', sans-serif` (Clean, modern)
- Body: `'Inter', sans-serif` (Excellent readability)
- Mono (code/timestamps): `'JetBrains Mono', monospace`

```css
:root {
  --font-display: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}
```

### Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│ Header (Fixed)                                                  │
├──────────┬─────────────────────────────────┬───────────────────┤
│          │                                  │                   │
│ Sidebar  │        Main Content              │  AI Assistant     │
│          │                                  │  (Collapsible)    │
│ - Folders│  ┌──────────────────────────┐   │                   │
│ - Recent │  │ Audio Player (Waveform)  │   │  ┌─────────────┐  │
│ - Search │  └──────────────────────────┘   │  │ Chat        │  │
│          │                                  │  │ Interface   │  │
│          │  ┌──────────────────────────┐   │  │             │  │
│          │  │                          │   │  │             │  │
│          │  │  Summary / Notes         │   │  │             │  │
│          │  │  (Notion-like Editor)    │   │  │             │  │
│          │  │                          │   │  │             │  │
│          │  │                          │   │  │             │  │
│          │  └──────────────────────────┘   │  └─────────────┘  │
│          │                                  │                   │
└──────────┴─────────────────────────────────┴───────────────────┘
```

### Component Patterns

**Cards**
```css
.card {
  @apply bg-zinc-800/50 border border-zinc-700 rounded-xl p-4;
  @apply hover:bg-zinc-800/70 transition-colors duration-200;
  @apply cursor-pointer;
}
```

**Buttons**
```css
.btn-primary {
  @apply bg-indigo-600 hover:bg-indigo-700 text-white;
  @apply px-4 py-2 rounded-lg font-medium;
  @apply transition-colors duration-150;
  @apply focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply bg-zinc-700 hover:bg-zinc-600 text-zinc-100;
  @apply px-4 py-2 rounded-lg font-medium;
  @apply transition-colors duration-150;
}

.btn-accent {
  @apply bg-emerald-600 hover:bg-emerald-700 text-white;
  @apply px-4 py-2 rounded-lg font-medium;
  @apply transition-colors duration-150;
}
```

**Input Fields**
```css
.input {
  @apply bg-zinc-800 border border-zinc-700 rounded-lg;
  @apply px-3 py-2 text-zinc-100 placeholder-zinc-500;
  @apply focus:outline-none focus:ring-2 focus:ring-indigo-500;
  @apply transition-colors duration-150;
}
```

---

## Common Rules for Professional UI

### Icons & Visual Elements

| Rule | Do | Don't |
|------|----|----- |
| **No emoji icons** | Use SVG icons (Heroicons, Lucide) | Use emojis as UI icons |
| **Stable hover states** | Use color/opacity transitions | Use scale transforms that shift layout |
| **Consistent icon sizing** | Use fixed viewBox (24x24) with w-6 h-6 | Mix different icon sizes |

### Interaction & Cursor

| Rule | Do | Don't |
|------|----|----- |
| **Cursor pointer** | Add `cursor-pointer` to clickable elements | Leave default cursor |
| **Hover feedback** | Provide visual feedback | No indication element is interactive |
| **Smooth transitions** | Use `transition-colors duration-200` | Instant state changes |

### Dark Mode Specific

| Rule | Do | Don't |
|------|----|----- |
| **Text contrast** | Use `text-zinc-100` for primary | Use `text-zinc-400` for body |
| **Muted text** | Use `text-zinc-400` minimum | Use zinc-600 or darker |
| **Border visibility** | Use `border-zinc-700` | Use invisible borders |

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Hover states don't cause layout shift

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Dark Mode
- [ ] Text has sufficient contrast
- [ ] Borders visible
- [ ] Glass/transparent elements work properly

### Layout
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
