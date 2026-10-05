// Área clara: fundo névoa, tinta verde-profunda.
export default function LayoutEntidade({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100svh] bg-nevoa text-fundo">{children}</div>;
}
