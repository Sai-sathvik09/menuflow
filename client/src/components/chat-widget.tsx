import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, InsertChatMessage } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  vendorId: string;
  orderId: string; // Required for security - scopes chat to specific order
  customerName: string;
  variant?: "floating" | "inline";
}

export function ChatWidget({ vendorId, orderId, customerName, variant = "floating" }: ChatWidgetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket for real-time chat updates
  useEffect(() => {
    if (!isOpen || !vendorId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?vendorId=${vendorId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Chat WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_MESSAGE') {
          // Refetch messages when new message arrives
          queryClient.invalidateQueries({ queryKey: ["/api/chat", vendorId, orderId] });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("Chat WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Chat WebSocket disconnected");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [isOpen, vendorId, orderId, queryClient]);

  // Fetch messages (orderId is required for security)
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", vendorId, orderId],
    enabled: isOpen && !!orderId,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (data: InsertChatMessage) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", vendorId, orderId] });
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || !orderId) return;

    sendMutation.mutate({
      vendorId,
      orderId,
      senderType: "customer",
      senderName: customerName,
      message: message.trim(),
      messageType: "order_inquiry",
      isRead: false,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (variant === "floating") {
    return (
      <>
        {!isOpen && (
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            onClick={() => setIsOpen(true)}
            data-testid="button-open-chat"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
        )}

        {isOpen && (
          <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
              <CardTitle className="text-lg">Chat with Vendor</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                data-testid="button-close-chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No messages yet. Start a conversation!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col gap-1",
                          msg.senderType === "customer" ? "items-end" : "items-start"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {msg.senderName}
                          </span>
                          {msg.messageType !== "text" && (
                            <Badge variant="outline" className="text-xs">
                              {msg.messageType.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "rounded-lg px-3 py-2 max-w-[80%]",
                            msg.senderType === "customer"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    data-testid="input-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // Inline variant
  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Customer Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                No messages yet
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1",
                    msg.senderType === "vendor" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {msg.senderName}
                    </span>
                    {msg.messageType !== "text" && (
                      <Badge variant="outline" className="text-xs">
                        {msg.messageType.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[80%]",
                      msg.senderType === "vendor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
