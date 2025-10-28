# MenuFlow Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based with Custom Brand Identity

**Primary References:**
- DoorDash/UberEats: Card-based menu layouts, food photography presentation
- Toast POS: Restaurant owner dashboard patterns
- Square: Clean transaction and order management interfaces

**Brand Personality:** Friendly, efficient, appetizing, joyful - a system that makes ordering delightful and operations smooth.

## Core Design Principles

1. **Food-First Visual Language:** Every design decision should enhance appetite appeal and operational clarity
2. **Touch-Optimized:** All interfaces assume mobile/tablet touch input with generous tap targets
3. **Status-Driven Design:** Color and visual weight communicate order states instantly
4. **Dual-Interface Harmony:** Customer and owner portals share DNA but serve different purposes

## Color System

**Primary Palette (Food-Inspired):**
- **Saffron Yellow (#F4A623):** New orders, primary CTAs, brand accents
- **Paprika Red (#E63946):** Urgent actions, sold-out indicators, alerts
- **Sage Green (#87A96B):** Completed/ready orders, success states
- **Eggplant Purple (#5A2A5E):** Premium features, Elite tier indicators
- **Creamy Beige (#F8F4E3):** Primary background, card backgrounds
- **Warm Orange (#FF6B35):** Preparing/in-progress status

**Functional Colors:**
- Backgrounds: Soft cream (#F8F4E3) with subtle parchment texture
- Text: Deep charcoal (#2D3142) for primary, warm gray (#6B6B6B) for secondary
- Borders: Light sage (#D4E2D4) for subtle divisions

**Status Color Logic:**
- New Orders → Saffron Yellow backgrounds/borders
- Preparing → Warm Orange backgrounds/borders  
- Ready → Sage Green backgrounds/borders
- Completed → Muted gray with checkmark

## Typography

**Font Selection:**
- **Primary (Headings/Brand):** Rounded sans-serif like Nunito, Quicksand, or Comfortaa (friendly, approachable)
- **Secondary (Body/UI):** Clean sans like Inter or Open Sans (maximum legibility)
- **Accent (Prices/Numbers):** Tabular numerals from primary font

**Hierarchy:**
- Hero/Brand: 2.5rem-4rem, bold, saffron yellow or eggplant purple
- Section Headers: 1.75rem-2rem, semibold
- Menu Item Names: 1.125rem, medium weight
- Prices: 1.25rem, bold, tabular
- Body/Descriptions: 1rem, regular
- Order Numbers: 2rem-3rem, extra bold (high visibility)

## Layout System

**Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Tight spacing (p-2, p-4): Within cards, button padding
- Medium spacing (p-6, p-8): Card internal padding, section spacing
- Generous spacing (p-12, p-16): Between major sections

**Grid Systems:**
- **Customer Menu:** Single column mobile, 2-column tablet, 3-column desktop for menu items
- **Owner Dashboard:** Responsive grid adapting from 1-col (mobile) to 3-col (desktop) for order cards
- **Live Orders:** Kanban-style columns for status (New | Preparing | Ready)

**Container Widths:**
- Customer Menu: max-w-4xl (focused, not overwhelming)
- Owner Dashboard: max-w-7xl (information density)
- Menu Item Cards: Full-width mobile, fixed aspect ratio for photos

## Component Library

### Customer-Facing Components

**Menu Item Card:**
- Photo: 16:9 aspect ratio, fills card top, subtle shadow
- Content: p-4 with item name, description, price aligned right
- Add Button: Rounded-full, sage green bg, white text, bottom-right overlay on image
- Dietary Icons: Small badges (spicy, veg, gf) in top-left of image, semi-transparent backgrounds
- Border: 2px solid on hover, saffron yellow

**Cart/Order Summary:**
- Sticky bottom bar on mobile (shadows upward)
- Sidebar on desktop (right-aligned, w-80)
- Line items with quantity steppers (rounded buttons)
- Total in large, bold saffron yellow
- Checkout button: Full-width, paprika red, rounded-xl

### Owner Portal Components

**Live Order Card:**
- Large order number (3rem, bold) at top
- Status badge with colored background (yellow/orange/green)
- Table number (if applicable) in eggplant purple pill
- Item list with quantities in grid
- Action buttons at bottom: Status progression (e.g., "Mark Ready")
- Timestamp in corner (relative time: "2m ago")
- Shadow depth increases with urgency (new orders = more shadow)

**Menu Editor:**
- Drag-and-drop reordering with grab handles
- Inline editing with save/cancel actions
- Photo upload with 16:9 crop preview
- Toggle switches for "Available" with green/gray states
- Delete action in subtle paprika red, requires confirmation

**Dashboard Widgets:**
- Metrics cards: White bg, rounded-2xl, p-6, shadow-md
- Charts: Sage green and saffron yellow data visualization
- Top Items: Horizontal bar charts with food emoji prefixes

### Navigation

**Customer Menu:**
- Sticky top bar: MenuFlow logo (left), cart icon with count badge (right)
- Category pills: Horizontal scroll, rounded-full, beige with active in saffron
- Search bar: Full-width, rounded-xl, subtle shadow

**Owner Portal:**
- Sidebar (desktop): Eggplant purple background, white icons/text
- Bottom nav (mobile): 4-5 icons, active state in saffron yellow
- Profile/Settings: Top-right dropdown

## Imagery Guidelines

**Menu Item Photos:**
- High-quality, well-lit food photography
- Consistent styling: 16:9 crop, natural backgrounds, appetizing composition
- Placeholder for items without photos: Sage green gradient with utensil icon

**Hero Sections:**
- Customer Landing: Large hero showing diverse food items on table with MenuFlow QR stand (60vh)
- Owner Dashboard: No hero, immediately show live orders (operational priority)

**Decorative Elements:**
- Subtle texture overlay on creamy beige backgrounds (parchment effect)
- Hand-drawn food illustrations as section dividers (salad, coffee cup, etc.)

## Interactions & Animations

**Micro-interactions (use sparingly):**
- Button press: Scale down to 0.95 on active
- Order card: Slide in from right when new order arrives
- Status change: Smooth background color transition (300ms)
- Cart add: Subtle bounce animation on cart icon

**NO complex scroll animations** - keep interface snappy for operational speed

## Special Patterns

**QR Code Displays:**
- Large, centered QR codes with MenuFlow branding
- Table number overlaid in eggplant purple circle below QR
- Downloadable/printable format with cut lines

**Table Management:**
- Visual table layout map (optional for Elite tier)
- Table cards showing active order count and total
- Color-coded by status (free, seated, ready to bill)

**Kiosk Mode:**
- Extra-large touch targets (min 60px height)
- High contrast: White on eggplant purple for primary actions
- Progress indicator showing step in ordering flow
- Payment hardware integration with clear visual feedback

## Accessibility

- Minimum touch target: 44x44px
- Color contrast ratios: 4.5:1 for text, 3:1 for UI elements
- Focus states: 3px saffron yellow ring with offset
- Screen reader labels for all icon-only buttons
- Keyboard navigation throughout owner portal

## Responsive Breakpoints

- Mobile: 0-768px (single column, bottom nav, stacked orders)
- Tablet: 768-1024px (2-column menus, side nav possible)
- Desktop: 1024px+ (3-column layouts, sidebar nav, Kanban order view)