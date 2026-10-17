import { redirect } from "next/navigation";

export default function AccountPassportRedirect() {
  redirect("/passport?from=account");
}
