---
name: Meyer Zero-Friction
colors:
  surface: '#fff8f6'
  surface-dim: '#edd5cb'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#ffeae0'
  surface-container-high: '#fce3d9'
  surface-container-highest: '#f6ded3'
  on-surface: '#251913'
  on-surface-variant: '#584237'
  inverse-surface: '#3c2d26'
  inverse-on-surface: '#ffede6'
  outline: '#8c7164'
  outline-variant: '#e0c0b1'
  surface-tint: '#9d4300'
  primary: '#9d4300'
  on-primary: '#ffffff'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#ffb690'
  secondary: '#9d422b'
  on-secondary: '#ffffff'
  secondary-container: '#fd8c6f'
  on-secondary-container: '#74240f'
  tertiary: '#006398'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a2f4'
  on-tertiary-container: '#003554'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#ffdbd2'
  secondary-fixed-dim: '#ffb4a2'
  on-secondary-fixed: '#3c0800'
  on-secondary-fixed-variant: '#7e2c16'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#fff8f6'
  on-background: '#251913'
  surface-variant: '#f6ded3'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
  max-width: 1200px
---

## Brand & Style
The design system for Peluquería Meyer is built on the philosophy of "Zero Mental Load." It targets a busy, modern clientele seeking a sanctuary of calm and efficiency. The aesthetic is a refined **Light Pastel Minimalism**, prioritizing visual clarity and breathing room to reduce cognitive overhead during the booking and service selection process.

The emotional response is one of warmth, reliability, and effortless organization. By utilizing a "Soft-Focus" approach—high whitespace, low-contrast shadows, and a gentle palette—the UI feels like a high-end wellness space rather than a chaotic marketplace.

## Colors
The palette is rooted in a "Warm Paper" foundation to prevent the sterile feel of pure white.

- **Primary (Orange):** Used exclusively for primary calls to action and critical interactive states. It provides energy without being aggressive.
- **Accent (Terracotta):** Reserved for supporting elements, secondary brand moments, and subtle highlights.
- **Background:** A soft off-white (#FAF9F6) serves as the canvas, reducing eye strain.
- **Surface:** Pure white (#FFFFFF) is used for cards and modals to create a clear layering effect against the background.
- **Neutral:** Dark grey (#2D2D2D) for high-contrast legibility in body text, and soft grey (#6B7280) for meta-information.

## Typography
Inter is used across the entire system for its exceptional legibility and neutral, professional character. 

- **Scale:** High contrast in weight (Semi-Bold for headlines, Regular for body) creates an immediate hierarchy.
- **Spacing:** Tighten letter spacing slightly for large headlines to maintain a modern, editorial feel. 
- **Readability:** Ensure a generous line height (1.6) for body text to facilitate effortless scanning of service descriptions.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a fixed maximum width for desktop environments to maintain readability.

- **Grid:** A 12-column grid on desktop, 4-column on mobile.
- **Rhythm:** An 8px linear scale (4, 8, 16, 24, 40...) governs all padding and margins. 
- **Breathing Room:** Use the `lg` (40px) spacing between major sections to prevent the UI from feeling cluttered. Content should never feel "packed."

## Elevation & Depth
In line with "Zero Mental Load," depth is used sparingly to indicate interactivity rather than decoration.

- **Soft Shadows:** Avoid harsh black shadows. Use a "diffused glow" approach: a subtle vertical offset (4px-8px) with a large blur (16px-24px) and low opacity (5-8%).
- **Tonal Layering:** Objects on the `background` sit on `surface` white cards. Elevate cards slightly on hover to provide tactile feedback.
- **Glassmorphism:** Use a light backdrop blur (8px) on navigation bars to maintain context while the user scrolls.

## Shapes
The shape language is defined by a consistent **16px (1rem)** radius, which communicates friendliness and safety.

- **Containers:** All cards, modals, and input containers must use the `rounded-lg` (16px) standard.
- **Buttons:** Maintain the 16px radius for a "squircle" look that balances structure and softness.
- **Badges:** Small badges for status (e.g., "Available", "Confirmed") use a fully pill-shaped (999px) radius to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Background #F97316, Text #FFFFFF. Bold, 16px rounded.
- **Secondary:** Transparent background, Border 1.5px #F97316, Text #F97316.
- **Interactions:** Subtle scale down (0.98) on click/active state to provide physical feedback.

### Input Fields
- **Styling:** Surface #FFFFFF, Border 1.5px #E5E7EB. 16px corner radius.
- **Focus State:** Border changes to #F97316 with a very faint orange outer glow (ring).
- **Labels:** Always visible above the input, never floating, to reduce cognitive load.

### Badges / States
- **Status Badges:** Use a desaturated pastel version of the status color (e.g., light green for "Success", light orange for "Pending") with darker text of the same hue.
- **Pill Shape:** Fully rounded corners.

### Cards
- **Base Card:** Pure white background, 16px rounded corners, and a `soft shadow`.
- **Selected State:** Apply a 2px border of #F97316 to indicate selection in service lists or calendar slots.

### Lists
- **Service Items:** High vertical padding (20px), separated by a very light 1px divider (#F3F4F6). Include a clear price indicator in Semi-Bold weight on the right-hand side.