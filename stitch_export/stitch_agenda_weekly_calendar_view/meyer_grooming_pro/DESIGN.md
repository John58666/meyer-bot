---
name: Meyer Grooming Pro
colors:
  surface: '#ffffff'
  surface-dim: '#efd5ca'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1eb'
  surface-container: '#ffeae1'
  surface-container-high: '#fee3d8'
  surface-container-highest: '#f8ddd2'
  on-surface: '#261812'
  on-surface-variant: '#5a4136'
  inverse-surface: '#3d2d26'
  inverse-on-surface: '#ffede6'
  outline: '#8e7164'
  outline-variant: '#e2bfb0'
  surface-tint: '#a04100'
  primary: '#a04100'
  on-primary: '#ffffff'
  primary-container: '#ff6b00'
  on-primary-container: '#572000'
  inverse-primary: '#ffb693'
  secondary: '#555f6f'
  on-secondary: '#ffffff'
  secondary-container: '#d6e0f3'
  on-secondary-container: '#596373'
  tertiary: '#0062a1'
  on-tertiary: '#ffffff'
  tertiary-container: '#599de0'
  on-tertiary-container: '#003357'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcc'
  primary-fixed-dim: '#ffb693'
  on-primary-fixed: '#351000'
  on-primary-fixed-variant: '#7a3000'
  secondary-fixed: '#d9e3f6'
  secondary-fixed-dim: '#bdc7da'
  on-secondary-fixed: '#121c2a'
  on-secondary-fixed-variant: '#3d4757'
  tertiary-fixed: '#d0e4ff'
  tertiary-fixed-dim: '#9ccaff'
  on-tertiary-fixed: '#001d35'
  on-tertiary-fixed-variant: '#00497a'
  background: '#faf9f6'
  on-background: '#261812'
  surface-variant: '#f8ddd2'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
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
  unit: 4px
  gutter: 24px
  container-padding: 32px
  section-gap: 48px
  component-padding-x: 16px
  component-padding-y: 12px
---

## Brand & Style
The brand identity centers on "Modern Craftsmanship"—blending the traditional artistry of grooming with high-efficiency business management. The target audience is premium service providers who value precision, organization, and a professional aesthetic.

The visual style is **Corporate / Modern** with a refined, airy atmosphere. It uses a sophisticated warm-neutral base to move away from cold "tech" blues, favoring a palette that feels more human and service-oriented. The UI communicates reliability and clarity through structured layouts, high-quality typography, and purposeful use of whitespace.

## Colors
The color palette is anchored by a vibrant **Sunset Orange** (#ff6b00) used for primary actions and brand emphasis. This is balanced against a "Bone" background (#faf9f6) rather than pure white, providing a softer, more premium reading experience.

Secondary tones are functional greys and blues for administrative depth. Status-specific colors (like the error red and tertiary blue) are used sparingly for exceptions and special event highlights. The "On-Surface" hierarchy uses deep browns (#261812) instead of blacks to maintain the warmth of the brand.

## Typography
The system uses **Inter** exclusively to ensure maximum legibility and a systematic, utilitarian feel. 

- **Display & Headlines:** Use a semi-bold weight (600) with tighter tracking on larger sizes to create a modern, "Swiss" editorial look.
- **Body Text:** Optimized for long-form reading with a generous 1.6 line height for the large body style.
- **Labels:** Small caps with increased letter spacing are used for secondary metadata and eyebrow headers to provide a clear structural hierarchy without adding visual weight.

## Layout & Spacing
The layout follows a **Fixed Sidebar / Fluid Content** model. A 288px (72 units) sidebar remains locked to the left, while the main content area utilizes a 12-column grid.

Spacing follows a strict 4px base unit. Section-level separation uses a 48px gap, while internal card padding is consistently 32px (8 units). This "roomy" spacing approach is critical for the "Modern Craftsmanship" aesthetic, ensuring the interface never feels cluttered despite the data-heavy nature of scheduling.

## Elevation & Depth
Depth is achieved primarily through **Tonal Layers** and **Low-Contrast Outlines** rather than aggressive shadows. 

- **Ground:** Background color (#faf9f6).
- **Surface:** Primary cards and sidebar use pure white (#ffffff) with a 1px border (#e2bfb0) to create separation.
- **Floating:** Modals and dropdowns use an extra-diffused "shadow-xl" to lift them above the backdrop-blurred header (80% opacity with 20px blur).
- **Interaction:** Active states for day rows or cards use a subtle tint of the primary color (5% opacity) and a 4px left-border accent.

## Shapes
The shape language is consistently **Rounded**, conveying an approachable and modern professional feel. 

Standard components (cards, large buttons) use a 0.75rem (xl) radius. Smaller interactive elements like input fields and tags use a 0.5rem (lg) radius. Pill shapes (9999px) are reserved strictly for status indicators, badges, and the toggle switch tracks to differentiate them from actionable buttons.

## Components
- **Buttons:** Primary buttons are high-impact orange with white text and a shadow-md. Secondary buttons use a light-grey surface with a border, prioritizing subtle interaction over visual dominance.
- **Inputs:** Use a 1px border and 0.5rem radius. On focus, they should display a subtle primary-colored ring (20% opacity) to provide clear feedback.
- **Cards:** Defined by a white background, 0.75rem radius, and a 1px border. Grouped content inside cards should be separated by dividers with 60% opacity.
- **Toggles:** Use the "Material" style—a pill-shaped track with a sliding white thumb. The track changes from a neutral variant to the primary brand color when active.
- **Navigation:** Vertical sidebar navigation uses 1.25rem vertical padding for high touchability, with active states indicated by a solid primary background and white text.
- **Exceptions/Chips:** Use a light background tint matching the category (red for closed, blue for special hours) to categorize content types at a glance.