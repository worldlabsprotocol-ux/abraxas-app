// FILE: components/seo/JsonLd.tsx
// FAQ schema for AEO / rich results.

import type { AeoFaqItem } from "@/lib/categoryInfrastructure";

export function JsonLdFaq({ faq }: { faq: AeoFaqItem[] }) {
  if (faq.length === 0) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
