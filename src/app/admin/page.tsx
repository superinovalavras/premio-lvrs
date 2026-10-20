import { redirect } from "next/navigation";
import { INDICACAO_POR_INSTITUICAO } from "@/lib/edicao";

export default function Admin() {
  redirect(INDICACAO_POR_INSTITUICAO ? "/admin/entidades" : "/admin/indicacoes");
}
