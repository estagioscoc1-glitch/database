/**
 * VISITAS DO SITE INSTITUCIONAL — busca no Cloudflare Analytics.
 *
 * Mesma lógica do helper-bot: o Cloudflare não roda Express, roda uma
 * função isolada por endereço. Esta função pergunta à própria API do
 * Cloudflare "quantas pessoas visitaram colegiooswaldocruz.com.br nos
 * últimos dias" — o mesmo número que já aparece no painel do Cloudflare,
 * na aba Overview do domínio.
 *
 * O TOKEN NUNCA CHEGA AO NAVEGADOR. Ele mora só aqui, do lado do servidor,
 * lido de uma variável de ambiente — configurada em Cloudflare Pages →
 * Settings → Environment variables, não escrita em nenhum arquivo do
 * repositório.
 *
 * Variáveis de ambiente esperadas:
 *   CF_ANALYTICS_TOKEN   — o token criado com permissão Zone / Analytics / Read
 *   CF_ANALYTICS_ZONE_ID — o Zone ID de colegiooswaldocruz.com.br
 */

interface Env {
  CF_ANALYTICS_TOKEN?: string;
  CF_ANALYTICS_ZONE_ID?: string;
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function dataISO(diasAtras: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return d.toISOString().split('T')[0];
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const token = env.CF_ANALYTICS_TOKEN;
  const zoneId = env.CF_ANALYTICS_ZONE_ID;

  if (!token || !zoneId) {
    return json({
      erro: 'CF_ANALYTICS_TOKEN ou CF_ANALYTICS_ZONE_ID não configurados em Cloudflare Pages → Settings → Environment variables.',
    }, 200); // 200 de propósito — o Dashboard trata "erro" no corpo, sem quebrar a tela.
  }

  // Últimos 8 dias (hoje + 7 pra trás), pra dar pra desenhar uma linha, não só um número solto.
  const desde = dataISO(7);
  const ate = dataISO(0);

  const query = `
    query VisitasDoSite($zoneTag: String!, $desde: Date!, $ate: Date!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1dGroups(
            limit: 10
            filter: { date_geq: $desde, date_leq: $ate }
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            uniq { uniques }
            sum { requests, pageViews }
          }
        }
      }
    }
  `;

  try {
    const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { zoneTag: zoneId, desde, ate },
      }),
    });

    const dados: any = await resp.json();

    if (!resp.ok || dados.errors) {
      const msg = dados?.errors?.[0]?.message || `Cloudflare respondeu ${resp.status}.`;
      return json({ erro: msg }, 200);
    }

    const grupos = dados?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
    const porDia = grupos.map((g: any) => ({
      data: g.dimensions.date,
      visitantesUnicos: g.uniq?.uniques ?? 0,
      visualizacoesPagina: g.sum?.pageViews ?? 0,
      requisicoes: g.sum?.requests ?? 0,
    }));

    const hoje = porDia.find((d: any) => d.data === ate) ?? null;

    return json({ hoje, porDia });
  } catch (e: any) {
    return json({ erro: e?.message || 'Falha ao consultar o Cloudflare.' }, 200);
  }
};

export const onRequest: PagesFunction = async ({ request, next }) => {
  if (request.method !== 'GET') {
    return new Response('Método não permitido.', { status: 405 });
  }
  return next();
};
