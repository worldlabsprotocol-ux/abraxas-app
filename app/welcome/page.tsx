import { WelcomeRouteContinuity } from "@/components/welcome/WelcomeRouteContinuity";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Welcome | Abraxas",
  description:
    "Start an authorized developer sandbox with passkey account access, or explore Abraxas verification without signing in.",
  path: "/welcome",
});

export default function WelcomePage() {
  return <WelcomeRouteContinuity />;
}
