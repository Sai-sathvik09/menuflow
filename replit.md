# MenuFlow - Digital Menu Platform

## Overview
MenuFlow is a QR code-based digital menu platform for restaurants and street vendors. It enables vendors to create customizable digital menus accessible via QR codes, offering real-time order management, analytics, and business insights. The platform supports a three-role architecture (owner, waiter, kitchen) with role-specific interfaces and smart order merging for efficient table service, aiming to streamline operations and enhance customer experience in the food service industry.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack:** React 18, TypeScript, Wouter, Radix UI, shadcn/ui, Tailwind CSS, TanStack Query, React Hook Form, Zod.
- **Design System:** Food-inspired color palette, status-driven design with color-coded order states, touch-optimized interfaces, Nunito and Inter typography, custom CSS variables for theming.
- **Key UI Patterns:** Card-based layouts for menus, real-time dashboard for order management, sidebar navigation with role-based visibility, status badges, WebSocket-powered live updates.

### Backend
- **Technology Stack:** Node.js, Express.js, TypeScript, PostgreSQL (Neon serverless), Drizzle ORM, bcrypt, WebSocket (ws library).
- **API Design:** RESTful API for CRUD operations, status updates, and WebSocket at `/ws`. Zod for shared schema validation.
- **Authentication:** LocalStorage-based session management. **Critical Security Limitation:** Current authentication is not production-ready; requires server-side session management (e.g., JWT, `express-session`) and proper role-based authorization for production.
- **Three-Role System:**
    - **Owner:** Full access (menu, table, order management, analytics, staff creation).
    - **Waiter:** Limited to menu viewing, table viewing, order creation.
    - **Kitchen:** Limited to viewing and updating order statuses.
    - Role-based UI dynamically shows allowed features.
- **Order Merging System:** Automatically merges new items into existing active orders for a given table, preventing duplicate orders and updating quantities.
- **Staff Account Management:** Owners can create waiter and kitchen staff accounts with tier-based restrictions (Starter: No staff; Pro: Max 2 waiters + 2 kitchen; Elite: Unlimited).
- **Super Admin System:** Platform-wide administration with features for platform analytics, vendor management, and elite plan inquiry tracking. **Critical Security Limitation:** Similar to vendor authentication, super admin auth is not production-ready.
- **Settings and Account Management:** Users can change passwords, with secure verification of current password.

### Data Architecture
- **Database Schema (Drizzle ORM):**
    - **Vendors:** Stores business accounts, subscription tier, and table limits.
    - **Menu Items:** Stores menu details, categories, availability, dietary tags, and image URLs.
    - **Tables:** Manages restaurant tables with unique QR codes.
    - **Orders:** Stores order details, links to vendor/table, sequential order numbers, status, items (as denormalized JSON), total amount, and timestamps.
- **Relationships:** One-to-many relationships between Vendor and Menu Items, Tables, and Orders.

### Real-time Communication
- **WebSocket Implementation:** Server manages connections per vendor, supporting multiple devices.
- **Message Types:** `NEW_ORDER` (customer order), `ORDER_UPDATE` (status change).
- **Client Integration:** `useWebSocket` hook manages connection, invalidates React Query cache, provides optional audio notifications.

### Subscription Tier System
- **Starter:** Core QR menu, basic order management, no table management.
- **Pro:** All Starter features + table management (10 or 25 tables), analytics, CRM insights.
- **Elite:** All Pro features + unlimited tables, advanced AI insights (future), premium customization.
- Features are gated based on the subscription tier.

### Build and Deployment
- **Development:** Vite (frontend), tsx (backend) with hot reload.
- **Production Build:** Vite builds frontend, esbuild bundles backend.
- **Environment:** `DATABASE_URL` for PostgreSQL, Neon serverless for edge deployment.

## External Dependencies

### Database
- **Neon PostgreSQL:** Serverless Postgres.
- **Drizzle ORM:** Type-safe database client.
- **drizzle-kit:** CLI for migrations.

### UI Component Libraries
- **Radix UI:** Headless accessible components.
- **shadcn/ui:** Pre-styled Radix UI components.
- **Lucide React:** Icon library.
- **qrcode.react:** QR code generation.

### State Management & Data Fetching
- **TanStack Query:** Server state management.
- **React Hook Form:** Form handling.
- **Zod:** Schema validation.

### Utilities
- **date-fns:** Date manipulation.
- **bcrypt:** Password hashing.
- **class-variance-authority, clsx, tailwind-merge:** Styling utilities.

### Development Tools
- **Vite:** Build tool.
- **TypeScript:** Type safety.

### Fonts
- **Google Fonts:** Nunito and Inter.