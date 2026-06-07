"use server";
export const authOptions = { providers: [], secret: process.env.NEXTAUTH_SECRET ?? "dev" };
