import { AccountAccessFirstPaint } from "@/components/product/AccountAccessFirstPaint";

export default function IdentityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AccountAccessFirstPaint />
      {children}
    </>
  );
}
