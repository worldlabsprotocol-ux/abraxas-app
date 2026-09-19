// FILE: app/judge-demo/page.tsx
import { notFound, redirect } from "next/navigation";
import { isJudgeDemoRequested } from "@/lib/judgeDemo/contract";
import { isPublicDemoRuntime } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

export default function PublicDemoIndexPage() {
  if (!isJudgeDemoRequested() || !isPublicDemoRuntime()) {
    notFound();
  }
  redirect("/");
}
