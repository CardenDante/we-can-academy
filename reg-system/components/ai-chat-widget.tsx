"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Placeholder image for a luxury/professional feel.
// Replace this with your actual brand image or assistant portrait.
const BRAND_IMAGE_URL = "https://images.unsplash.com/photo-1507081323647-4d250478b919?q=80&w=100&auto=format&fit=crop";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "Enrollment analytics",
  "Attendance trends",
  "Course performance",
];

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate network delay for the "luxury" slow feel
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        // --- REPLACE WITH YOUR ACTUAL API CALL ---
        // const response = await fetch("/api/admin/ai-chat", { ... });
        // const data = await response.json();
        // const responseText = data.response;
        
        // Mock response for demonstration
        const responseText = "Based on the current data, enrollment is up by 12% compared to last semester. The 'Advanced Analytics' course currently holds the highest attendance record.";
        // -----------------------------------------

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
        const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "We encountered an issue retrieving that information. Please try again.",
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => sendMessage(input);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 flex flex-col transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) origin-bottom-right",
          isOpen 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-95 translate-y-8 pointer-events-none"
        )}
      >
        <Card className="w-[400px] h-[650px] shadow-[0_20px_70px_rgba(0,0,0,0.15)] border-0 flex flex-col overflow-hidden rounded-[30px] bg-stone-50 dark:bg-zinc-900">
          {/* Minimal Header */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between bg-transparent z-10">
            <div>
                <h3 className="font-medium text-xl tracking-wide text-stone-900 dark:text-stone-100">Concierge</h3>
                <p className="text-sm text-stone-500 font-light tracking-wider mt-1">Data Assistant</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-10 w-10 rounded-full hover:bg-stone-200/50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <X className="h-5 w-5 text-stone-600 dark:text-stone-300" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 -mt-4" ref={scrollRef}>
            <div className="px-6 py-8 flex flex-col gap-8 min-h-full">
              {messages.length === 0 ? (
                <div className="flex flex-col justify-center flex-1 h-full px-6 space-y-12">
                  <div className="space-y-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg mx-auto grayscale contrast-125">
                        <img src={BRAND_IMAGE_URL} alt="Assistant" className="h-full w-full object-cover" />
                    </div>
                    <h3 className="text-2xl font-light text-center text-stone-800 dark:text-stone-100 tracking-wide leading-relaxed">
                      How may I assist with your data today?
                    </h3>
                  </div>
                  
                  <div className="grid gap-3 pt-4 px-4">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        className="text-sm font-light tracking-wide text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-all py-3 border-b border-stone-200 dark:border-zinc-800 text-left flex items-center group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-300 group-hover:bg-stone-900 dark:group-hover:bg-stone-100 mr-4 transition-colors"></span>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 pt-4">
                  {messages.map((message, index) => {
                    // Only show avatar if it's the first message in a sequence from the assistant
                    const showAvatar = message.role === "assistant" && (index === 0 || messages[index - 1].role === "user");

                    return (
                    <div
                      key={message.id}
                      className={`flex flex-col ${
                        message.role === "user" ? "items-end" : "items-start"
                      } ${message.role === "assistant" && !showAvatar ? "ml-12" : ""}`}
                    >
                      {showAvatar && (
                         <div className="h-8 w-8 mb-3 rounded-full overflow-hidden shadow-sm grayscale contrast-125 flex-shrink-0">
                            <img src={BRAND_IMAGE_URL} alt="Assistant" className="h-full w-full object-cover" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-[85%] text-base font-light leading-7 tracking-wide",
                          message.role === "user"
                            ? "text-stone-900 dark:text-stone-100 bg-stone-200/50 dark:bg-zinc-800 px-5 py-3 rounded-[20px] rounded-tr-md" // Minimalist bubble for user
                            : "text-stone-800 dark:text-stone-300 pl-1" // No bubble for assistant, just text
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                       {/* Timestamp - very subtle */}
                       <p className={cn("text-[10px] text-stone-400 mt-2 tracking-wider", message.role === 'user' ? "mr-2" : "ml-1")}>
                            {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}).toLowerCase()}
                        </p>
                    </div>
                  )})}
                  
                  {isLoading && (
                    <div className="flex items-center gap-4 ml-1">
                         <div className="h-6 w-6 rounded-full overflow-hidden shadow-sm grayscale contrast-125 flex-shrink-0 opacity-60">
                            <img src={BRAND_IMAGE_URL} alt="Thinking" className="h-full w-full object-cover" />
                        </div>
                       <div className="flex items-center gap-1">
                        {/* A single, slowly pulsing luxury dot instead of bouncy balls */}
                        <span className="w-2 h-2 bg-stone-400 dark:bg-stone-600 rounded-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Minimal Input Area */}
          <div className="p-6 bg-transparent">
            <div className="flex items-center gap-2 w-full relative bg-white dark:bg-zinc-800 rounded-full px-4 py-2 shadow-sm border-stone-100 dark:border-zinc-700 border">
              <Input
                ref={inputRef}
                placeholder="Write a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                className="flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent text-base font-light placeholder:text-stone-400 text-stone-900 dark:text-stone-100 h-12 tracking-wide"
              />
              <Button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full transition-all duration-300 shrink-0",
                  input.trim() 
                    ? "bg-stone-900 hover:bg-stone-800 text-stone-50 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900" 
                    : "bg-stone-100 text-stone-300 dark:bg-zinc-700 dark:text-zinc-500"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                ) : (
                  <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Luxury Toggle Button with Image */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105 overflow-hidden border-2 border-white dark:border-zinc-800",
          isOpen ? "rotate-0" : ""
        )}
        aria-label="Toggle chat"
      >
        <div className={cn("absolute inset-0 bg-stone-900 transition-opacity duration-500 flex items-center justify-center", isOpen ? "opacity-100" : "opacity-0")}>
             <X className="h-6 w-6 text-white" strokeWidth={1.5} />
        </div>
        <div className={cn("absolute inset-0 transition-all duration-500 grayscale contrast-125", isOpen ? "opacity-0 scale-110" : "opacity-100 scale-100")}>
            <img src={BRAND_IMAGE_URL} alt="Chat" className="h-full w-full object-cover" />
        </div>
      </button>
    </>
  );
}