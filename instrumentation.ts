export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { assertJudgeDemoBootContract } = await import("@/lib/judgeDemo/contract");
  assertJudgeDemoBootContract();
}
