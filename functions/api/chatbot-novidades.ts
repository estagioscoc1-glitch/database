// functions/api/chatbot-novidades.ts
//
// Cloudflare Pages Function que consulta o Supabase do chatbot de atendimento
// (feito no Lovable - atendimento-colegiooswaldocruz.lovable.app) e informa
// se existem conversas com mensagens novas ainda não lidas pelo admin.
//
// Segue o mesmo padrão da function "site-visitas.ts" (Cloudflare Analytics):
// as credenciais NUNCA ficam no código, apenas em variáveis de ambiente
// configuradas no painel do Cloudflare Pages do Portal.
//
// Variáveis de ambiente necessárias (configurar em Cloudflare Pages > Settings > Environment variables):
//   CHATBOT_SUPABASE_URL       -> https://xkbuxkurslwbzaujuimo.supabase.co
//   CHATBOT_SUPABASE_ANON_KEY  -> a anon key do projeto Supabase do chatbot
//
// Rota final: /api/chatbot-novidades
// Retorno (JSON):
// {
//   "ok": true,
//   "total_nao_lidas": 3,
//   "conversas": [
//     {
//       "id": "uuid",
//       "customer_name": "Maria Silva",
//       "whatsapp": "(62) 99999-9999",
//       "unread_count": 2,
//       "bot_paused": false,
//       "last_message_at": "2026-09-13T18:40:00.000Z"
//     }
//   ]
// }

interface Env {
  CHATBOT_SUPABASE_URL: string;
  CHATBOT_SUPABASE_ANON_KEY: string;
}

interface ConversaRow {
  id: string;
  customer_name: string;
  whatsapp: string;
  unread_count: number;
  bot_paused: boolean;
  last_message_at: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { CHATBOT_SUPABASE_URL, CHATBOT_SUPABASE_ANON_KEY } = context.env;

  // Cabeçalhos CORS básicos, para o Dashboard do Portal poder chamar essa rota
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  };

  if (!CHATBOT_SUPABASE_URL || !CHATBOT_SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "Variáveis de ambiente CHATBOT_SUPABASE_URL / CHATBOT_SUPABASE_ANON_KEY não configuradas no Cloudflare Pages.",
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    // Busca conversas com unread_count > 0, mais recentes primeiro.
    const query =
      `${CHATBOT_SUPABASE_URL}/rest/v1/conversations` +
      `?select=id,customer_name,whatsapp,unread_count,bot_paused,last_message_at` +
      `&unread_count=gt.0` +
      `&order=last_message_at.desc` +
      `&limit=50`;

    const supabaseResponse = await fetch(query, {
      headers: {
        apikey: CHATBOT_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CHATBOT_SUPABASE_ANON_KEY}`,
      },
    });

    if (!supabaseResponse.ok) {
      const detalhe = await supabaseResponse.text();

      // Erro comum enquanto o campo unread_count ainda não existe na tabela:
      // o Supabase retorna 400 reclamando da coluna. Deixamos essa mensagem
      // clara para facilitar o diagnóstico.
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Erro ao consultar o Supabase do chatbot. Verifique se a coluna 'unread_count' já existe na tabela 'conversations'.",
          detalhe,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const conversas = (await supabaseResponse.json()) as ConversaRow[];

    const totalNaoLidas = conversas.reduce(
      (soma, c) => soma + (c.unread_count || 0),
      0
    );

    return new Response(
      JSON.stringify({
        ok: true,
        total_nao_lidas: totalNaoLidas,
        conversas,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (erro) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Falha inesperada ao consultar o chatbot.",
        detalhe: erro instanceof Error ? erro.message : String(erro),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// Responde a requisições OPTIONS (preflight CORS), caso o navegador exija.
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

// redeploy trigger: aplicar variaveis de ambiente do chatbot
