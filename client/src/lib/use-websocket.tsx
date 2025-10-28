import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { useToast } from "@/hooks/use-toast";

export function useWebSocket() {
  const { vendor } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!vendor?.id) return;

    // WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?vendorId=${vendor.id}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "NEW_ORDER") {
          // Invalidate orders query to fetch new data
          queryClient.invalidateQueries({ queryKey: ["/api/orders", vendor.id] });
          
          // Show toast notification
          toast({
            title: "New Order Received!",
            description: `Order #${data.order.orderNumber} has been placed`,
          });

          // Play a sound notification (optional)
          try {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {
              // Ignore if audio fails to play
            });
          } catch (error) {
            // Ignore audio errors
          }
        } else if (data.type === "ORDER_UPDATE") {
          // Invalidate orders query to fetch updated data
          queryClient.invalidateQueries({ queryKey: ["/api/orders", vendor.id] });
        } else if (data.type === "ORDER_ARCHIVED") {
          // Invalidate orders query to remove archived order from active view and refresh history
          queryClient.invalidateQueries({ queryKey: ["/api/orders", vendor.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders", vendor.id, "archived"] });
        } else if (data.type === "NEW_MESSAGE") {
          // Invalidate chat messages query to fetch new messages
          queryClient.invalidateQueries({ queryKey: ["/api/chat", vendor.id] });
          
          // Show toast notification for new message
          toast({
            title: "New Message",
            description: `${data.message.senderName}: ${data.message.message.substring(0, 50)}...`,
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [vendor?.id, queryClient, toast]);

  return wsRef.current;
}
