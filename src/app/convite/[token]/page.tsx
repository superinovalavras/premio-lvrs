import { redirect } from "next/navigation";

// Endereço antigo do convite: o link pessoal agora mora em /conselho/<token>.
export default async function ConviteAntigo({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  redirect(`/conselho/${token}`);
}
