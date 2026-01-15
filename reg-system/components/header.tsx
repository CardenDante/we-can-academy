"use client";

import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export function Header({ user }: { user: { name: string; role: string } }) {
  // Generate initials for the avatar circle
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Left: Brand (Typography Only) */}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold leading-none tracking-tight text-foreground">
            We Can Academy
          </h1>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Enroll | Manage 
          </p>
        </div>

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-6">
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold leading-none text-foreground">
                {user.name}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {user.role}
              </span>
            </div>
            
            <div className="h-9 w-9 rounded-full bg-muted border border-border flex items-center justify-center">
              <span className="text-xs font-bold text-foreground">
                {initials}
              </span>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="h-8 w-[1px] bg-border/60" />

          {/* Sign Out Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="font-medium">Sign Out</span>
          </Button>

        </div>
      </div>
    </header>
  );
}