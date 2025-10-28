// Referencing javascript_database blueprint integration
import {
  vendors,
  menuItems,
  tables,
  orders,
  chatMessages,
  fileUploads,
  bills,
  type Vendor,
  type InsertVendor,
  type MenuItem,
  type InsertMenuItem,
  type Table,
  type InsertTable,
  type Order,
  type InsertOrder,
  type ChatMessage,
  type InsertChatMessage,
  type FileUpload,
  type InsertFileUpload,
  type Bill,
  type InsertBill,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Vendors
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByEmail(email: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  getWaiterForOwner(ownerId: string): Promise<Vendor | undefined>;
  updateVendorPassword(id: string, hashedPassword: string): Promise<Vendor | undefined>;

  // Menu Items
  getMenuItems(vendorId: string): Promise<MenuItem[]>;
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;

  // Tables
  getTables(vendorId: string): Promise<Table[]>;
  getTable(id: string): Promise<Table | undefined>;
  getTableByNumber(vendorId: string, tableNumber: string): Promise<Table | undefined>;
  createTable(table: InsertTable & { qrCode: string }): Promise<Table>;
  deleteTable(id: string): Promise<void>;

  // Orders
  getOrders(vendorId: string, includeArchived?: boolean): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder & { orderNumber: number }): Promise<Order>;
  updateOrderStatus(id: string, status: Order["status"]): Promise<Order | undefined>;
  archiveOrder(id: string): Promise<Order | undefined>;
  getNextOrderNumber(vendorId: string): Promise<number>;

  // Chat Messages
  getChatMessages(vendorId: string, orderId?: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markMessagesAsRead(vendorId: string, orderId?: string): Promise<void>;
  getUnreadCount(vendorId: string): Promise<number>;

  // File Uploads
  getFileUploads(vendorId: string): Promise<FileUpload[]>;
  createFileUpload(upload: InsertFileUpload): Promise<FileUpload>;
  updateFileUploadStatus(id: string, status: FileUpload["processingStatus"], itemsImported?: number, errorMessage?: string): Promise<FileUpload | undefined>;
  bulkCreateMenuItems(items: InsertMenuItem[]): Promise<MenuItem[]>;

  // Bills
  createBill(bill: InsertBill): Promise<Bill>;
  getBillByOrderId(orderId: string): Promise<Bill | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Vendors
  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async getVendorByEmail(email: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.email, email));
    return vendor || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(insertVendor)
      .returning();
    return vendor;
  }

  async getWaiterForOwner(ownerId: string): Promise<Vendor | undefined> {
    const [waiter] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.ownerId, ownerId), eq(vendors.role, "waiter")));
    return waiter || undefined;
  }

  async updateVendorPassword(id: string, hashedPassword: string): Promise<Vendor | undefined> {
    const [updated] = await db
      .update(vendors)
      .set({ password: hashedPassword })
      .where(eq(vendors.id, id))
      .returning();
    return updated || undefined;
  }

  // Menu Items
  async getMenuItems(vendorId: string): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.vendorId, vendorId))
      .orderBy(menuItems.category, menuItems.name);
  }

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [menuItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return menuItem;
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Tables
  async getTables(vendorId: string): Promise<Table[]> {
    return await db
      .select()
      .from(tables)
      .where(eq(tables.vendorId, vendorId))
      .orderBy(tables.tableNumber);
  }

  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table || undefined;
  }

  async getTableByNumber(vendorId: string, tableNumber: string): Promise<Table | undefined> {
    const [table] = await db
      .select()
      .from(tables)
      .where(and(eq(tables.vendorId, vendorId), eq(tables.tableNumber, tableNumber)));
    return table || undefined;
  }

  async createTable(table: InsertTable & { qrCode: string }): Promise<Table> {
    const [newTable] = await db
      .insert(tables)
      .values(table)
      .returning();
    return newTable;
  }

  async deleteTable(id: string): Promise<void> {
    await db.delete(tables).where(eq(tables.id, id));
  }

  // Orders
  async getOrders(vendorId: string, includeArchived: boolean = false): Promise<Order[]> {
    const conditions = includeArchived
      ? eq(orders.vendorId, vendorId)
      : and(eq(orders.vendorId, vendorId), eq(orders.archived, false));
    
    return await db
      .select()
      .from(orders)
      .where(conditions)
      .orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder & { orderNumber: number }): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: Order["status"]): Promise<Order | undefined> {
    const updates: any = { status };
    if (status === "completed") {
      updates.completedAt = new Date();
    }

    const [updated] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async archiveOrder(id: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ archived: true })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async getNextOrderNumber(vendorId: string): Promise<number> {
    // Get all non-archived orders for this vendor to prevent duplicate numbers
    const recentOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.vendorId, vendorId))
      .orderBy(desc(orders.orderNumber));

    if (recentOrders.length === 0) {
      return 1;
    }

    return recentOrders[0].orderNumber + 1;
  }

  // Chat Messages
  async getChatMessages(vendorId: string, orderId?: string): Promise<ChatMessage[]> {
    const conditions = orderId
      ? and(eq(chatMessages.vendorId, vendorId), eq(chatMessages.orderId, orderId))
      : eq(chatMessages.vendorId, vendorId);

    return await db
      .select()
      .from(chatMessages)
      .where(conditions)
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async markMessagesAsRead(vendorId: string, orderId?: string): Promise<void> {
    const conditions = orderId
      ? and(
          eq(chatMessages.vendorId, vendorId),
          eq(chatMessages.orderId, orderId),
          eq(chatMessages.senderType, "customer")
        )
      : and(
          eq(chatMessages.vendorId, vendorId),
          eq(chatMessages.senderType, "customer")
        );

    await db
      .update(chatMessages)
      .set({ isRead: true })
      .where(conditions);
  }

  async getUnreadCount(vendorId: string): Promise<number> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.vendorId, vendorId),
          eq(chatMessages.senderType, "customer"),
          eq(chatMessages.isRead, false)
        )
      );
    return messages.length;
  }

  // File Uploads
  async getFileUploads(vendorId: string): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .where(eq(fileUploads.vendorId, vendorId))
      .orderBy(desc(fileUploads.createdAt));
  }

  async createFileUpload(upload: InsertFileUpload): Promise<FileUpload> {
    const [newUpload] = await db
      .insert(fileUploads)
      .values(upload)
      .returning();
    return newUpload;
  }

  async updateFileUploadStatus(
    id: string,
    status: FileUpload["processingStatus"],
    itemsImported?: number,
    errorMessage?: string
  ): Promise<FileUpload | undefined> {
    const updates: any = { processingStatus: status };
    if (itemsImported !== undefined) updates.itemsImported = itemsImported;
    if (errorMessage !== undefined) updates.errorMessage = errorMessage;

    const [updated] = await db
      .update(fileUploads)
      .set(updates)
      .where(eq(fileUploads.id, id))
      .returning();
    return updated || undefined;
  }

  async bulkCreateMenuItems(items: InsertMenuItem[]): Promise<MenuItem[]> {
    if (items.length === 0) return [];
    
    const createdItems = await db
      .insert(menuItems)
      .values(items)
      .returning();
    return createdItems;
  }

  // Bills
  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db
      .insert(bills)
      .values(bill)
      .returning();
    return newBill;
  }

  async getBillByOrderId(orderId: string): Promise<Bill | undefined> {
    const [bill] = await db
      .select()
      .from(bills)
      .where(eq(bills.orderId, orderId));
    return bill || undefined;
  }
}

export const storage = new DatabaseStorage();
