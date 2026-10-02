// FILE: app/demo/reference-publisher/layout.tsx
// Independent publisher shell — not Abraxas product chrome.

export default function ReferencePublisherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="light"
      style={{
        minHeight: "100vh",
        background: "#faf9f7",
        color: "#1c1917",
        fontFamily: "'Georgia', 'Iowan Old Style', 'Palatino Linotype', serif",
      }}
    >
      {children}
    </div>
  );
}
