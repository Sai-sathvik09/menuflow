// Referencing javascript_websocket blueprint integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertVendorSchema, 
  loginSchema, 
  insertMenuItemSchema,
  insertTableSchema,
  insertOrderSchema,
  insertChatMessageSchema,
  insertFileUploadSchema,
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

  wss.on('connection', (ws, req) => {
    const vendorId = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('vendorId');
    
    if (vendorId) {
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
      const item = await storage.createMenuItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create menu item" });
    }
  });

  app.patch("/api/menu/:id", async (req, res) => {
    try {
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
      await storage.deleteMenuItem(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to delete menu item" });
    }
  });

  // Table Routes
  app.get("/api/tables/:vendorId", async (req, res) => {
    try {
      const tables = await storage.getTables(req.params.vendorId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch tables" });
    }
  });

  app.post("/api/tables", async (req, res) => {
    try {
      const data = insertTableSchema.parse(req.body);
      
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
      
      // Normalize empty string tableId to null
      const normalizedData = {
        ...data,
        tableId: data.tableId && data.tableId.trim() !== '' ? data.tableId : null,
      };
      
      // Validate tableId if provided
      if (normalizedData.tableId) {
        const table = await storage.getTable(normalizedData.tableId);
        if (!table) {
          return res.status(400).json({ message: "Invalid table - table does not exist" });
        }
        if (table.vendorId !== normalizedData.vendorId) {
          return res.status(400).json({ message: "Invalid table - table does not belong to this vendor" });
        }
      }
      
      // Get next order number
      const orderNumber = await storage.getNextOrderNumber(normalizedData.vendorId);
      
      const order = await storage.createOrder({ ...normalizedData, orderNumber });
      
      // Broadcast new order to vendor's connected clients
      broadcastToVendor(normalizedData.vendorId, {
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

  app.get("/api/orders/:vendorId/archived", async (req, res) => {
    try {
      const allOrders = await storage.getOrders(req.params.vendorId, true);
      const archivedOrders = allOrders.filter(order => order.archived);
      res.json(archivedOrders);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch archived orders" });
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
      const uploads = await storage.getFileUploads(req.params.vendorId);
      res.json(uploads);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch uploads" });
    }
  });

  app.post("/api/uploads", async (req, res) => {
    try {
      const data = insertFileUploadSchema.parse(req.body);
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
