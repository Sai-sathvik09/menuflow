// Referencing javascript_websocket blueprint integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertVendorSchema, 
  loginSchema, 
  changePasswordSchema,
  insertMenuItemSchema,
  insertTableSchema,
  insertOrderSchema,
  insertChatMessageSchema,
  insertFileUploadSchema,
  insertContactInquirySchema,
  type Order,
  type InsertMenuItem
} from "@shared/schema";
import bcrypt from "bcrypt";
import Papa from "papaparse";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time order notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active vendor connections
  const vendorConnections = new Map<string, WebSocket[]>();
  const archiveTimers = new Map<string, NodeJS.Timeout>();

  // Helper function to get the actual owner ID (for access control)
  async function getOwnerIdForVendor(vendorId: string): Promise<{ ownerId: string; isWaiter: boolean } | null> {
    const vendor = await storage.getVendor(vendorId);
    if (!vendor) return null;
    
    // If waiter, return the owner ID. If owner, return their own ID
    if (vendor.role === "waiter" && vendor.ownerId) {
      return { ownerId: vendor.ownerId, isWaiter: true };
    }
    return { ownerId: vendor.id, isWaiter: false };
  }

  wss.on('connection', async (ws, req) => {
    const vendorId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('vendorId');
    
    if (vendorId) {
      // For waiters connecting with owner ID, we store the connection under owner ID
      // This ensures waiters receive broadcasts intended for the owner
      if (!vendorConnections.has(vendorId)) {
        vendorConnections.set(vendorId, []);
      }
      vendorConnections.get(vendorId)!.push(ws);

      ws.on('close', () => {
        const connections = vendorConnections.get(vendorId);
        if (connections) {
          const index = connections.indexOf(ws);
          if (index > -1) {
            connections.splice(index, 1);
          }
        }
      });
    }
  });

  // Broadcast to vendor's connections
  function broadcastToVendor(vendorId: string, message: any) {
    const connections = vendorConnections.get(vendorId) || [];
    const data = JSON.stringify(message);
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  // ============================================================================
  // SECURITY WARNING - AUTHENTICATION LIMITATIONS
  // ============================================================================
  // The current implementation has CRITICAL security flaws:
  // 
  // 1. NO SECURE USER IDENTIFICATION: vendorId is passed from client (localStorage)
  //    and can be spoofed by malicious users or compromised clients.
  //
  // 2. ROLE CHECKS CAN BE BYPASSED: Waiters can send owner's vendorId in requests
  //    to bypass "owner-only" endpoint restrictions.
  //
  // 3. NO SESSION MANAGEMENT: Server cannot verify the actual identity of the 
  //    requesting user.
  //
  // FOR PRODUCTION, IMPLEMENT:
  // - Server-side session management (express-session with secure session store)
  // - OR JWT tokens with proper signature verification
  // - Authentication middleware that verifies user identity from secure sessions
  // - Role-based authorization middleware that checks authenticated user's role
  // - CSRF protection for state-changing operations
  //
  // Current role checks provide UI-level access control only and should NOT be
  // relied upon for security. They prevent accidental access, not malicious bypass.
  // ============================================================================
  
  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertVendorSchema.parse(req.body);
      
      // Check if email already exists
      const existing = await storage.getVendorByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Set table limit based on subscription tier
      let tableLimit = 0;
      if (data.subscriptionTier === "pro") {
        tableLimit = 10; // Default to Bistro plan
      } else if (data.subscriptionTier === "elite") {
        tableLimit = 999; // Unlimited
      }

      const vendor = await storage.createVendor({
        ...data,
        password: hashedPassword,
        tableLimit,
      });

      // Auto-create waiter account for the restaurant owner
      const waiterEmail = `waiter-${vendor.id}@menuflow.app`;
      const waiterPassword = "waiter123";
      const waiterHashedPassword = await bcrypt.hash(waiterPassword, 10);

      await storage.createVendor({
        email: waiterEmail,
        password: waiterHashedPassword,
        businessName: `${vendor.businessName} - Waiter`,
        businessType: vendor.businessType as any,
        subscriptionTier: vendor.subscriptionTier as any,
        tableLimit: 0,
        role: "waiter",
        ownerId: vendor.id,
      });

      // Don't send password back
      const { password, ...vendorData } = vendor;
      res.json(vendorData);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const vendor = await storage.getVendorByEmail(email);
      if (!vendor) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, vendor.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Don't send password back
      const { password: _, ...vendorData } = vendor;
      res.json(vendorData);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const { vendorId, currentPassword, newPassword } = req.body;
      
      if (!vendorId) {
        return res.status(400).json({ message: "Vendor ID required" });
      }

      const vendor = await storage.getVendor(vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, vendor.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await storage.updateVendorPassword(vendorId, hashedPassword);
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to change password" });
    }
  });

  app.get("/api/auth/waiter/:ownerId", async (req, res) => {
    try {
      const waiter = await storage.getWaiterForOwner(req.params.ownerId);
      
      if (!waiter) {
        return res.status(404).json({ message: "Waiter account not found" });
      }

      // Return waiter email (password will be the default: waiter123)
      res.json({ 
        email: waiter.email,
        defaultPassword: "waiter123" 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch waiter credentials" });
    }
  });

  // Create kitchen staff account (owner only, tier-restricted)
  app.post("/api/auth/kitchen", async (req, res) => {
    try {
      const { ownerId, email, password } = req.body;

      if (!ownerId || !email || !password) {
        return res.status(400).json({ message: "ownerId, email, and password are required" });
      }

      // Verify owner exists
      const owner = await storage.getVendor(ownerId);
      if (!owner || owner.role !== "owner") {
        return res.status(403).json({ message: "Only owners can create kitchen staff accounts" });
      }

      // Check tier restrictions
      if (owner.subscriptionTier === "starter") {
        return res.status(403).json({ message: "Kitchen staff accounts are only available on Pro and Elite plans" });
      }

      // Check kitchen staff count limits for Pro tier
      if (owner.subscriptionTier === "pro") {
        const existingKitchen = await storage.getKitchenStaffForOwner(ownerId);
        if (existingKitchen.length >= 2) {
          return res.status(403).json({ message: "Pro plan allows maximum 2 kitchen staff accounts. Upgrade to Elite for unlimited." });
        }
      }

      // Check if email already exists
      const existing = await storage.getVendorByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create kitchen staff account
      const kitchenStaff = await storage.createVendor({
        email,
        password: hashedPassword,
        businessName: `${owner.businessName} - Kitchen`,
        businessType: owner.businessType as any,
        subscriptionTier: owner.subscriptionTier as any,
        tableLimit: 0,
        role: "kitchen",
        ownerId: owner.id,
      });

      // Don't send password back
      const { password: _, ...staffData } = kitchenStaff;
      res.json(staffData);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create kitchen staff account" });
    }
  });

  // Get kitchen staff for owner
  app.get("/api/auth/kitchen/:ownerId", async (req, res) => {
    try {
      const kitchenStaff = await storage.getKitchenStaffForOwner(req.params.ownerId);
      res.json(kitchenStaff);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch kitchen staff" });
    }
  });

  // Create waiter account (owner only, tier-restricted)
  app.post("/api/auth/waiters", async (req, res) => {
    try {
      const { ownerId, email, password } = req.body;

      if (!ownerId || !email || !password) {
        return res.status(400).json({ message: "ownerId, email, and password are required" });
      }

      // Verify owner exists
      const owner = await storage.getVendor(ownerId);
      if (!owner || owner.role !== "owner") {
        return res.status(403).json({ message: "Only owners can create waiter accounts" });
      }

      // Check tier restrictions
      if (owner.subscriptionTier === "starter") {
        return res.status(403).json({ message: "Waiter accounts are only available on Pro and Elite plans" });
      }

      // Check waiter count limits for Pro tier
      if (owner.subscriptionTier === "pro") {
        const existingWaiters = await storage.getWaitersForOwner(ownerId);
        if (existingWaiters.length >= 2) {
          return res.status(403).json({ message: "Pro plan allows maximum 2 waiter accounts. Upgrade to Elite for unlimited." });
        }
      }

      // Check if email already exists
      const existing = await storage.getVendorByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create waiter account
      const waiter = await storage.createVendor({
        email,
        password: hashedPassword,
        businessName: `${owner.businessName} - Waiter`,
        businessType: owner.businessType as any,
        subscriptionTier: owner.subscriptionTier as any,
        tableLimit: owner.tableLimit,
        role: "waiter",
        ownerId: owner.id,
      });

      // Don't send password back
      const { password: _, ...waiterData } = waiter;
      res.json(waiterData);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create waiter account" });
    }
  });

  // Get waiters for owner
  app.get("/api/auth/waiters/:ownerId", async (req, res) => {
    try {
      const waiters = await storage.getWaitersForOwner(req.params.ownerId);
      res.json(waiters);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch waiters" });
    }
  });

  // Contact Inquiry Routes (for Elite tier sales leads from landing page)
  app.post("/api/contact-inquiries", async (req, res) => {
    try {
      const data = insertContactInquirySchema.parse(req.body);
      const inquiry = await storage.createContactInquiry(data);
      res.json(inquiry);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to submit inquiry" });
    }
  });

  app.get("/api/contact-inquiries", async (req, res) => {
    try {
      const inquiries = await storage.getContactInquiries();
      res.json(inquiries);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch contact inquiries" });
    }
  });

  app.patch("/api/contact-inquiries/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateContactInquiryStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ message: "Inquiry not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update inquiry status" });
    }
  });

  // Menu Routes
  app.get("/api/menu/:vendorId", async (req, res) => {
    try {
      const items = await storage.getMenuItems(req.params.vendorId);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch menu" });
    }
  });

  app.post("/api/menu", async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      
      // Check if vendor is a waiter (waiters cannot manage menu)
      const vendorInfo = await getOwnerIdForVendor(data.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage menu items" });
      }
      
      const item = await storage.createMenuItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create menu item" });
    }
  });

  app.patch("/api/menu/:id", async (req, res) => {
    try {
      // Get existing item to verify ownership
      const existingItem = await storage.getMenuItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Check if vendor is a waiter (waiters cannot manage menu)
      const vendorInfo = await getOwnerIdForVendor(existingItem.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage menu items" });
      }
      
      const item = await storage.updateMenuItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update menu item" });
    }
  });

  app.delete("/api/menu/:id", async (req, res) => {
    try {
      // Get existing item to verify ownership
      const existingItem = await storage.getMenuItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      // Check if vendor is a waiter (waiters cannot manage menu)
      const vendorInfo = await getOwnerIdForVendor(existingItem.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage menu items" });
      }
      
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete menu item" });
    }
  });

  // Table Routes
  app.get("/api/tables/:vendorId", async (req, res) => {
    try {
      // Check if vendor is a waiter (waiters cannot manage tables)
      const vendorInfo = await getOwnerIdForVendor(req.params.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage tables" });
      }
      
      const tables = await storage.getTables(req.params.vendorId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch tables" });
    }
  });

  app.post("/api/tables", async (req, res) => {
    try {
      const data = insertTableSchema.parse(req.body);
      
      // Check if vendor is a waiter (waiters cannot manage tables)
      const vendorInfo = await getOwnerIdForVendor(data.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage tables" });
      }
      
      // Generate QR code data
      const qrCode = `menu/${data.vendorId}/table/${data.tableNumber}`;
      
      const table = await storage.createTable({ ...data, qrCode });
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create table" });
    }
  });

  app.delete("/api/tables/:id", async (req, res) => {
    try {
      // Get existing table to verify ownership
      const existingTable = await storage.getTable(req.params.id);
      if (!existingTable) {
        return res.status(404).json({ message: "Table not found" });
      }
      
      // Check if vendor is a waiter (waiters cannot manage tables)
      const vendorInfo = await getOwnerIdForVendor(existingTable.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage tables" });
      }
      
      await storage.deleteTable(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete table" });
    }
  });

  // Order Routes
  app.get("/api/orders/:vendorId", async (req, res) => {
    try {
      const orders = await storage.getOrders(req.params.vendorId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const data = insertOrderSchema.parse(req.body);
      
      // Handle tableId - could be either a UUID or a table number from QR code URL
      let actualTableId: string | null = null;
      
      if (data.tableId && data.tableId.trim() !== '') {
        const tableIdOrNumber = data.tableId.trim();
        
        // First try looking it up as a UUID (direct table ID)
        let table = await storage.getTable(tableIdOrNumber);
        
        // If not found, try looking it up as a table number (from QR code)
        if (!table) {
          table = await storage.getTableByNumber(data.vendorId, tableIdOrNumber);
        }
        
        if (!table) {
          return res.status(400).json({ message: "Invalid table - table does not exist" });
        }
        
        // Verify table belongs to the vendor
        if (table.vendorId !== data.vendorId) {
          return res.status(400).json({ message: "Invalid table - table does not belong to this vendor" });
        }
        
        actualTableId = table.id;
      }
      
      // Create order data with the actual table ID (UUID)
      const orderData = {
        ...data,
        tableId: actualTableId,
      };
      
      // Check if table has active orders and merge if it does
      if (actualTableId) {
        const allOrders = await storage.getOrders(orderData.vendorId, false);
        const activeOrderForTable = allOrders.find((o: Order) => 
          o.tableId === actualTableId && 
          (o.status === "new" || o.status === "preparing" || o.status === "ready")
        );
        
        if (activeOrderForTable) {
          // Merge items into existing order
          const existingItems = activeOrderForTable.items as Array<{ menuItemId: string; name: string; price: string; quantity: number }>;
          const newItems = orderData.items;
          
          // Merge quantities for duplicate items
          const mergedItems = [...existingItems];
          for (const newItem of newItems) {
            const existingIndex = mergedItems.findIndex(i => i.menuItemId === newItem.menuItemId);
            if (existingIndex >= 0) {
              mergedItems[existingIndex].quantity += newItem.quantity;
            } else {
              mergedItems.push(newItem);
            }
          }
          
          // Calculate new total
          const newTotal = mergedItems.reduce((sum, item) => 
            sum + (parseFloat(item.price) * item.quantity), 0
          ).toFixed(2);
          
          // Update existing order with merged items
          const updatedOrder = await storage.updateOrderItems(activeOrderForTable.id, mergedItems, newTotal);
          
          // Broadcast order update
          broadcastToVendor(orderData.vendorId, {
            type: 'ORDER_UPDATE',
            order: updatedOrder,
          });
          
          return res.json(updatedOrder);
        }
      }
      
      // No active order for table, create new order
      const orderNumber = await storage.getNextOrderNumber(orderData.vendorId);
      const order = await storage.createOrder({ ...orderData, orderNumber });
      
      // Broadcast new order to vendor's connected clients
      broadcastToVendor(orderData.vendorId, {
        type: 'NEW_ORDER',
        order,
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!["new", "preparing", "ready", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const orderId = req.params.id;

      // Cancel any existing archive timer for this order
      const existingTimer = archiveTimers.get(orderId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        archiveTimers.delete(orderId);
      }

      const order = await storage.updateOrderStatus(orderId, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Generate bill when order is completed
      if (status === "completed") {
        // Check if bill already exists for this order
        const existingBill = await storage.getBillByOrderId(orderId);
        
        if (!existingBill) {
          // Get table number if table exists
          let tableNumber: string | null = null;
          if (order.tableId) {
            const table = await storage.getTable(order.tableId);
            if (table) {
              tableNumber = table.tableNumber;
            }
          }

          // Create bill
          await storage.createBill({
            orderId: order.id,
            vendorId: order.vendorId,
            orderNumber: order.orderNumber,
            tableNumber,
            items: order.items.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
            totalAmount: order.totalAmount,
            customerName: order.customerName,
          });
        }
      }

      // Broadcast status update to vendor's connected clients
      broadcastToVendor(order.vendorId, {
        type: 'ORDER_UPDATE',
        order,
      });

      // Auto-archive after 1 minute if status is completed
      if (status === "completed") {
        const timer = setTimeout(async () => {
          try {
            // Re-fetch order to verify it's still completed
            const currentOrder = await storage.getOrder(orderId);
            if (currentOrder && currentOrder.status === "completed") {
              const archived = await storage.archiveOrder(orderId);
              if (archived) {
                // Only broadcast if archiving succeeded
                broadcastToVendor(order.vendorId, {
                  type: 'ORDER_ARCHIVED',
                  orderId,
                });
                archiveTimers.delete(orderId);
              } else {
                console.error(`Failed to archive order ${orderId}: Order not found`);
              }
            } else {
              console.log(`Skipping archive for order ${orderId}: status changed from completed`);
            }
            archiveTimers.delete(orderId);
          } catch (error) {
            console.error(`Failed to archive order ${orderId}:`, error);
            archiveTimers.delete(orderId);
          }
        }, 60000); // 60 seconds = 1 minute
        
        archiveTimers.set(orderId, timer);
      }

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id/items", async (req, res) => {
    try {
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }

      if (items.length === 0) {
        return res.status(400).json({ message: "Order must have at least one item" });
      }

      // Get the current order to verify ownership
      const currentOrder = await storage.getOrder(req.params.id);
      if (!currentOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Validate each item and recalculate prices from menu items
      const validatedItems = [];
      let totalAmount = 0;

      for (const item of items) {
        if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({ message: "Invalid item: missing menuItemId or invalid quantity" });
        }

        // Fetch the canonical menu item to get the actual price
        const menuItem = await storage.getMenuItem(item.menuItemId);
        if (!menuItem) {
          return res.status(400).json({ message: `Menu item ${item.menuItemId} not found` });
        }

        // Use the canonical price from the database, not client-provided price
        const itemPrice = parseFloat(menuItem.price);
        const itemTotal = itemPrice * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
        });
      }

      const order = await storage.updateOrderItems(
        req.params.id, 
        validatedItems, 
        totalAmount.toFixed(2)
      );
      
      if (!order) {
        return res.status(500).json({ message: "Failed to update order" });
      }

      // Broadcast update to vendor's connected clients
      broadcastToVendor(order.vendorId, {
        type: 'ORDER_UPDATE',
        order,
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update order items" });
    }
  });

  app.get("/api/orders/:vendorId/archived", async (req, res) => {
    try {
      const allOrders = await storage.getOrders(req.params.vendorId, true);
      const archivedOrders = allOrders.filter(order => order.archived);
      res.json(archivedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch archived orders" });
    }
  });

  // Bill Routes
  app.get("/api/bills/:orderId", async (req, res) => {
    try {
      const bill = await storage.getBillByOrderId(req.params.orderId);
      
      if (!bill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      res.json(bill);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch bill" });
    }
  });

  // Chat Routes
  app.get("/api/chat/:vendorId", async (req, res) => {
    try {
      const { orderId } = req.query;
      
      // Require orderId to prevent accessing all vendor messages
      if (!orderId) {
        return res.status(400).json({ 
          message: "orderId is required to access chat messages" 
        });
      }
      
      const messages = await storage.getChatMessages(
        req.params.vendorId,
        orderId as string
      );
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const data = insertChatMessageSchema.parse(req.body);
      
      // Validate that the order exists before allowing chat
      if (data.orderId) {
        const order = await storage.getOrder(data.orderId);
        if (!order || order.vendorId !== data.vendorId) {
          return res.status(404).json({ message: "Order not found" });
        }
      } else {
        return res.status(400).json({ message: "orderId is required for chat" });
      }
      
      const message = await storage.createChatMessage(data);

      // Broadcast new message to vendor via WebSocket
      broadcastToVendor(data.vendorId, {
        type: 'NEW_MESSAGE',
        message,
      });

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to send message" });
    }
  });

  app.patch("/api/chat/:vendorId/read", async (req, res) => {
    try {
      const { orderId } = req.query;
      
      // Require orderId for security (only mark specific conversation as read)
      if (!orderId) {
        return res.status(400).json({ message: "orderId is required" });
      }
      
      await storage.markMessagesAsRead(
        req.params.vendorId,
        orderId as string
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to mark messages as read" });
    }
  });

  app.get("/api/chat/:vendorId/unread-count", async (req, res) => {
    try {
      const count = await storage.getUnreadCount(req.params.vendorId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get unread count" });
    }
  });

  // File Upload Routes
  app.get("/api/uploads/:vendorId", async (req, res) => {
    try {
      // Check if vendor is a waiter (waiters cannot manage file uploads)
      const vendorInfo = await getOwnerIdForVendor(req.params.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage file uploads" });
      }
      
      const uploads = await storage.getFileUploads(req.params.vendorId);
      res.json(uploads);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch uploads" });
    }
  });

  app.post("/api/uploads", async (req, res) => {
    try {
      const data = insertFileUploadSchema.parse(req.body);
      
      // Check if vendor is a waiter (waiters cannot manage file uploads)
      const vendorInfo = await getOwnerIdForVendor(data.vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can manage file uploads" });
      }
      
      const upload = await storage.createFileUpload(data);
      res.json(upload);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create upload record" });
    }
  });

  // CSV Import Route
  app.post("/api/menu/import-csv", async (req, res) => {
    try {
      const { vendorId, csvData, uploadId } = req.body;

      if (!csvData || !vendorId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if vendor is a waiter (waiters cannot manage menu)
      const vendorInfo = await getOwnerIdForVendor(vendorId);
      if (!vendorInfo || vendorInfo.isWaiter) {
        return res.status(403).json({ message: "Only owners can import menu items" });
      }

      // Parse CSV data using Papa Parse
      const parsed = Papa.parse(csvData.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.toLowerCase().trim(),
      });

      const items: InsertMenuItem[] = [];
      const errors: string[] = [];

      parsed.data.forEach((row: any, index: number) => {
        try {
          // Map CSV columns to menu item schema
          const item: InsertMenuItem = {
            vendorId,
            name: row.name || row.item || row['dish name'] || '',
            description: row.description || row.desc || '',
            price: row.price || '0',
            category: row.category || row.type || 'Other',
            imageUrl: row.image || row.imageurl || row['image url'] || undefined,
            isAvailable: row.available !== 'false' && row.available !== '0',
            dietaryTags: row.tags ? row.tags.split('|').map((t: string) => t.trim()) : [],
            importSource: 'csv'
          };

          // Validate required fields
          if (!item.name || !item.price) {
            errors.push(`Row ${index + 2}: Missing name or price`);
            return;
          }

          // Validate price format
          if (!/^\d+(\.\d{1,2})?$/.test(item.price)) {
            errors.push(`Row ${index + 2}: Invalid price format`);
            return;
          }

          items.push(item);
        } catch (error: any) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      });

      // Check for Papa Parse errors
      if (parsed.errors && parsed.errors.length > 0) {
        parsed.errors.forEach((err: any) => {
          errors.push(`CSV Parse Error (Row ${err.row}): ${err.message}`);
        });
      }

      // Bulk insert items
      const createdItems = await storage.bulkCreateMenuItems(items);

      // Update upload status
      if (uploadId) {
        await storage.updateFileUploadStatus(
          uploadId,
          'completed',
          createdItems.length,
          errors.length > 0 ? errors.join('; ') : undefined
        );
      }

      res.json({
        success: true,
        itemsImported: createdItems.length,
        totalRows: parsed.data.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to import CSV" });
    }
  });

  return httpServer;
}
