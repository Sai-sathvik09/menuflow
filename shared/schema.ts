import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, boolean, integer, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vendors table
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  businessName: text("business_name").notNull(),
  subscriptionTier: text("subscription_tier").notNull().default("starter"), // starter, pro, elite
  tableLimit: integer("table_limit").default(0), // 0 for starter, 10/25/unlimited for pro tiers
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Menu items table
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // appetizers, mains, beverages, desserts, etc.
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  dietaryTags: text("dietary_tags").array(), // vegetarian, vegan, spicy, gluten-free, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tables table (for restaurants)
export const tables = pgTable("tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  tableNumber: text("table_number").notNull(),
  qrCode: text("qr_code").notNull(), // unique QR code data for this table
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  tableId: varchar("table_id").references(() => tables.id, { onDelete: "set null" }), // null for street vendors
  orderNumber: integer("order_number").notNull(), // sequential number for calling out orders
  status: text("status").notNull().default("new"), // new, preparing, ready, completed
  items: json("items").notNull().$type<Array<{ menuItemId: string; name: string; price: string; quantity: number }>>(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const vendorsRelations = relations(vendors, ({ many }) => ({
  menuItems: many(menuItems),
  tables: many(tables),
  orders: many(orders),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  vendor: one(vendors, {
    fields: [menuItems.vendorId],
    references: [vendors.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [tables.vendorId],
    references: [vendors.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  vendor: one(vendors, {
    fields: [orders.vendorId],
    references: [vendors.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
}));

// Insert schemas
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
}).extend({
  email: z.string().email(),
  password: z.string().min(6),
  businessName: z.string().min(1),
  subscriptionTier: z.enum(["starter", "pro", "elite"]).optional(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  category: z.string().min(1),
  isAvailable: z.boolean().optional(),
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
  createdAt: true,
  qrCode: true,
}).extend({
  tableNumber: z.string().min(1),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  orderNumber: true,
}).extend({
  items: z.array(z.object({
    menuItemId: z.string(),
    name: z.string(),
    price: z.string(),
    quantity: z.number().min(1),
  })),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Types
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Subscription tier types
export type SubscriptionTier = "starter" | "pro" | "elite";
export type OrderStatus = "new" | "preparing" | "ready" | "completed";
