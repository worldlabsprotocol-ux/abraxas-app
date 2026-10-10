// FILE: lib/partner/goodTroublePartnerFlowBindingAttach.ts
// Attach HttpOnly Good Trouble purchase (gtv) and browse (gtb) flow-token bindings.

import type { NextResponse } from "next/server";
import { maybeAttachGoodTroubleGtbBindingFromReturnUrl } from "@/lib/partner/goodTroubleGtbBindingCookie";
import { maybeAttachGoodTroubleGtvBindingFromReturnUrl } from "@/lib/partner/goodTroubleGtvBindingCookie";

export async function maybeAttachGoodTroublePartnerFlowBindingsFromReturnUrl(
  res: NextResponse,
  verifyRequestId: string,
  returnUrl: string,
): Promise<void> {
  await maybeAttachGoodTroubleGtvBindingFromReturnUrl(res, verifyRequestId, returnUrl);
  await maybeAttachGoodTroubleGtbBindingFromReturnUrl(res, verifyRequestId, returnUrl);
}
