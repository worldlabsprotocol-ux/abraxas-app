export function buildHolderTrustExecutionUrl(input: {
  origin: string;
  challengeId: string;
  deferExecution?: boolean;
}): string {
  const url = new URL("/partner/trust-execution", input.origin);
  url.searchParams.set("challenge_id", input.challengeId);
  if (input.deferExecution) url.searchParams.set("defer_execution", "1");
  return url.toString();
}
