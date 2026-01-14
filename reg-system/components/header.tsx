"use client";

import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { LogOut, GraduationCap } from "lucide-react";

export function Header({ user }: { user: { name: string; role: string } }) {
  return (
    <header className="glass-effect border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-light tracking-tight text-foreground">
                We Can Academy
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground font-light">
                  {user.name}
                </p>
                <span className="text-muted-foreground">·</span>
                <Badge variant="outline" className="text-xs font-medium">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-luxury hover:bg-black/5"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-medium">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
