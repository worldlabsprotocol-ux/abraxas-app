import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Public Verifier · Abraxas",
  description: "Test registry lookup and relying-party credential verification — same APIs partners integrate.",
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
