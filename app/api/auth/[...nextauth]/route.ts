import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

/**
 * App Router-compatible NextAuth handler.
 * Both GET and POST are required — GET for the sign-in page renders,
 * POST for callback exchanges.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
