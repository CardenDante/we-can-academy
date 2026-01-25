import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "@/auth.config";

type Role = "ADMIN" | "CASHIER" | "STAFF" | "SECURITY" | "TEACHER";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "mobile",
      name: "Mobile",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      authorize: async (credentials) => {
        console.log("[Auth] Mobile provider authorize called with userId:", credentials?.userId);

        if (!credentials?.userId) {
          console.log("[Auth] No userId provided");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId as string },
          select: {
            id: true,
            name: true,
            role: true,
            username: true,
          },
        });

        if (!user) {
          console.log("[Auth] User not found for userId:", credentials.userId);
          return null;
        }

        console.log("[Auth] Mobile auth successful for user:", user.username);

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log("[Auth] JWT callback:", {
        hasUser: !!user,
        trigger,
        tokenSub: token.sub,
        tokenId: token.id,
        tokenRole: token.role
      });

      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      // If token already has id and role (from mobile auth), preserve them
      if (token.id && token.role) {
        console.log("[Auth] Token already has id and role, preserving");
      }

      return token;
    },
    async session({ session, token }) {
      console.log("[Auth] Session callback:", {
        tokenId: token.id,
        tokenRole: token.role,
        sessionUser: session.user?.name
      });

      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  cookies: {
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});

export async function getUser() {
  const session = await auth();
  if (!session?.user) return undefined;
  return session.user as typeof session.user & { id: string; role: Role };
}
