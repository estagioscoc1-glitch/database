/**
 * Inscrição em estágio pelo portal, ligada ao SGE (sistema da secretaria), na aba "Estágios Curriculares" → "Vagas Abertas para Inscrição".
 *
 * Como funciona: a secretaria abre a vaga no SGE escolhendo as turmas. O SGE publica no banco (tabela `sge_estagio_oferta`) a vaga liberada para a turma de cada aluno,
 * se ele PODE se inscrever e, se não puder, as pendências em linguagem de aluno. O aluno pede a inscrição (tabela `sge_estagio_pedido`) e o SGE — que é quem decide —
 * confere tudo de novo na hora, inclui o aluno na vaga e responde. O portal só mostra e pede: nunca decide e nunca grava na oferta (RLS: cada aluno só enxerga as próprias linhas).
 * Aparece uma vaga por vez. Se o SGE não tiver nada para o aluno (ou a leitura falhar), `disponivel` fica falso e a tela de vagas continua como era.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, MapPin, Phone, RefreshCw, UserCheck, Users } from 'lucide-react';
import { supabase, supabaseConfigurado } from '../../lib/supabase';

export interface VagaOfertada {
  codigo_vaga: number;
  descricao: string | null;
  componente: string | null;
  local: string | null;
  professor: string | null;
  professor_telefone?: string | null;
  periodo: string | null;
  horario: string | null;
  inicio: string | null; // YYYY-MM-DD
  fim: string | null;
  carga_horaria: number | null;
  vagas_total: number | null;
  vagas_livres: number | null;
  janela_inicio: string | null; // YYYY-MM-DDTHH:MM
  janela_fim: string | null;
}

export interface OfertaEstagioSge {
  aluno_id: string;
  codigo_vaga: number;
  matricula: string;
  vaga: VagaOfertada;
  pode: boolean;
  motivos: string[];
  inscrito: boolean;
  atualizado_em: string;
}

const A_CADA_MS = 2 * 60 * 1000; // enquanto a tela está aberta, confere de novo a cada 2 minutos
const ESPERA_RESPOSTA_MS = 90 * 1000; // quanto tempo a tela espera o SGE responder um pedido
const VERIFICA_RESPOSTA_MS = 1000;

/** Lê do banco as vagas liberadas para o aluno (id da ficha do aluno). `disponivel` é falso quando não deu para ler (aí a tela antiga segue valendo). */
export function useOfertaEstagioSge(alunoId: string | undefined): { ofertas: OfertaEstagioSge[]; disponivel: boolean; recarregar: () => Promise<void> } {
  const [ofertas, setOfertas] = useState<OfertaEstagioSge[] | null>(null);
  const ativo = useRef(true);
  const alunoAtual = useRef<string | undefined>(alunoId);
  alunoAtual.current = alunoId;

  const carregar = useCallback(async () => {
    const id = alunoAtual.current;
    if (!id || !supabaseConfigurado) { if (ativo.current) setOfertas(null); return; }
    try {
      const { data, error } = await supabase.from('sge_estagio_oferta').select('*').eq('aluno_id', id).order('codigo_vaga', { ascending: true });
      if (!ativo.current || alunoAtual.current !== id) return;
      if (error) { console.warn('[Inscrição de estágio] não foi possível ler:', error.message); setOfertas(null); } else setOfertas((data ?? []) as OfertaEstagioSge[]);
    } catch (e) {
      console.warn('[Inscrição de estágio] erro ao ler:', e);
      if (ativo.current) setOfertas(null);
    }
  }, []);

  useEffect(() => {
    ativo.current = true;
    setOfertas(null);
    void carregar();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, A_CADA_MS);
    return () => { ativo.current = false; window.clearInterval(timer); };
  }, [alunoId, carregar]);

  return { ofertas: ofertas ?? [], disponivel: ofertas !== null, recarregar: carregar };
}

/** Uma vaga por vez: a que o aluno já ocupa; senão a de data mais próxima. */
export function escolherOferta(ofertas: OfertaEstagioSge[]): OfertaEstagioSge | null {
  if (!ofertas.length) return null;
  const inscrita = ofertas.find((o) => o.inscrito);
  if (inscrita) return inscrita;
  return [...ofertas].sort((a, b) => (a.vaga.inicio ?? '9999-12-31').localeCompare(b.vaga.inicio ?? '9999-12-31') || a.codigo_vaga - b.codigo_vaga)[0];
}

const fmtDia = (iso: string | null | undefined): string => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const fmtJanela = (iso: string | null | undefined): string => (iso && iso.length >= 16 ? `${fmtDia(iso)} às ${iso.slice(11, 16)}` : '');
const soDigitos = (t: string) => t.replace(/\D/g, '');
const dormir = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

type Resultado = { tipo: 'ok' | 'info' | 'recusado' | 'erro'; texto: string };

export const InscricaoEstagioSge: React.FC<{ oferta: OfertaEstagioSge; alunoId: string; somenteLeitura?: boolean; verComo?: boolean; onAtualizar: () => Promise<void> }> = ({ oferta, alunoId, somenteLeitura, verComo, onAtualizar }) => {
  const [fase, setFase] = useState<'parado' | 'confirmando' | 'enviando'>('parado');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const montado = useRef(true);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useEffect(() => { setFase('parado'); setResultado(null); }, [oferta.codigo_vaga, alunoId]);

  const v = oferta.vaga;
  const livres = v.vagas_livres;

  /** Cria o pedido, espera o SGE responder (ele confere tudo na hora) e atualiza a tela. */
  const enviar = async (tipo: 'inscrever' | 'verificar') => {
    setFase('enviando'); setResultado(null);
    try {
      let pedidoId: string | null = null;
      const novo = await supabase.from('sge_estagio_pedido').insert({ aluno_id: alunoId, codigo_vaga: oferta.codigo_vaga, tipo }).select('id').single();
      if (novo.error) {
        if (novo.error.code === '23505') { // já existe um pedido igual esperando resposta: acompanha esse
          const antigo = await supabase.from('sge_estagio_pedido').select('id').eq('aluno_id', alunoId).eq('codigo_vaga', oferta.codigo_vaga).eq('tipo', tipo).eq('status', 'pendente').order('criado_em', { ascending: false }).limit(1).maybeSingle();
          pedidoId = antigo.data?.id ?? null;
        }
        if (!pedidoId) {
          console.warn('[Inscrição de estágio] o banco recusou o pedido:', novo.error.code, novo.error.message);
          setResultado({ tipo: 'erro', texto: /Muitas tentativas/.test(novo.error.message) ? novo.error.message : `Não foi possível enviar o seu pedido agora. Tente novamente em instantes.${novo.error.code ? ` (código ${novo.error.code})` : ''}` });
          setFase('parado');
          return;
        }
      } else pedidoId = novo.data.id as string;

      const limite = Date.now() + ESPERA_RESPOSTA_MS;
      while (Date.now() < limite && montado.current) {
        await dormir(VERIFICA_RESPOSTA_MS);
        const r = await supabase.from('sge_estagio_pedido').select('status, mensagem').eq('id', pedidoId).maybeSingle();
        if (r.error || !r.data || r.data.status === 'pendente') continue;
        const texto = String(r.data.mensagem ?? '');
        await onAtualizar();
        if (!montado.current) return;
        setResultado({ tipo: r.data.status === 'ok' ? (tipo === 'inscrever' ? 'ok' : 'info') : r.data.status === 'recusado' ? 'recusado' : 'erro', texto: texto || 'Pedido respondido.' });
        setFase('parado');
        return;
      }
      if (!montado.current) return;
      setResultado({ tipo: 'info', texto: 'Seu pedido foi enviado, mas o sistema da escola ainda não respondeu. Ele continua na fila: volte a esta tela em alguns minutos.' });
    } catch (e) {
      console.warn('[Inscrição de estágio] erro ao enviar o pedido:', e);
      if (montado.current) setResultado({ tipo: 'erro', texto: 'Não foi possível enviar o seu pedido agora. Tente novamente em instantes.' });
    }
    if (montado.current) setFase('parado');
  };

  const caixa = {
    ok: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
    recusado: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300',
    erro: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300',
  };
  const telefone = (v.professor_telefone ?? '').trim();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4" data-testid="inscricao-estagio-sge">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[9px] rounded uppercase tracking-wider">
            Vaga liberada para a sua turma · nº {v.codigo_vaga}
          </span>
          <h5 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1">{v.componente || v.descricao || 'Estágio'}</h5>
          {v.componente && v.descricao ? <p className="text-[11px] text-slate-400">{v.descricao}</p> : null}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
          oferta.inscrito ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
            : livres === null || livres === undefined ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
            : livres > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
        }`}>
          {oferta.inscrito ? '✓ INSCRITO' : livres === null || livres === undefined ? 'Vagas abertas' : livres > 0 ? `${livres} ${livres === 1 ? 'vaga restante' : 'vagas restantes'}` : 'VAGAS ESGOTADAS'}
        </span>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
        {v.professor ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>🎓 Professor(a) responsável: <strong className="text-blue-600 dark:text-blue-400">{v.professor}</strong></span>
            {telefone ? (
              <a href={`tel:${soDigitos(telefone)}`} className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline" data-testid="telefone-professor">
                <Phone className="h-3.5 w-3.5" /> {telefone}
              </a>
            ) : null}
          </div>
        ) : null}
        {v.local ? <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" /><span>Local: <strong>{v.local}</strong></span></div> : null}
        {v.inicio ? (
          <div className="flex items-start gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
            <span>Período: <strong>{fmtDia(v.inicio)}{v.fim && v.fim !== v.inicio ? ` a ${fmtDia(v.fim)}` : ''}</strong>{v.periodo ? ` (${v.periodo.toUpperCase()})` : ''}</span>
          </div>
        ) : null}
        {v.horario ? <div className="flex items-start gap-1.5"><Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" /><span>Horário: <strong>{v.horario}</strong></span></div> : null}
        {v.carga_horaria ? <div>⏱️ Carga horária: <strong>{v.carga_horaria}h</strong></div> : null}
        {v.vagas_total ? <div className="flex items-start gap-1.5"><Users className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" /><span>Inscritos: <strong>{v.vagas_total - (livres ?? 0)} de {v.vagas_total} vagas</strong></span></div> : null}
        {v.janela_fim ? <div>📝 Inscrições até <strong>{fmtJanela(v.janela_fim)}</strong></div> : null}
      </div>

      {oferta.inscrito ? (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-extrabold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Sua inscrição está confirmada nesta vaga. Dúvidas sobre o estágio? Fale com o(a) professor(a){telefone ? ` pelo telefone ${telefone}` : ''}.
        </div>
      ) : oferta.pode ? (
        fase === 'confirmando' ? (
          <div className="p-3 border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 rounded-xl space-y-2.5">
            <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Confirmar a sua inscrição na vaga nº {v.codigo_vaga}? Você entra na lista da vaga e só poderá escolher outra depois que a sua nota nesta for lançada.
            </p>
            {verComo ? <p className="text-xs font-black text-rose-700 dark:text-rose-300">Atenção: você está vendo o portal como este aluno. Ao confirmar, a inscrição será feita DE VERDADE para ele.</p> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void enviar('inscrever')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl cursor-pointer">Sim, confirmar inscrição</button>
              <button type="button" onClick={() => setFase('parado')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs rounded-xl cursor-pointer">Cancelar</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={fase === 'enviando' || !!somenteLeitura}
            onClick={() => { setResultado(null); setFase('confirmando'); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/15 cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="h-4 w-4" /> {fase === 'enviando' ? 'Enviando a sua inscrição… aguarde' : 'Inscrever-me nesta vaga'}
          </button>
        )
      ) : (
        <div className="p-3 border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 rounded-xl space-y-2.5" data-testid="pendencias-estagio">
          <p className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Você ainda não pode se inscrever nesta vaga
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
            {oferta.motivos.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
          <button
            type="button"
            disabled={fase === 'enviando' || !!somenteLeitura}
            onClick={() => void enviar('verificar')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-amber-400/70 text-amber-900 dark:text-amber-200 disabled:opacity-60 font-black text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fase === 'enviando' ? 'animate-spin' : ''}`} /> {fase === 'enviando' ? 'Conferindo no sistema da escola…' : 'Já resolvi — verificar de novo'}
          </button>
        </div>
      )}

      {fase === 'enviando' && oferta.pode && !oferta.inscrito ? <p className="text-[11px] text-slate-500">O sistema da escola está conferindo tudo e incluindo você na vaga (costuma levar alguns segundos).</p> : null}
      {resultado ? <div className={`p-3 border rounded-xl text-xs font-bold ${caixa[resultado.tipo]}`} role="status">{resultado.texto}</div> : null}
      {somenteLeitura ? <p className="text-[11px] text-slate-400">Visualização da gestão: os botões ficam desativados.</p> : null}
      <p className="text-[10px] text-slate-400">
        Dados do sistema da secretaria (SGE){oferta.atualizado_em ? `, atualizados às ${new Date(oferta.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}. A inscrição só vale depois da confirmação do sistema da escola.
      </p>
    </div>
  );
};
