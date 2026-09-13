// ===========================================================================
//  CHATBOT DE ATENDIMENTO — MENSAGENS NOVAS
//
//  Chama a function do Cloudflare (functions/api/chatbot-novidades.ts), que
//  é quem de fato conversa com o Supabase do chatbot (projeto separado do
//  Portal, feito no Lovable). Aqui só existe a chamada e a tradução do
//  formato — nenhuma chave de acesso passa por este arquivo, porque ele
//  roda no navegador do usuário.
// ===========================================================================

export interface ConversaComNaoLidas {
  id: string;
  customer_name: string;
  whatsapp: string;
  unread_count: number;
  bot_paused: boolean;
  last_message_at: string;
  last_unread_at: string;
}

export interface ChatbotNovidades {
  totalNaoLidas: number;
  conversas: ConversaComNaoLidas[];
  erro?: string;
}

export async function buscarChatbotNovidades(): Promise<ChatbotNovidades> {
  try {
    const resp = await fetch('/api/chatbot-novidades');
    const dados = await resp.json();
    if (!dados.ok) {
      return { totalNaoLidas: 0, conversas: [], erro: dados.error || 'Não foi possível consultar o chatbot.' };
    }
    return {
      totalNaoLidas: dados.total_nao_lidas ?? 0,
      conversas: dados.conversas ?? [],
    };
  } catch (e: any) {
    return { totalNaoLidas: 0, conversas: [], erro: e?.message || 'Não foi possível conversar com o servidor.' };
  }
}
