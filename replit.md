# MenuFlow - Digital Menu Platform

## Overview

MenuFlow is a QR code-based digital menu platform designed for restaurants and street vendors. The system enables vendors to create customizable digital menus that customers can access by scanning QR codes, while providing owners with real-time order management, analytics, and business insights. The platform features a dual-interface architecture serving both customer-facing menu experiences and vendor management portals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter for lightweight client-side routing
- **UI Components:** Radix UI primitives with shadcn/ui component system
- **Styling:** Tailwind CSS with custom design tokens following food-inspired color palette
- **State Management:** TanStack Query (React Query) for server state management
- **Form Handling:** React Hook Form with Zod validation

**Design System:**
- Food-inspired color palette (Saffron Yellow, Paprika Red, Sage Green, Eggplant Purple, Creamy Beige)
- Status-driven design with color-coded order states (new → preparing → ready → completed)
- Touch-optimized interfaces with generous tap targets for mobile/tablet use
- Typography: Nunito for headings (friendly, rounded), Inter for body text (high legibility)
- Custom CSS variables for theming and dark mode support

**Key UI Patterns:**
- Card-based layouts inspired by DoorDash/UberEats for menu items
- Real-time dashboard inspired by Toast POS for order management
- Sidebar navigation for owner portal with role-based feature visibility
- Status badges with icons for instant order state recognition
- WebSocket-powered live updates with toast notifications

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript with ES modules
- **Database:** PostgreSQL via Neon serverless
- **ORM:** Drizzle ORM for type-safe database queries
- **Authentication:** bcrypt for password hashing, localStorage-based session management
- **Real-time:** WebSocket (ws library) for live order notifications

**API Design:**
- RESTful API structure under `/api` namespace
- CRUD operations for vendors, menu items, tables, and orders
- Status update endpoints for order workflow management
- WebSocket endpoint at `/ws` for real-time vendor connections
- Validation using Zod schemas shared between client and server

**Authentication Flow:**
- Registration creates vendor account with hashed password
- Login returns vendor object stored in localStorage
- Client-side auth context provides vendor state across application
- Protected routes check vendor presence before rendering

**Order Management System:**
- Sequential order numbering per vendor for easy calling out
- Four-state workflow: new → preparing → ready → completed
- Real-time WebSocket broadcasts to vendor connections on new orders
- Order items stored as JSON with denormalized menu item data

### Data Architecture

**Database Schema (Drizzle ORM):**

**Vendors Table:**
- Stores business accounts with email/password authentication
- Subscription tier (starter/pro/elite) controls feature access
- Table limit enforced based on tier (0 for starter, 10/25/unlimited for pro tiers)

**Menu Items Table:**
- Each vendor owns multiple menu items
- Categories for organization (appetizers, mains, beverages, desserts, sides)
- Availability toggle for sold-out management
- Dietary tags array (vegetarian, vegan, spicy, gluten-free)
- Optional image URLs for food photography
- Cascade delete on vendor removal

**Tables Table:**
- Pro/Elite tier feature for restaurant table management
- Each table has unique QR code for customer scanning
- Table number for easy identification
- Active/inactive status toggle
- Cascade delete on vendor removal

**Orders Table:**
- Links to vendor and optionally to table (null for street vendors)
- Sequential order number per vendor
- Status field tracks workflow state
- Items stored as JSON array with denormalized menu data (prevents issues if menu changes)
- Total amount calculated at order creation
- Optional customer name for personalized service
- Timestamps for order tracking

**Relationships:**
- Vendor → Menu Items (one-to-many)
- Vendor → Tables (one-to-many)
- Vendor → Orders (one-to-many)
- Table → Orders (one-to-many, nullable)

### Real-time Communication

**WebSocket Implementation:**
- Server maintains Map of vendorId → WebSocket connections array
- Multiple devices per vendor supported (kitchen display, tablet, phone)
- Connection established with vendorId query parameter
- Automatic connection cleanup on disconnect

**Message Types:**
- `NEW_ORDER`: Broadcast when customer places order, triggers query invalidation and toast notification
- `ORDER_UPDATE`: Broadcast when order status changes, refreshes order list

**Client Integration:**
- Custom `useWebSocket` hook manages connection lifecycle
- Automatically connects when vendor logged in
- Invalidates React Query cache on updates for instant UI refresh
- Optional audio notification on new orders

### Subscription Tier System

**Starter Tier:**
- Core QR menu functionality
- Unlimited menu items
- Basic order management
- No table management (street vendor mode)
- Dashboard and live orders

**Pro Tier:**
- All Starter features
- Table management (10 or 25 tables based on sub-tier)
- QR codes per table
- Analytics dashboard
- CRM insights (most/least ordered items, revenue tracking)

**Elite Tier:**
- All Pro features
- Unlimited tables
- Advanced AI-powered insights (placeholder for future)
- Premium customization options

**Feature Gates:**
- Sidebar items show "Pro Only" badge for locked features
- Tables and Analytics pages check subscription tier
- Table creation enforces table limit based on tier

### Build and Deployment

**Development:**
- Vite dev server with HMR for frontend
- tsx for running TypeScript backend with hot reload
- Shared schema between client/server prevents type mismatches

**Production Build:**
- Vite builds frontend to `dist/public`
- esbuild bundles backend to `dist/index.js`
- Static file serving from Express in production
- Database migrations via Drizzle Kit

**Environment:**
- `DATABASE_URL` required for PostgreSQL connection
- Neon serverless with WebSocket support for edge deployment
- Environment-aware configuration (development vs production)

## External Dependencies

### Database
- **Neon PostgreSQL:** Serverless Postgres with WebSocket support for edge compatibility
- **Drizzle ORM:** Type-safe database client with schema-first design
- **drizzle-kit:** CLI for migrations and schema management

### UI Component Libraries
- **Radix UI:** Headless accessible component primitives (Dialog, Dropdown, Tabs, etc.)
- **shadcn/ui:** Pre-styled Radix UI components with Tailwind CSS
- **Lucide React:** Icon library for consistent iconography
- **qrcode.react:** QR code generation for table and menu URLs

### State Management & Data Fetching
- **TanStack Query:** Server state management with caching, invalidation, and WebSocket integration
- **React Hook Form:** Performant form handling with minimal re-renders
- **Zod:** Schema validation for forms and API payloads

### Utilities
- **date-fns:** Date formatting and manipulation for order timestamps
- **bcrypt:** Password hashing for secure authentication
- **class-variance-authority:** Type-safe variant-based styling
- **clsx & tailwind-merge:** Conditional class name composition

### Development Tools
- **Vite:** Fast build tool with HMR and optimized production builds
- **TypeScript:** Type safety across frontend and backend
- **Replit Plugins:** Runtime error overlay, cartographer, dev banner for development experience

### Fonts
- **Google Fonts:** Nunito (display/headings) and Inter (body text) for brand typography