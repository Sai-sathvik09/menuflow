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
  businessType: text("business_type").notNull().default("restaurant"), // restaurant, streetFood, cafe, bakery, quickService
  subscriptionTier: text("subscription_tier").notNull().default("starter"), // starter, pro, elite
  tableLimit: integer("table_limit").default(0), // 0 for starter, 10/25/unlimited for pro tiers
  role: text("role").notNull().default("owner"), // owner, waiter
  ownerId: varchar("owner_id"), // links waiter to owner account
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
  importSource: text("import_source"), // csv, pdf, manual, photo
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(), // customer, vendor
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, order_inquiry, menu_question, feedback, support
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// File uploads table
export const fileUploads = pgTable("file_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // csv, pdf, image
  fileUrl: text("file_url").notNull(),
  processingStatus: text("processing_status").notNull().default("pending"), // pending, processing, completed, failed
  itemsImported: integer("items_imported").default(0),
  errorMessage: text("error_message"),
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
  archived: boolean("archived").notNull().default(false), // auto-archived after completion
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Bills table (generated when order is completed)
export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }).unique(),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  orderNumber: integer("order_number").notNull(),
  tableNumber: text("table_number"),
  items: json("items").notNull().$type<Array<{ name: string; price: string; quantity: number }>>(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const vendorsRelations = relations(vendors, ({ many, one }) => ({
  menuItems: many(menuItems),
  tables: many(tables),
  orders: many(orders),
  bills: many(bills),
  waiters: many(vendors, { relationName: "ownerToWaiters" }),
  owner: one(vendors, {
    fields: [vendors.ownerId],
    references: [vendors.id],
    relationName: "ownerToWaiters"
  }),
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

export const ordersRelations = relations(orders, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [orders.vendorId],
    references: [vendors.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  chatMessages: many(chatMessages),
  bill: one(bills, {
    fields: [orders.id],
    references: [bills.orderId],
  }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  vendor: one(vendors, {
    fields: [bills.vendorId],
    references: [vendors.id],
  }),
  order: one(orders, {
    fields: [bills.orderId],
    references: [orders.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  vendor: one(vendors, {
    fields: [chatMessages.vendorId],
    references: [vendors.id],
  }),
  order: one(orders, {
    fields: [chatMessages.orderId],
    references: [orders.id],
  }),
}));

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  vendor: one(vendors, {
    fields: [fileUploads.vendorId],
    references: [vendors.id],
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
  businessType: z.enum(["restaurant", "streetFood", "cafe", "bakery", "quickService"]).optional(),
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

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
}).extend({
  senderType: z.enum(["customer", "vendor"]),
  messageType: z.enum(["text", "order_inquiry", "menu_question", "feedback", "support"]).optional(),
  message: z.string().min(1),
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  createdAt: true,
}).extend({
  fileType: z.enum(["csv", "pdf", "image"]),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
}).extend({
  orderNumber: z.number().min(1),
  items: z.array(z.object({
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

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
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
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

// Subscription tier types
export type SubscriptionTier = "starter" | "pro" | "elite";
export type OrderStatus = "new" | "preparing" | "ready" | "completed";
export type SenderType = "customer" | "vendor";
export type MessageType = "text" | "order_inquiry" | "menu_question" | "feedback" | "support";
export type BusinessType = "restaurant" | "streetFood" | "cafe" | "bakery" | "quickService";
export type VendorRole = "owner" | "waiter" | "kitchen";

// Predefined categories for different vendor types
export const VENDOR_CATEGORIES = {
  restaurant: [
    "Appetizers",
    "Soups & Salads",
    "Main Course",
    "Sides",
    "Desserts",
    "Beverages",
    "Specials"
  ],
  streetFood: [
    "Dosas",
    "Chaats",
    "Snacks",
    "Sweet Dishes",
    "Beverages",
    "Ice Creams & Desserts",
    "Combo Meals"
  ],
  cafe: [
    "Coffee & Tea",
    "Fresh Juices",
    "Smoothies",
    "Sandwiches",
    "Pastries & Cakes",
    "Breakfast Items",
    "Light Bites"
  ],
  bakery: [
    "Breads",
    "Cakes",
    "Pastries",
    "Cookies",
    "Savory Items",
    "Custom Orders",
    "Beverages"
  ],
  quickService: [
    "Burgers",
    "Pizzas",
    "Wraps & Rolls",
    "Fries & Sides",
    "Beverages",
    "Combos",
    "Add-ons"
  ]
} as const;
