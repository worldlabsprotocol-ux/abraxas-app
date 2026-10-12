import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  V2_CLOSE_BODY,
  V2_CLOSE_HEADLINE,
  V2_HOME_CTA_BUILD_HREF,
} from "@/lib/home/v2HomeCopy";

export function InstitutionalHomeClose() {
  return (
    <section className="abx-home-close" aria-labelledby="home-close-heading">
      <h2 id="home-close-heading" className="abx-home-close__title">
        {V2_CLOSE_HEADLINE}
      </h2>
      <p className="abx-home-close__body">{V2_CLOSE_BODY}</p>
      <div className="abx-home-close__actions">
        <Btn href="/docs" variant="secondary" size="md">
          Developer documentation
        </Btn>
        <Btn href="/design-partner" variant="ghost" size="md">
          Partner application
        </Btn>
        <Link href={V2_HOME_CTA_BUILD_HREF} className="abx-home-close__text-link">
          Integration Studio
        </Link>
      </div>
    </section>
  );
}
