"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Professional abstract avatar or brand image
const AVATAR_URL = "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=200&auto=format&fit=crop";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 flex flex-col transition-all duration-300 origin-bottom-right",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-4 pointer-events-none"
        )}
      >
        <Card className="w-[380px] h-[600px] flex flex-col overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-2xl rounded-2xl bg-white dark:bg-zinc-950">
          
          {/* Header - Minimalist */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-zinc-900 bg-white/50 backdrop-blur-sm z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-gray-100">
                <img src={AVATAR_URL} alt="AI" className="h-full w-full object-cover" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Sentinel</h3>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Your Intelligent Detective</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-transparent transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 bg-white dark:bg-zinc-950" ref={scrollRef}>
            <div className="p-5 flex flex-col gap-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center px-6 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-forwards">
                  <div className="h-16 w-16 mb-6 rounded-2xl overflow-hidden shadow-lg grayscale transition-all hover:grayscale-0">
                    <img src={AVATAR_URL} alt="Bot" className="h-full w-full object-cover" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Good Morning
                  </h3>
                  <p className="text-sm text-gray-500 font-light leading-relaxed max-w-[240px]">
                    I can assist you with student analytics, attendance records, and course data.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] px-5 py-3 text-sm font-light leading-relaxed shadow-sm",
                        message.role === "user"
                          ? "bg-black text-white rounded-2xl rounded-tr-sm dark:bg-white dark:text-black" // High contrast luxury
                          : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm dark:bg-zinc-900 dark:text-gray-300"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={cn(
                          "text-[10px] mt-2 opacity-50",
                          message.role === "user" ? "text-right" : "text-left"
                        )}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-5 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-900">
            <div className="relative flex items-center">
              <Input
                ref={inputRef}
                placeholder="Type your inquiry..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pr-12 py-6 bg-gray-50 dark:bg-zinc-900 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-gray-200 dark:focus-visible:ring-zinc-800 placeholder:text-gray-400 font-light"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="icon"
                className={cn(
                  "absolute right-2 h-8 w-8 rounded-lg transition-all",
                  input.trim() 
                   ? "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black" 
                   : "bg-transparent text-gray-300 hover:bg-transparent"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Toggle Button - Image Based */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 transition-transform duration-300 hover:scale-105 active:scale-95 group"
      >
        <div className="relative h-full w-full rounded-full overflow-hidden border-2 border-white dark:border-zinc-800">
            {/* The Image */}
            <img 
                src={AVATAR_URL} 
                alt="AI Chat" 
                className={cn(
                    "h-full w-full object-cover transition-opacity duration-300",
                    isOpen ? "opacity-0" : "opacity-100"
                )} 
            />
            
            {/* The X icon (shows when open) */}
            <div className={cn(
                "absolute inset-0 bg-black dark:bg-white flex items-center justify-center transition-opacity duration-300",
                isOpen ? "opacity-100" : "opacity-0"
            )}>
                <X className="h-6 w-6 text-white dark:text-black" />
            </div>
        </div>
      </button>
    </>
  );
}