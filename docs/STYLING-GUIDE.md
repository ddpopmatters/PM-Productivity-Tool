# Population Matters - Styling Guide

> Complete design system and styling standards for all Population Matters projects
> Extracted from PM Productivity Tool production codebase

---

## Table of Contents

1. [Color System](#1-color-system)
2. [Typography](#2-typography)
3. [Spacing](#3-spacing)
4. [Components](#4-components)
5. [Layout](#5-layout)
6. [Visual Effects](#6-visual-effects)
7. [Icons](#7-icons)
8. [Branding](#8-branding)
9. [Accessibility](#9-accessibility)
10. [Code Examples](#10-code-examples)

---

## 1. Color System

### Primary Brand Colors (Ocean)

Our primary brand color is **Ocean Blue** - representing depth, trust, and sustainability.

```javascript
ocean: {
  50: '#e6f3f8',   // Very light backgrounds, hover states
  100: '#cce7f1',  // Light backgrounds, borders
  200: '#99cfe3',  // Subtle borders and dividers
  300: '#66b7d5',  // Accents and highlights
  400: '#339fc7',  // Interactive elements
  500: '#0087b9',  // PRIMARY - buttons, links, active states
  600: '#006c94',  // Button hover states
  700: '#00516f',  // Dark text on light backgrounds
  800: '#00364a',  // Very dark text
  900: '#11607d',  // Headings, primary dark text
}
```

**Usage:**
- `ocean-500`: Primary buttons, navigation active states, primary links
- `ocean-600`: Button hover states
- `ocean-50/100`: Background highlights, subtle hover states
- `ocean-900`: Headings and important text

### Secondary Brand Colors (Aqua/Teal)

Complementary color for accents and highlights.

```javascript
aqua: {
  50: '#e6faf9',   // Very light backgrounds
  100: '#ccf5f3',  // Light backgrounds, success states
  200: '#99ebe7',  // Borders
  500: '#00cdc3',  // Accent color, success indicators
  600: '#00a49c',  // Hover states
}
```

### Neutral Colors (Graystone)

For text, borders, and backgrounds throughout the interface.

```javascript
graystone: {
  50: '#f8f9fa',   // Page backgrounds
  100: '#f1f3f5',  // Card backgrounds
  200: '#e9ecef',  // Borders, dividers
  300: '#dee2e6',  // Input borders
  400: '#ced4da',  // Disabled states
  500: '#adb5bd',  // Placeholder text
  600: '#868e96',  // Secondary text, labels
  700: '#495057',  // Body text
  800: '#343a40',  // Dark text, headings
  900: '#212529',  // Darkest text
}
```

### Semantic Colors

**Success (Green)**
```javascript
green-100: '#dcfce7'  // Backgrounds
green-600: '#16a34a'  // Borders, icons
green-700: '#15803d'  // Text
```

**Warning (Amber)**
```javascript
amber-100: '#fef3c7'  // Backgrounds
amber-500: '#f59e0b'  // Primary warning
amber-700: '#b45309'  // Text
```

**Error/Danger (Red)**
```javascript
red-50: '#fef2f2'     // Very light backgrounds
red-100: '#fee2e2'    // Backgrounds
red-500: '#ef4444'    // Danger buttons
red-600: '#dc2626'    // Error text, borders
red-700: '#b91c1c'    // Button hover
```

### Special Colors

- **Cyan Glow**: `#0CFFFF` - Icon hover glow effects
- **Focus State**: `#0077b6` - Focus rings, keyboard navigation
- **Body Background**: `#cfebf8` - Main page background (light mode)
- **Scrollbar**: `#4ac9da` - Custom scrollbar thumb
- **Scrollbar Hover**: `#1fb1c7`

### Dark Mode Colors

```javascript
// Dark mode backgrounds
body: '#0f172a'
card: '#1e293b'
elevated: '#334155'

// Dark mode borders
border: '#475569'
divider: '#64748b'

// Dark mode text
primary: '#e2e8f0'
secondary: '#94a3b8'
muted: '#64748b'
```

---

## 2. Typography

### Font Families

**Headings** - Bold, impactful, uppercase
```css
font-family: "Impact", "Anton", "Arial Black", "Neue Plak Condensed",
             "Neue Plak", "Helvetica Neue", Arial, sans-serif;
font-weight: 900;
text-transform: uppercase;
letter-spacing: -0.02em;
```

**Body Text** - Clean, modern, readable
```css
font-family: "Neue Haas Grotesk Display Pro", "Helvetica Neue",
             Arial, sans-serif;
letter-spacing: -0.01em;
```

**Dropdowns** - Softer, normal case
```css
font-family: "Neue Haas Grotesk Display Pro", "Helvetica Neue",
             Arial, sans-serif;
font-weight: 400;
letter-spacing: 0.01em;
text-transform: none;
```

### Font Size Scale

| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 12px | Labels, captions, helper text |
| `text-sm` | 14px | Body text, buttons, form inputs |
| `text-base` | 16px | Standard body text |
| `text-lg` | 18px | Section headers, emphasized text |
| `text-xl` | 20px | Modal titles, card headers |
| `text-2xl` | 24px | Page titles, section headings |
| `text-3xl` | 30px | Hero headings, major sections |

### Font Weights

| Class | Weight | Use Case |
|-------|--------|----------|
| `font-normal` | 400 | Body text, paragraphs |
| `font-medium` | 500 | Emphasized text, labels |
| `font-semibold` | 600 | Buttons, important labels |
| `font-bold` | 700 | Section headers, strong emphasis |
| `font-black` | 900 | Headings (with Impact font) |

### Typography Utilities

```javascript
// Line heights
leading-tight: 1.25      // Headings
leading-normal: 1.5      // Body text
leading-relaxed: 1.625   // Descriptions, helper text

// Letter spacing
tracking-tight: -0.025em    // Large headings
tracking-normal: 0em        // Body text
tracking-wide: 0.025em      // Buttons, labels
tracking-wider: 0.05em      // Section headers, uppercase labels
```

---

## 3. Spacing

### Spacing Scale

| Class | Value | Common Use |
|-------|-------|------------|
| `p-0` | 0px | Reset padding |
| `p-1` | 4px | Minimal spacing |
| `p-2` | 8px | Tight spacing, button groups |
| `p-3` | 12px | Form fields, compact cards |
| `p-4` | 16px | **Standard card padding** |
| `p-6` | 24px | **Large card padding, modals** |
| `p-8` | 32px | Section spacing |
| `p-12` | 48px | Large section spacing |

### Common Spacing Patterns

```javascript
// Card padding
px-6 py-4         // Standard card content
p-6               // Modal content, large cards
p-4               // Compact cards
p-3               // Very compact cards

// Button padding
px-4 py-1.5       // Small buttons
px-6 py-2         // Standard buttons
px-7 py-3         // Large buttons

// Section spacing
space-y-4         // Form sections
space-y-6         // Content sections
space-y-8         // Major page sections
mb-4, mb-6        // Section bottom margins

// Grid/flex gaps
gap-1: 4px        // Tight spacing (badges)
gap-2: 8px        // Standard button groups
gap-3: 12px       // Form fields
gap-4: 16px       // Card grids
```

---

## 4. Components

### 4.1 Buttons

#### Primary Button
```jsx
<button className="border border-black bg-black text-white
                 shadow-[0_0_30px_rgba(15,157,222,0.35)]
                 hover:-translate-y-0.5 hover:bg-white hover:text-black
                 heading-font inline-flex items-center justify-center gap-2
                 rounded-full font-semibold transition-all px-6 py-2 text-sm">
  Primary Action
</button>
```

#### Secondary Button
```jsx
<button className="border border-black bg-white text-black
                 hover:-translate-y-0.5 hover:bg-black hover:text-white
                 heading-font inline-flex items-center justify-center gap-2
                 rounded-full font-semibold transition-all px-6 py-2 text-sm">
  Secondary Action
</button>
```

#### Danger Button
```jsx
<button className="border border-rose-500 bg-rose-600 text-white
                 shadow-[0_0_25px_rgba(244,63,94,0.35)]
                 hover:-translate-y-0.5 hover:bg-rose-700
                 inline-flex items-center justify-center gap-2
                 rounded-full font-semibold transition-all px-6 py-2 text-sm">
  Delete
</button>
```

#### Ghost Button
```jsx
<button className="text-black hover:bg-black/10
                 inline-flex items-center justify-center gap-2
                 rounded-full font-semibold transition-all px-6 py-2 text-sm">
  Cancel
</button>
```

#### Button Sizes
```javascript
Small:    "px-4 py-1.5 text-xs"
Medium:   "px-6 py-2 text-sm"      // Default
Large:    "px-7 py-3 text-base"
Icon:     "h-10 w-10"
```

### 4.2 Cards

#### Standard Card
```jsx
<div className="bg-white rounded-xl border border-graystone-200
              shadow-sm p-6">
  {/* Card content */}
</div>
```

#### Interactive Card (with hover)
```jsx
<div className="bg-white rounded-lg border border-graystone-200
              shadow-sm p-3 cursor-pointer transition-all
              hover:shadow-md hover:-translate-y-0.5">
  {/* Card content */}
</div>
```

### 4.3 Badges

```jsx
// Status badge - Default
<span className="bg-aqua-100 text-ocean-700 inline-flex items-center
              rounded-full px-2.5 py-1 text-xs font-medium">
  Status
</span>

// Badge variants
Success:   "bg-green-100 text-green-700"
Warning:   "bg-amber-100 text-amber-700"
Danger:    "bg-red-100 text-red-700"
Info:      "bg-aqua-100 text-aqua-700"
Neutral:   "bg-graystone-100 text-graystone-600"
```

### 4.4 Forms

#### Input Field
```jsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-graystone-700 mb-1">
    Field Label
  </label>
  <input
    type="text"
    className="w-full px-4 py-3 border border-graystone-300 rounded-xl
             focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500
             outline-none transition"
    placeholder="Enter value..."
  />
</div>
```

#### Select Dropdown
```jsx
<select className="px-3 py-2 border border-graystone-300 rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-ocean-500
                 focus:border-transparent appearance-none">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Textarea
```jsx
<textarea
  className="w-full px-3 py-2 border border-graystone-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-ocean-500
           min-h-[100px]"
  placeholder="Enter description..."
/>
```

#### Required Field Indicator
```jsx
<label className="text-sm font-medium text-graystone-700 required-indicator">
  Required Field
</label>

/* CSS */
.required-indicator::after {
  content: ' *';
  color: #dc2626;
}
```

#### Validation States
```jsx
// Error state
<input className="border-red-600 focus:ring-red-500" />
<p className="text-xs text-red-600 mt-1">Error message</p>

// Success state
<input className="border-green-600 focus:ring-green-500" />
<p className="text-xs text-green-600 mt-1">Success message</p>
```

### 4.5 Modals

```jsx
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50
              flex items-center justify-center">
  <div className="relative bg-white rounded-2xl shadow-2xl w-full
                max-w-lg mx-4 overflow-hidden">
    {/* Modal header */}
    <div className="flex items-center justify-between p-6 border-b
                  border-graystone-200">
      <h2 className="text-xl font-bold text-ocean-900">Modal Title</h2>
      <button className="p-2 hover:bg-graystone-100 rounded-lg transition">
        <Icon name="x" className="w-5 h-5 text-graystone-500" />
      </button>
    </div>

    {/* Modal content */}
    <div className="p-6">
      {/* Content here */}
    </div>

    {/* Modal footer (optional) */}
    <div className="flex justify-end gap-2 p-6 border-t border-graystone-200">
      <button className="btn-ghost">Cancel</button>
      <button className="btn-primary">Save</button>
    </div>
  </div>
</div>
```

### 4.6 Tables

```jsx
<div className="bg-white rounded-xl border border-graystone-200
              shadow-sm overflow-hidden">
  <table className="min-w-full divide-y divide-graystone-200">
    <thead className="bg-graystone-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-bold
                     text-ocean-900 uppercase tracking-wider">
          Column Header
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-graystone-200">
      <tr className="hover:bg-ocean-50 cursor-pointer transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          Cell content
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### 4.7 Navigation (Sidebar)

```jsx
{/* Navigation item - active */}
<button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                 bg-ocean-500 text-white shadow-lg">
  <Icon name="home" className="w-5 h-5" />
  <span className="font-medium">Dashboard</span>
</button>

{/* Navigation item - inactive */}
<button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl
                 text-ocean-900 hover:bg-ocean-50 transition-colors">
  <Icon name="folder" className="w-5 h-5" />
  <span className="font-medium">Projects</span>
</button>

{/* Section header */}
<div className="px-4 mb-2 text-[10px] font-bold text-graystone-400
              tracking-wider uppercase">
  Section Name
</div>
```

### 4.8 Loading States

```jsx
{/* Loading spinner */}
<div className="flex items-center justify-center gap-3">
  <div className="w-8 h-8 border-4 border-ocean-200 border-t-ocean-600
                rounded-full animate-spin" />
  <span className="text-sm text-graystone-600">Loading...</span>
</div>
```

### 4.9 Empty States

```jsx
<div className="bg-white rounded-xl border border-graystone-200
              shadow-sm p-12 text-center">
  <Icon name="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
  <div className="text-sm text-graystone-500 mb-3">
    No items found
  </div>
  <p className="text-xs text-graystone-400">
    Create your first item to get started
  </p>
</div>
```

### 4.10 Status Pills/Tags

```jsx
{/* Priority High */}
<span className="text-xs px-1.5 py-0.5 rounded border
              bg-red-100 text-red-700 border-red-200">
  High
</span>

{/* Priority Medium */}
<span className="text-xs px-1.5 py-0.5 rounded border
              bg-amber-100 text-amber-700 border-amber-200">
  Medium
</span>

{/* Priority Low */}
<span className="text-xs px-1.5 py-0.5 rounded border
              bg-green-100 text-green-700 border-green-200">
  Low
</span>
```

---

## 5. Layout

### Container Widths

| Class | Width | Use Case |
|-------|-------|----------|
| `max-w-md` | 448px | Small modals |
| `max-w-lg` | 512px | Standard modals |
| `max-w-xl` | 576px | Medium modals |
| `max-w-2xl` | 672px | Large modals |
| `max-w-4xl` | 896px | Wide containers |
| `max-w-full` | 100% | Full width |

### Responsive Breakpoints

```javascript
sm:  640px    // Mobile landscape
md:  768px    // Tablet
lg:  1024px   // Desktop
xl:  1280px   // Large desktop
2xl: 1536px   // Extra large
```

### Grid Systems

```jsx
{/* Two-column grid */}
<div className="grid grid-cols-2 gap-4">
  {/* Grid items */}
</div>

{/* Three-column grid */}
<div className="grid grid-cols-3 gap-4">
  {/* Grid items */}
</div>

{/* Responsive grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Grid items */}
</div>
```

### Common Flexbox Patterns

```jsx
{/* Horizontal layout with gap */}
<div className="flex items-center gap-2">
  {/* Items */}
</div>

{/* Space between */}
<div className="flex items-center justify-between">
  {/* Items */}
</div>

{/* Vertical stack */}
<div className="flex flex-col space-y-4">
  {/* Items */}
</div>

{/* Center */}
<div className="flex items-center justify-center">
  {/* Items */}
</div>
```

---

## 6. Visual Effects

### Border Radius

| Class | Radius | Use Case |
|-------|--------|----------|
| `rounded-lg` | 8px | Inputs, buttons |
| `rounded-xl` | 12px | Cards, modals |
| `rounded-2xl` | 16px | Large cards |
| `rounded-full` | 9999px | Pills, avatars, rounded buttons |

### Box Shadows

```javascript
// Standard shadows
shadow-sm:  0 1px 2px rgba(0,0,0,0.05)           // Subtle
shadow:     0 1px 3px rgba(0,0,0,0.1)            // Default cards
shadow-md:  0 4px 6px rgba(0,0,0,0.1)            // Elevated cards
shadow-lg:  0 10px 15px rgba(0,0,0,0.1)          // Modals
shadow-2xl: 0 25px 50px rgba(0,0,0,0.25)         // Prominent modals

// Custom glow shadows
shadow-[0_0_30px_rgba(15,157,222,0.35)]  // Ocean blue glow (primary buttons)
shadow-[0_0_25px_rgba(244,63,94,0.35)]   // Red glow (danger buttons)
```

### Transitions

```javascript
// Standard transitions
transition-all duration-300        // Smooth all properties
transition-colors duration-200     // Fast color changes
transition-transform duration-300  // Transform animations

// Transform effects
hover:-translate-y-0.5   // Lift up on hover
hover:scale-105          // Grow on hover
```

### Focus States

```jsx
// Standard focus ring
focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500

// Enhanced focus (accessibility)
focus-visible:ring-4 focus-visible:ring-[#0F9DDE]/40
focus-visible:ring-offset-2 focus-visible:ring-offset-[#CFEBF8]
```

---

## 7. Icons

### Icon Library
**Lucide Icons** (v0.294.0)
- CDN: `https://unpkg.com/lucide@0.294.0`
- Icons inherit text color via `currentColor`

### Icon Sizes

| Class | Size | Use Case |
|-------|------|----------|
| `w-3 h-3` | 12px | Inline text icons |
| `w-4 h-4` | 16px | Small buttons, labels |
| `w-5 h-5` | 20px | Standard buttons, navigation |
| `w-6 h-6` | 24px | Large icons, headers |
| `w-8 h-8` | 32px | Feature icons |
| `w-12 h-12` | 48px | Hero icons |

### Commonly Used Icons

```javascript
// Navigation
'home', 'layout-dashboard', 'folder', 'clipboard-list',
'layers', 'briefcase', 'wrench', 'shield'

// Actions
'plus', 'edit', 'trash-2', 'save', 'x', 'check',
'refresh-cw', 'download', 'upload-cloud'

// UI
'chevron-down', 'chevron-right', 'external-link',
'more-vertical', 'search', 'filter', 'calendar'

// Status
'alert-triangle', 'info', 'check-circle', 'x-circle'

// User
'user', 'users', 'log-out', 'settings'
```

### Icon Usage

```jsx
<Icon name="home" className="w-5 h-5 text-ocean-600" />
```

---

## 8. Branding

### Organization Identity

- **Organization Name**: Population Matters
- **Brand Voice**: Professional, impactful, action-oriented
- **Visual Style**: Clean, modern, sustainable

### Brand Voice in UI

- **Headings**: UPPERCASE, BOLD, IMPACTFUL
- **Body Text**: Clear, professional, readable
- **Buttons**: Action-oriented, concise verbs
- **Helper Text**: Friendly, informative, lowercase

### Logo Usage

```jsx
{/* Custom logo */}
<img src={LOGO_URL} alt="Population Matters" className="h-10" />

{/* Fallback gradient icon */}
<div className="w-10 h-10 bg-gradient-to-br from-ocean-500 to-ocean-600
              rounded-xl flex items-center justify-center shadow-lg">
  <Icon name="zap" className="w-6 h-6 text-white" />
</div>
```

---

## 9. Accessibility

### Focus Management

```css
/* Visible focus rings */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid #0077b6;
  outline-offset: 2px;
}
```

### Screen Reader Support

```jsx
{/* Screen reader only text */}
<span className="sr-only">Screen reader only text</span>

/* CSS */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Skip Links

```jsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

/* CSS */
.skip-link {
  position: absolute;
  top: -40px;
  background: #0077b6;
  color: white;
  padding: 8px 16px;
  transition: top 0.3s;
}
.skip-link:focus {
  top: 0;
}
```

### ARIA Attributes

```jsx
{/* Required fields */}
<input aria-required="true" />

{/* Loading states */}
<div role="status" aria-live="polite">Loading...</div>

{/* Modals */}
<div role="alertdialog" aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-description">
  <h2 id="modal-title">Title</h2>
  <p id="modal-description">Description</p>
</div>

{/* Navigation */}
<a aria-current={isActive ? 'page' : undefined}>Link</a>
```

---

## 10. Code Examples

### Complete Card Component

```jsx
<div className="bg-white rounded-lg border border-graystone-200
              shadow-sm p-3 cursor-pointer transition-all
              hover:shadow-md hover:-translate-y-0.5">
  {/* Card header */}
  <div className="flex items-center justify-between mb-2">
    <h3 className="font-medium text-sm text-graystone-800 line-clamp-2">
      Card Title
    </h3>
    <button className="p-1 hover:bg-graystone-100 rounded transition">
      <Icon name="more-vertical" className="w-4 h-4 text-graystone-500" />
    </button>
  </div>

  {/* Card content */}
  <p className="text-xs text-graystone-600 mb-3 line-clamp-2">
    Card description goes here...
  </p>

  {/* Card footer */}
  <div className="flex items-center gap-2 flex-wrap">
    <span className="bg-ocean-100 text-ocean-700 text-xs px-2 py-0.5
                   rounded-full">
      Status
    </span>
    <span className="text-xs text-graystone-500">
      Meta info
    </span>
  </div>
</div>
```

### Complete Form Section

```jsx
<div className="space-y-4">
  {/* Section header */}
  <h3 className="text-lg font-bold text-ocean-900 flex items-center
               gap-2 border-b border-ocean-100 pb-2">
    <Icon name="file-text" className="w-5 h-5 text-ocean-500" />
    Section Title
  </h3>

  {/* Form fields */}
  <div className="space-y-2">
    <label className="text-sm font-medium text-graystone-700
                    required-indicator">
      Field Label
    </label>
    <input
      type="text"
      className="w-full px-3 py-2 border border-graystone-300
               rounded-lg focus:outline-none focus:ring-2
               focus:ring-ocean-500 focus:border-transparent"
      placeholder="Enter value..."
    />
    <p className="text-xs text-graystone-500">
      Helper text for this field
    </p>
  </div>

  <div className="space-y-2">
    <label className="text-sm font-medium text-graystone-700">
      Optional Field
    </label>
    <select className="w-full px-3 py-2 border border-graystone-300
                     rounded-lg focus:outline-none focus:ring-2
                     focus:ring-ocean-500 appearance-none">
      <option>Select an option</option>
      <option>Option 1</option>
      <option>Option 2</option>
    </select>
  </div>
</div>
```

### Complete Modal Dialog

```jsx
{/* Modal overlay */}
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50
              flex items-center justify-center p-4">
  {/* Modal container */}
  <div className="relative bg-white rounded-2xl shadow-2xl w-full
                max-w-lg overflow-hidden animate-in fade-in
                duration-200">
    {/* Modal header */}
    <div className="flex items-center justify-between p-6 border-b
                  border-graystone-200">
      <h2 className="text-xl font-bold text-ocean-900">
        Modal Title
      </h2>
      <button
        onClick={onClose}
        className="p-2 hover:bg-graystone-100 rounded-lg
                 transition-colors">
        <Icon name="x" className="w-5 h-5 text-graystone-500" />
      </button>
    </div>

    {/* Modal content */}
    <div className="p-6 space-y-4">
      <p className="text-sm text-graystone-600">
        Modal content goes here...
      </p>

      {/* Form or content */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-graystone-700">
          Input Field
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-graystone-300
                   rounded-lg focus:outline-none focus:ring-2
                   focus:ring-ocean-500"
        />
      </div>
    </div>

    {/* Modal footer */}
    <div className="flex justify-end gap-2 p-6 border-t
                  border-graystone-200 bg-graystone-50">
      <button
        onClick={onClose}
        className="text-black hover:bg-black/10 inline-flex
                 items-center justify-center gap-2 rounded-full
                 font-semibold transition-all px-6 py-2 text-sm">
        Cancel
      </button>
      <button
        onClick={onSave}
        className="border border-black bg-black text-white
                 shadow-[0_0_30px_rgba(15,157,222,0.35)]
                 hover:-translate-y-0.5 hover:bg-white
                 hover:text-black inline-flex items-center
                 justify-center gap-2 rounded-full font-semibold
                 transition-all px-6 py-2 text-sm">
        Save Changes
      </button>
    </div>
  </div>
</div>
```

---

## Quick Reference

### Most Common Patterns

```jsx
// Standard card
className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6"

// Primary button
className="btn-primary"

// Form input
className="w-full px-3 py-2 border border-graystone-300 rounded-lg
         focus:ring-2 focus:ring-ocean-500"

// Section header
className="text-lg font-bold text-ocean-900 border-b border-ocean-100 pb-2"

// Badge
className="bg-ocean-100 text-ocean-700 text-xs px-2 py-0.5 rounded-full"

// Icon in button
<Icon name="plus" className="w-4 h-4" />
```

---

## Implementation Notes

1. **Tailwind CSS** is used for all styling
2. **Lucide Icons** (v0.294.0) for all iconography
3. **Custom fonts**: Impact for headings, Neue Haas Grotesk for body
4. **Color system** is based on Ocean (blue) and Aqua (teal) brand colors
5. **Responsive design** uses standard Tailwind breakpoints
6. **Accessibility** is built-in with proper ARIA, focus states, and keyboard navigation
7. **Dark mode** is supported via `.dark` class on root element

---

*This styling guide is a living document. Update it as new patterns emerge or designs evolve.*
