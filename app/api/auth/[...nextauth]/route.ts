// FILE: app/api/auth/[...nextauth]/route.ts
// NextAuth catch-all route. All imports at top.
import NextAuth    from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };