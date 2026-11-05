// CONCEITO E RESULTADO DO ALUNO SÓ APARECEM DEPOIS DO CONSELHO DE CLASSE.
//
// Pedido da direção (05/11/2026): na tela do aluno, no módulo em que ele está
// estudando AGORA (e nas dependências do período atual), as colunas "Conceito"
// e "Resultado" ficam escondidas até depois do Conselho de Classe. As notas
// (S1, S2, AFC, EX, CS, PF) e as faltas continuam aparecendo normalmente.
// Os módulos que o aluno JÁ FINALIZOU (períodos anteriores ao atual) continuam
// mostrando tudo, porque o resultado deles já é definitivo.
//
// Quem decide o "depois do Conselho": a data do Conselho de Classe do
// Calendário Acadêmico (a mesma que o aluno vê no cartão "Calendário
// Acadêmico" e que a administração já troca a cada semestre no painel de
// datas). Passou o dia do Conselho => libera. A administração libera antes
// (ou adia) só mudando essa data no calendário.
//
// TRAVA CONTRA DATA ESQUECIDA: o calendário guarda UMA data de Conselho que a
// administração troca a cada semestre. Se ela esquecer de trocar, a data velha
// (ex.: 18/07 do 1º semestre) já passou e liberaria o resultado do semestre
// novo cedo demais. Por isso a data só vale se for do próprio semestre do
// período atual (mesmo ano; jan–jul = 1º semestre, ago–dez = 2º). Data de
// outro semestre, ou sem data nenhuma => continua escondido (nunca libera "no
// escuro"). Quando o período avança, o módulo antigo vira "finalizado" e
// aparece sozinho.

type EventoCalendario = { id?: string; title?: string; type?: unknown; date?: string };

const ehConselho = (e: EventoCalendario) =>
  e.id === 'cal_4' || (String(e.type) === 'INFO' && String(e.title ?? '').includes('Conselho'));

/** '2026/2' -> 20262 (ano*10 + semestre); null se não der para ler. */
export function numeroDoPeriodo(periodo: string | undefined | null): number | null {
  const m = /^(\d{4})\s*\/\s*(\d)/.exec(String(periodo ?? '').trim());
  return m ? Number(m[1]) * 10 + Number(m[2]) : null;
}

/** Semestre (ano*10 + 1 ou 2) a que uma data AAAA-MM-DD pertence: jan–jul = 1º, ago–dez = 2º. */
function semestreDaData(iso: string): number {
  const mes = Number(iso.slice(5, 7));
  return Number(iso.slice(0, 4)) * 10 + (mes <= 7 ? 1 : 2);
}

/**
 * Data (AAAA-MM-DD) do Conselho de Classe DESTE período, ou '' se o calendário
 * não tem uma data que pertença ao semestre do período atual.
 */
export function dataDoConselho(eventos: EventoCalendario[] | undefined | null, periodoAtual: string): string {
  const atual = numeroDoPeriodo(periodoAtual);
  const datas = (eventos ?? [])
    .filter(ehConselho)
    .map(e => String(e.date ?? ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}/.test(d))
    .map(d => d.slice(0, 10))
    .filter(d => atual === null || semestreDaData(d) === atual)
    .sort();
  // Se houver mais de uma que sirva, vale a mais tardia (o lado seguro: libera depois).
  return datas.length ? datas[datas.length - 1] : '';
}

/**
 * true  = pode mostrar Conceito e Resultado desta turma ao aluno.
 * false = esconder (módulo/dependência do período atual, antes do Conselho).
 * `hoje` no formato AAAA-MM-DD.
 */
export function resultadoLiberado(
  turma: { year: number; semester: number },
  periodoAtual: string,
  eventos: EventoCalendario[] | undefined | null,
  hoje: string
): boolean {
  const atual = numeroDoPeriodo(periodoAtual);
  // Sem período atual legível não dá para saber o que é "em andamento": mantém o comportamento antigo (mostra).
  if (atual === null) return true;
  // Período anterior ao atual = módulo já finalizado: resultado definitivo, aparece.
  if (turma.year * 10 + turma.semester < atual) return true;
  // Período em andamento: só depois do dia do Conselho de Classe.
  const conselho = dataDoConselho(eventos, periodoAtual);
  if (!conselho) return false;
  return String(hoje ?? '').slice(0, 10) > conselho;
}

/** '2026-12-21' -> '21/12/2026' (ou '' se vazio). */
export function dataBR(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '';
}

/** Texto do aviso que substitui as colunas (só cita a data quando ela é a do semestre atual). */
export function avisoResultadoConselho(eventos: EventoCalendario[] | undefined | null, periodoAtual: string): string {
  const d = dataBR(dataDoConselho(eventos, periodoAtual));
  return `Conceito e Resultado serão divulgados após o Conselho de Classe${d ? ` (${d})` : ''}.`;
}
