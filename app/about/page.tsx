// FILE: app/about/page.tsx
import type { Metadata } from "next";
import { AboutPageView } from "./AboutPageView";

export const metadata: Metadata = {
  title: "About Abraxas",
  description:
    "Where assets become collateral. A plain English explainer of Abraxas Protocol, the verification and collateral intelligence layer for real world assets.",
};

export default function AboutPage() {
  return <AboutPageView />;
}
