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
// Como o Lovable calcula "não lida" (confirmado por ele, não é coluna física):
//   - A tabela "messages" tem uma coluna real is_read (boolean, default false).
//   - Uma mensagem do cliente conta como não lida quando role = 'customer' e is_read = false.
//   - O painel admin do Lovable (adminListConversations) conta essas mensagens
//     agrupando por conversation_id para montar o "unread_count" que aparece na tela.
//   - Ao abrir a conversa, o Lovable marca essas mensagens como is_read = true
//     (adminGetConversation), zerando o contador.
// Esta function reproduz a mesma lógica: busca as mensagens não lidas do cliente,
// agrupa por conversa e junta os dados da conversa (nome, whatsapp, etc).
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
//       "last_message_at": "2026-09-13T18:40:00.000Z",
//       "last_unread_at": "2026-09-13T18:41:00.000Z"
//     }
//   ]
// }

interface Env {
  CHATBOT_SUPABASE_URL: string;
  CHATBOT_SUPABASE_ANON_KEY: string;
}

interface UnreadMessageRow {
  conversation_id: string;
  created_at: string;
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

  const authHeaders = {
    apikey: CHATBOT_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${CHATBOT_SUPABASE_ANON_KEY}`,
  };

  try {
    // 1) Busca as mensagens do cliente ainda não lidas (messages.is_read = false).
    const mensagensQuery =
      `${CHATBOT_SUPABASE_URL}/rest/v1/messages` +
      `?select=conversation_id,created_at` +
      `&role=eq.customer` +
      `&is_read=eq.false` +
      `&order=created_at.desc` +
      `&limit=500`;

    const mensagensResponse = await fetch(mensagensQuery, { headers: authHeaders });

    if (!mensagensResponse.ok) {
      const detalhe = await mensagensResponse.text();
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "Erro ao consultar mensagens não lidas no Supabase do chatbot.",
          detalhe,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const mensagensNaoLidas = (await mensagensResponse.json()) as UnreadMessageRow[];

    // Nenhuma mensagem não lida: retorna lista vazia sem precisar consultar conversas.
    if (mensagensNaoLidas.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, total_nao_lidas: 0, conversas: [] }),
        { status: 200, headers: corsHeaders }
      );
    }

    // 2) Agrupa as mensagens por conversa: conta quantas e guarda a mais recente.
    const contagemPorConversa = new Map<string, { count: number; lastUnreadAt: string }>();
    for (const msg of mensagensNaoLidas) {
      const atual = contagemPorConversa.get(msg.conversation_id);
      if (!atual) {
        contagemPorConversa.set(msg.conversation_id, { count: 1, lastUnreadAt: msg.created_at });
      } else {
        atual.count += 1;
        // a lista já vem ordenada created_at desc, então o primeiro valor visto é o mais recente
      }
    }

    const idsComNaoLidas = Array.from(contagemPorConversa.keys());

    // 3) Busca os dados dessas conversas (nome, whatsapp, etc).
    const idsFiltro = idsComNaoLidas.map((id) => `"${id}"`).join(",");
    const conversasQuery =
      `${CHATBOT_SUPABASE_URL}/rest/v1/conversations` +
      `?select=id,customer_name,whatsapp,bot_paused,last_message_at` +
      `&id=in.(${idsFiltro})` +
      `&order=last_message_at.desc`;

    const conversasResponse = await fetch(conversasQuery, { headers: authHeaders });

    if (!conversasResponse.ok) {
      const detalhe = await conversasResponse.text();
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Erro ao consultar dados das conversas no Supabase do chatbot.",
          detalhe,
        }),
        { status: 502, headers: corsHeaders }
      );
    }

    const conversas = (await conversasResponse.json()) as ConversationRow[];

    // 4) Junta contagem de não lidas com os dados da conversa.
    const conversasComNaoLidas: ConversaComNaoLidas[] = conversas.map((c) => {
      const info = contagemPorConversa.get(c.id)!;
      return {
        id: c.id,
        customer_name: c.customer_name,
        whatsapp: c.whatsapp,
        unread_count: info.count,
        bot_paused: c.bot_paused,
        last_message_at: c.last_message_at,
        last_unread_at: info.lastUnreadAt,
      };
    });

    // Reordena pela mensagem não lida mais recente primeiro.
    conversasComNaoLidas.sort((a, b) => (a.last_unread_at < b.last_unread_at ? 1 : -1));

    return new Response(
      JSON.stringify({
        ok: true,
        total_nao_lidas: mensagensNaoLidas.length,
        conversas: conversasComNaoLidas,
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
