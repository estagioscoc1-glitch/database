// functions/api/chatbot-novidades.ts
//
// Cloudflare Pages Function que consulta o Supabase do chatbot de atendimento
// (feito no Lovable - atendimento-colegiooswaldocruz.lovable.app) e mostra
// as conversas com atividade recente.
//
// MUDANÇA IMPORTANTE: a versão anterior contava "mensagens do cliente ainda
// não lidas" (messages.is_read = false, role = 'customer'). Isso nunca
// funcionava de verdade porque o BOT responde toda mensagem automaticamente
// — então, do jeito que o Lovable trata leitura, a conversa nunca fica
// "esperando resposta humana" por tempo suficiente pra aparecer aqui, e o
// indicador sempre mostrava 0 mesmo com dezenas de conversas acontecendo.
//
// Agora o indicador é outra coisa, mais simples e que não depende de bot
// nem de campo de leitura nenhum: CONVERSAS COM MENSAGEM NAS ÚLTIMAS 24H,
// direto da tabela "conversations" (last_message_at). Mostra atividade de
// verdade — quantas pessoas estão conversando com o chatbot agora — sem
// presumir nada sobre is_read ou role, que dependiam de suposições que não
// bateram com o funcionamento real do bot.
//
// Variáveis de ambiente necessárias (configurar em Cloudflare Pages > Settings > Environment variables):
//   CHATBOT_SUPABASE_URL       -> https://xkbuxkurslwbzaujuimo.supabase.co
//   CHATBOT_SUPABASE_ANON_KEY  -> a anon key do projeto Supabase do chatbot
//
// Rota final: /api/chatbot-novidades
// Retorno (JSON):
// {
//   "ok": true,
//   "total_nao_lidas": 3,            <- agora significa "conversas nas últimas 24h"
//   "conversas": [
//     {
//       "id": "uuid",
//       "customer_name": "Maria Silva",
//       "whatsapp": "(62) 99999-9999",
//       "unread_count": 1,           <- sempre 1 aqui (marca "teve atividade"), não é mais contagem de mensagem
//       "bot_paused": false,
//       "last_message_at": "2026-09-13T18:40:00.000Z",
//       "last_unread_at": "2026-09-13T18:40:00.000Z"
//     }
//   ]
// }

interface Env {
  CHATBOT_SUPABASE_URL: string;
  CHATBOT_SUPABASE_ANON_KEY: string;
}

interface ConversationRow {
  id: string;
  customer_name: string;
  whatsapp: string;
  bot_paused: boolean;
  last_message_at: string;
}

interface ConversaComNaoLidas {
  id: string;
  customer_name: string;
  whatsapp: string;
  unread_count: number;
  bot_paused: boolean;
  last_message_at: string;
  last_unread_at: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { CHATBOT_SUPABASE_URL, CHATBOT_SUPABASE_ANON_KEY } = context.env;

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

  const authHeaders = {
    apikey: CHATBOT_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${CHATBOT_SUPABASE_ANON_KEY}`,
  };

  try {
    const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Direto na tabela de conversas — sem depender de "is_read" nem "role",
    // que não refletiam a realidade do bot respondendo tudo sozinho.
    const conversasQuery =
      `${CHATBOT_SUPABASE_URL}/rest/v1/conversations` +
      `?select=id,customer_name,whatsapp,bot_paused,last_message_at` +
      `&last_message_at=gte.${desde24h}` +
      `&order=last_message_at.desc` +
      `&limit=100`;

    const conversasResponse = await fetch(conversasQuery, { headers: authHeaders });

    if (!conversasResponse.ok) {
      const detalhe = await conversasResponse.text();
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Erro ao consultar conversas recentes no Supabase do chatbot.",
          detalhe,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const conversas = (await conversasResponse.json()) as ConversationRow[];

    const conversasFormatadas: ConversaComNaoLidas[] = conversas.map((c) => ({
      id: c.id,
      customer_name: c.customer_name,
      whatsapp: c.whatsapp,
      unread_count: 1,
      bot_paused: c.bot_paused,
      last_message_at: c.last_message_at,
      last_unread_at: c.last_message_at,
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        total_nao_lidas: conversasFormatadas.length,
        conversas: conversasFormatadas,
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
