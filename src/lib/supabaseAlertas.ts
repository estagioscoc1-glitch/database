import { supabase, supabaseConfigurado } from './supabase';

// ===========================================================================
//  CENTRAL DE ALERTAS
//
//  Avisos que chegam dos outros ambientes da escola — matrícula online,
//  chatbot, site — e caem numa tabela só. Aqui ficam a leitura, a marcação
//  de lido e a escuta em tempo real.
// ===========================================================================

export type OrigemAlerta = 'MATRICULA' | 'CHATBOT' | 'SITE' | 'PORTAL';

export interface Alerta {
  id: string;
  origem: OrigemAlerta;
  titulo: string;
  detalhe?: string;
  link?: string;
  lido: boolean;
  criadoEm: string;
}

const daLinha = (a: any): Alerta => ({
  id: a.id,
  origem: a.origem,
  titulo: a.titulo ?? '',
  detalhe: a.detalhe ?? '',
  link: a.link ?? '',
  lido: !!a.lido,
  criadoEm: a.criado_em,
});

function explicar(erro: any): string {
  const m = String(erro?.message || erro);
  if (m.includes('eventos_alerta') && m.includes('does not exist')) {
    return 'A central de alertas ainda não existe no banco. Rode o arquivo supabase/33_central_de_alertas.sql no Supabase.';
  }
  return m;
}

/** Os avisos mais recentes. Traz lidos e não lidos; o sino conta os não lidos. */
export async function listarAlertas(
  limite = 30
): Promise<{ lista: Alerta[]; erro?: string }> {
  if (!supabaseConfigurado) return { lista: [] };
  const { data, error } = await supabase
    .from('eventos_alerta')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limite);
  if (error) return { lista: [], erro: explicar(error) };
  return { lista: (data ?? []).map(daLinha) };
}

export async function marcarComoLido(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase
    .from('eventos_alerta').update({ lido: true }).eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

export async function marcarTudoComoLido(): Promise<{ erro?: string }> {
  const { error } = await supabase
    .from('eventos_alerta').update({ lido: true }).eq('lido', false);
  return error ? { erro: explicar(error) } : {};
}

export async function excluirAlerta(id: string): Promise<{ erro?: string }> {
  const { error } = await supabase.from('eventos_alerta').delete().eq('id', id);
  return error ? { erro: explicar(error) } : {};
}

/**
 * Avisa assim que um alerta novo entra na tabela.
 *
 * Sem isto o portal só saberia de coisa nova quando alguém recarregasse a
 * página — e um alarme que depende de F5 não é alarme.
 *
 * Devolve a função de desligar a escuta. Chamar ao sair da tela, senão cada
 * abertura deixa uma escuta pendurada e o alarme toca várias vezes.
 */
export function escutarAlertas(aoChegar: (a: Alerta) => void): () => void {
  if (!supabaseConfigurado) return () => {};

  const canal = supabase
    .channel('alertas-do-portal')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'eventos_alerta' },
      carga => aoChegar(daLinha(carga.new)))
    .subscribe();

  return () => { void supabase.removeChannel(canal); };
}

/**
 * O som do alarme.
 *
 * Gerado na hora pelo próprio navegador, sem arquivo de áudio: assim não
 * depende de subir um mp3, não pesa no carregamento e não quebra se o arquivo
 * sumir. São três toques curtos, subindo — perto do que se ouve num aplicativo
 * de pedidos.
 *
 * O navegador só libera som depois que a pessoa clicou em alguma coisa na
 * página. Enquanto ninguém clicar, isto falha em silêncio — de propósito, para
 * não encher o console de erro. O sino continua aparecendo na tela.
 */
export function tocarAlarme(): void {
  try {
    const Contexto = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Contexto) return;
    const ctx = new Contexto();

    [0, 0.22, 0.44].forEach((atraso, i) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = [880, 1046, 1318][i];
      osc.connect(vol);
      vol.connect(ctx.destination);

      const t = ctx.currentTime + atraso;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });

    setTimeout(() => { void ctx.close(); }, 1200);
  } catch {
    /* Som bloqueado pelo navegador. O aviso na tela continua valendo. */
  }
}
