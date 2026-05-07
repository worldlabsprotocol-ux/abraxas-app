// FILE: app/circuit/page.tsx
// Circuit is now embedded inside Vaults.
// This redirect prevents 404 on any bookmarked /circuit links.
import { redirect } from "next/navigation";
export default function CircuitRedirect() {
  redirect("/protect");
}