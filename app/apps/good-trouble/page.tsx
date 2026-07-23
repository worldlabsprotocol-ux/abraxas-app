import { redirect } from "next/navigation";
import { GOOD_TROUBLE_INTEGRATION_PATH } from "@/lib/goodTrouble/constants";

export default function GoodTroubleAppPage() {
  redirect(GOOD_TROUBLE_INTEGRATION_PATH);
}
