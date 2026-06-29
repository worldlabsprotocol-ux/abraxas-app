import { redirect } from "next/navigation";

export const metadata = { title: "$ABRA Token — Abraxas" };

export default function TokenPage() {
  redirect("/tokenomics");
}
