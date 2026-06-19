---
name: EcoTrack
colors:
  surface: '#f8faf8'
  surface-dim: '#d8dad9'
  surface-bright: '#f8faf8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f2'
  surface-container: '#eceeec'
  surface-container-high: '#e6e9e7'
  surface-container-highest: '#e1e3e1'
  on-surface: '#191c1b'
  on-surface-variant: '#42493e'
  inverse-surface: '#2e3130'
  inverse-on-surface: '#eff1ef'
  outline: '#72796e'
  outline-variant: '#c2c9bb'
  surface-tint: '#3b6934'
  primary: '#154212'
  on-primary: '#ffffff'
  primary-container: '#2d5a27'
  on-primary-container: '#9dd090'
  inverse-primary: '#a1d494'
  secondary: '#486800'
  on-secondary: '#ffffff'
  secondary-container: '#c3ee73'
  on-secondary-container: '#4c6c00'
  tertiary: '#123c5a'
  on-tertiary: '#ffffff'
  tertiary-container: '#2d5372'
  on-tertiary-container: '#a1c6ea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bcf0ae'
  primary-fixed-dim: '#a1d494'
  on-primary-fixed: '#002201'
  on-primary-fixed-variant: '#23501e'
  secondary-fixed: '#c6f176'
  secondary-fixed-dim: '#aad45d'
  on-secondary-fixed: '#131f00'
  on-secondary-fixed-variant: '#364e00'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#a5caef'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#234a68'
  background: '#f8faf8'
  on-background: '#191c1b'
  surface-variant: '#e1e3e1'
typography:
  display-lg:
    fontFamily: Literata
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Literata
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md-mobile:
    fontFamily: Literata
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is centered on the concept of "Digital Organicism." It bridges the gap between high-end technology and the natural world, targeting eco-conscious users who value both precision and environmental stewardship. The emotional response is one of calm, clarity, and optimistic growth.

The style is a refined fusion of **Modern Minimalism** and **Glassmorphism**. It utilizes soft, translucent layers to mimic the dappled light of a forest canopy, paired with Apple-level polish through meticulous attention to whitespace and micro-interactions. The interface feels light, airy, and premium, avoiding the clinical coldness of traditional SaaS in favor of a warm, inviting, and "breathable" aesthetic.

## Colors
The palette is rooted in the "Forest to Sky" spectrum. 
- **Primary (Forest Green):** Used for core branding, primary actions, and deep structural elements.
- **Secondary (Fresh Leaf):** Used for success states, progress indicators, and vibrant accents that denote growth.
- **Tertiary (Sky Blue):** Used for informational callouts, links, and background washes to provide visual "air."
- **Background (Soft Off-White):** The canvas is `#F8FAF8`, often paired with subtle linear gradients (e.g., Sky Blue at 5% opacity to Soft Off-White) to prevent the UI from feeling flat or sterile.

Semantic colors for Warning and Danger use earthy, sun-baked tones (Amber and Red Orange) rather than harsh neon variants to maintain the organic narrative.

## Typography
This design system employs a sophisticated dual-type strategy. **Literata** (Serif) is reserved for editorial moments, high-level headings, and storytelling, providing a warm, authoritative, and bookish feel. **Hanken Grotesk** (Sans-Serif) handles all functional UI, body text, and data visualization, ensuring modern legibility and a clean, tech-forward character.

Headlines should use tighter letter-spacing to appear more cohesive, while labels use slightly increased tracking to maintain clarity at small sizes. All typography should be rendered with high-contrast against the background to ensure accessibility while maintaining the soft aesthetic.

## Layout & Spacing
The layout philosophy is a **Fluid Fixed Grid**. Content is housed within a maximum container width of 1280px for desktop, centered on the screen. 

- **Desktop:** 12-column grid with 24px gutters and 40px outer margins.
- **Tablet:** 8-column grid with 24px gutters and 32px outer margins.
- **Mobile:** 4-column grid with 16px gutters and 16px outer margins.

The spacing rhythm follows an 8px base unit. Generous use of `lg` (48px) and `xl` (80px) vertical spacing is encouraged to create a sense of "breathable luxury" and to separate distinct content narratives.

## Elevation & Depth
Depth is achieved through **Glassmorphic Stacking**. Instead of traditional dark shadows, this design system uses:

1.  **Backdrop Blurs:** High-elevation components (like Modals or Floating Action Buttons) use a `20px - 32px` blur on a semi-transparent white background (80% opacity).
2.  **Soft Ambient Shadows:** Lower-elevation elements (Cards) use ultra-diffused shadows with a hint of Forest Green: `0px 10px 30px rgba(45, 90, 39, 0.05)`.
3.  **Inner Glows:** To simulate "Apple-level" polish, a subtle 1px white internal stroke is applied to the top edge of elevated containers to mimic a light source.
4.  **Tonal Tiers:** Surfaces deeper in the hierarchy use slightly darker shades of the off-white background to indicate nesting.

## Shapes
The shape language is extremely soft and approachable. High roundedness is a core brand pillar, reflecting the lack of sharp edges in nature. 
- **Standard UI Elements:** (Buttons, Inputs) use a 1rem (16px) radius.
- **Large Containers:** (Cards, Modals) use a massive `rounded-xl` radius (1.5rem to 2rem / 24px-32px).
- **Interactive States:** Hovering over elements should often trigger a slight "inflation" or "expansion" animation to reinforce the organic, tactile feel.

## Components
- **Buttons:** Primary buttons are Forest Green with white text and a 24px radius. Secondary buttons use a Fresh Leaf background at 15% opacity with Forest Green text.
- **Cards:** Large 32px corner radii. Backgrounds should be either pure white or a glassmorphic blur depending on the complexity of the background.
- **Inputs:** Soft-filled backgrounds (#F0F4F0) with no border until focused. On focus, a 2px Sky Blue stroke appears with a soft outer glow.
- **Chips:** Highly rounded (pill-shaped). Used for categorization, employing the Tertiary Sky Blue or Fresh Leaf Green to indicate "Active" or "Healthy" statuses.
- **Progress Bars:** Thick, 12px height with fully rounded ends. Backgrounds are a light grey-green, with the fill being a gradient from Fresh Leaf Green to Forest Green.
- **Navigation:** A floating "Glass" bottom bar for mobile and a clean, centered header for desktop with high backdrop-filter blur.