# Prêmio Lavras de Inovação 2026

Landing page e votação popular do prêmio, na identidade LVRS+ (Pacto Lavras pela Inovação). Next.js 16 (App Router) + Tailwind 4 + Framer Motion,
Supabase no banco, Vercel na hospedagem.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencher
npm run dev
```

Pela raiz do workspace também há o preview `premio` em `.claude/launch.json`.

Sem Supabase configurado a página funciona com três finalistas de exemplo e a API responde 503.
Para testar o formulário fora do prazo, use `NEXT_PUBLIC_VOTACAO_PREVIEW=1` e `VOTACAO_FORCAR_ABERTA=1`
(só em desenvolvimento; o banco tem trava própria em `vote_window`).

## Onde mexer

| O quê | Arquivo |
|---|---|
| Datas, eixos, categorias, cronograma, documentos | `src/lib/data.ts` |
| Regras do eleitor (idade, CPF, vínculo) | `src/lib/voto.ts` |
| Cores e fontes da marca LVRS+ (ver `../marca/README.md`) | `src/app/globals.css` |
| "+" da marca e arcos concêntricos | `src/components/marca.tsx` |
| Logos (Prefeitura, LVRS+, Vale dos Ipês) | `public/marca/` |
| Rota de voto | `src/app/api/votar/route.ts` |
| Esquema, RLS, `cast_vote`, `compute_results` | `supabase/migrations/0001_premio.sql` |
| PDFs (Regulamento, Anexo IV) | colocar em `public/docs/` e preencher `href` em `DOCUMENTOS` |

## Como o voto é protegido

1. O navegador envia os dados para `/api/votar` (nunca direto ao Supabase).
2. O servidor revalida tudo (zod), confere o Turnstile e a janela 06–11/11/2026.
3. O CPF vira **HMAC-SHA256** com `CPF_HASH_SECRET`. SHA-256 puro seria reversível por força
   bruta (há só ~10⁹ CPFs possíveis); com o segredo, não. O CPF em claro não é gravado.
4. `cast_vote()` (security definer, só `service_role`) confere janela, categoria e idade e grava.
   A unicidade `(category_id, cpf_hash)` garante 1 voto por CPF.
5. A chave anon só lê `categories` e a view `public_finalists` (sem `technical_score`).
   Não existe consulta pública de contagem — nenhuma resposta da API traz placar.

Guarda-se a **idade**, não a data de nascimento (minimização LGPD).

## Apuração

Só com a chave `service_role` (SQL editor do Supabase):

```sql
select * from compute_results((select id from categories where has_popular_vote));
```

Nota final = 80% técnica + 20% popular normalizada. **Normalização adotada: votos ÷ votos do
mais votado × 100** — confirmar com o texto do regulamento. Trava: se o 1º técnico abre 10 pontos
ou mais sobre o 2º, ele fica em 1º independentemente do voto popular.

## Pendências de conteúdo

- Finalistas (cadastrar em `finalists` com `technical_score` e `image_url`).
- PDFs do Regulamento e do Anexo IV.
- Datas de inscrição, avaliação e divulgação dos finalistas (`CRONOGRAMA`).
- Horário da cerimônia (o contador usa 19h, provisório — `CERIMONIA`).
- Chaves do Turnstile e do Supabase na Vercel.
