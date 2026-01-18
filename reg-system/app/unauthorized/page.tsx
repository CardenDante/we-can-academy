import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default async function UnauthorizedPage() {
  const user = await getUser();

  // If not logged in, redirect to login
  if (!user) {
    redirect("/login");
  }

  // Get user's home page based on role
  const homeUrl = getRoleHomePage(user.role);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="luxury-card border-0">
          <CardHeader className="space-y-4 pb-6 pt-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-light tracking-tight">
                Access Denied
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                You don't have permission to access this page
              </p>
            </div>
          </CardHeader>
          <CardContent className="pb-8 text-center space-y-4">
            <div className="p-4 bg-muted/50 rounded">
              <p className="text-sm text-muted-foreground">
                Your role: <span className="font-medium text-foreground">{user.role}</span>
              </p>
            </div>
            <Link href={homeUrl}>
              <Button className="w-full btn-luxury">
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getRoleHomePage(role: string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CASHIER":
      return "/cashier";
    case "STAFF":
      return "/staff";
    case "SECURITY":
      return "/security";
    default:
      return "/login";
  }
}
