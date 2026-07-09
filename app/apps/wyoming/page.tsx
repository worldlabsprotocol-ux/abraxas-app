import { redirect } from "next/navigation";

export default function WyomingAppPage() {
  redirect("/build?vertical=wyoming");
}
