// FILE: app/page.tsx
// The loading-gate landing page is gone. Its actual content (How It
// Works, asset types) now lives inside /terminal directly, where
// people are already browsing, instead of behind a separate page
// almost nobody scrolled through to see.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/terminal");
}
