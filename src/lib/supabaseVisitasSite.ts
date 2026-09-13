// ===========================================================================
//  VISITAS DO SITE INSTITUCIONAL
//
//  Chama a function do Cloudflare (functions/api/site-visitas.ts), que é
//  quem de fato conversa com a API do Cloudflare Analytics. Aqui só existe
//  a chamada e a tradução do formato — nenhuma chave de acesso passa por
//  este arquivo, porque ele roda no navegador do usuário.
// ===========================================================================

export interface VisitasDoDia {
  data: string;
  visitantesUnicos: number;
  visualizacoesPagina: number;
  requisicoes: number;
}

export interface VisitasDoSite {
  hoje: VisitasDoDia | null;
  porDia: VisitasDoDia[];
  erro?: string;
}

export async function buscarVisitasDoSite(): Promise<VisitasDoSite> {
  try {
    const resp = await fetch('/api/site-visitas');
    const dados = await resp.json();
    return {
      hoje: dados.hoje ?? null,
      porDia: dados.porDia ?? [],
      erro: dados.erro,
    };
  } catch (e: any) {
    return { hoje: null, porDia: [], erro: e?.message || 'Não foi possível conversar com o servidor.' };
  }
}
