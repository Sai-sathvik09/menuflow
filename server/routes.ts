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
  type Order 
} from "@shared/schema";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time order notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active vendor connections
  const vendorConnections = new Map<string, WebSocket[]>();

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
      
      // Get next order number
      const orderNumber = await storage.getNextOrderNumber(data.vendorId);
      
      const order = await storage.createOrder({ ...data, orderNumber });
      
      // Broadcast new order to vendor's connected clients
      broadcastToVendor(data.vendorId, {
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

      const order = await storage.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Broadcast status update to vendor's connected clients
      broadcastToVendor(order.vendorId, {
        type: 'ORDER_UPDATE',
        order,
      });

      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update order status" });
    }
  });

  return httpServer;
}
