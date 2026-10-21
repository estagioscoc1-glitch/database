/**
 * Histórico de estágios vindo do SGE (sistema da secretaria), na aba "Estágios Curriculares" → "Meu Progresso" do aluno.
 *
 * O SGE envia sozinho (a cada poucos minutos) duas tabelas só-leitura para o portal: `sge_estagio_resumo` (horas concluídas/exigidas)
 * e `sge_estagio_vaga` (uma linha por vaga). A segurança é por linha (RLS): o aluno só enxerga as próprias linhas; o portal NUNCA grava nelas.
 * Se o aluno não tiver dados do SGE (ou der erro de leitura), `dados` fica nulo e a tela antiga de "Meu Progresso" continua como era.
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, Briefcase } from 'lucide-react';
import { supabase, supabaseConfigurado } from '../../lib/supabase';

export interface ResumoEstagioSge {
  aluno_id: string;
  matricula: string;
  horas_exigidas: number | null;
  horas_concluidas: number;
  horas_faltam: number | null;
  percentual: number;
  estagios_concluidos: number;
  estagios_pendentes: number;
  fonte_em: string;
}

export interface VagaEstagioSge {
  codigo_vaga: number;
  nome_estagio: string | null;
  professor: string | null;
  local_estagio: string | null;
  carga_horaria: number | null;
  nota: number | string | null;
  resultado: string | null;
  situacao: string | null;
  conta_horas: boolean;
}

export interface DadosEstagioSge {
  resumo: ResumoEstagioSge;
  vagas: VagaEstagioSge[];
}

const A_CADA_MS = 2 * 60 * 1000; // enquanto a tela está aberta, confere de novo a cada 2 minutos

/** Lê do banco o histórico de estágios do aluno (id da ficha do aluno). Devolve `dados: null` quando o SGE ainda não mandou nada para ele. */
export function useEstagioSge(alunoId: string | undefined): { dados: DadosEstagioSge | null; carregando: boolean } {
  const [dados, setDados] = useState<DadosEstagioSge | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    if (!alunoId || !supabaseConfigurado) {
      setDados(null);
      return undefined;
    }
    const carregar = async () => {
      try {
        const [resumo, vagas] = await Promise.all([
          supabase.from('sge_estagio_resumo').select('*').eq('aluno_id', alunoId).maybeSingle(),
          supabase.from('sge_estagio_vaga').select('*').eq('aluno_id', alunoId).order('codigo_vaga', { ascending: true }),
        ]);
        if (cancelado) return;
        if (resumo.error || vagas.error || !resumo.data) {
          if (resumo.error || vagas.error) console.warn('[Estágios SGE] não foi possível ler:', resumo.error?.message || vagas.error?.message);
          setDados(null);
        } else {
          setDados({ resumo: resumo.data as ResumoEstagioSge, vagas: (vagas.data ?? []) as VagaEstagioSge[] });
        }
      } catch (e) {
        if (!cancelado) {
          console.warn('[Estágios SGE] erro ao ler:', e);
          setDados(null);
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };
    setCarregando(true);
    void carregar();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, A_CADA_MS);
    return () => { cancelado = true; window.clearInterval(timer); };
  }, [alunoId]);

  return { dados, carregando };
}

const fmtNota = (n: number | string | null): string => {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100).replace('.', ',') : '—';
};

const fmtData = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** O painel "Meu Progresso" com os números do SGE: cartões de horas e a tabela das vagas, igual à tela de Histórico de Estágios da secretaria. */
export const PainelEstagioSge: React.FC<{ dados: DadosEstagioSge }> = ({ dados }) => {
  const { resumo, vagas } = dados;
  const temExigida = resumo.horas_exigidas !== null && resumo.horas_exigidas > 0;
  const cartao = 'bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-2';
  return (
    <div className="space-y-5" data-testid="meu-progresso-sge">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cartao}>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Carga horária de estágio concluída</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {resumo.horas_concluidas}h{temExigida && <span className="text-slate-400 text-xs sm:text-sm font-bold"> / {resumo.horas_exigidas}h</span>}
            </strong>
          </div>
          {temExigida && (
            <>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, resumo.percentual)}%` }} />
              </div>
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase">
                {resumo.percentual}% concluído{resumo.horas_faltam ? ` · faltam ${resumo.horas_faltam}h de estágio` : ''}
              </span>
            </>
          )}
        </div>

        <div className={cartao}>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Estágios concluídos</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{resumo.estagios_concluidos}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Com nota lançada pela secretaria</span>
          </div>
        </div>

        <div className={cartao}>
          <div>
            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Estágios pendentes</span>
            <strong className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{resumo.estagios_pendentes}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Ainda sem nota</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-black text-slate-800 dark:text-white">Histórico de estágios</h4>
        </div>
        {vagas.length === 0 ? (
          <p className="text-xs text-slate-500">Nenhum estágio lançado para você no sistema da secretaria ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-3">Nº da vaga</th>
                  <th className="py-2 pr-3">Estágio</th>
                  <th className="py-2 pr-3">Professor</th>
                  <th className="py-2 pr-3">Local</th>
                  <th className="py-2 pr-3">C.H.</th>
                  <th className="py-2 pr-3">Nota</th>
                  <th className="py-2 pr-3">Resultado</th>
                  <th className="py-2">Situação</th>
                </tr>
              </thead>
              <tbody>
                {vagas.map((v) => (
                  <tr key={v.codigo_vaga} className="border-t border-slate-200/60 dark:border-slate-800/60 text-slate-700 dark:text-slate-200">
                    <td className="py-2 pr-3 font-bold">{v.codigo_vaga}</td>
                    <td className="py-2 pr-3">{v.nome_estagio || '—'}</td>
                    <td className="py-2 pr-3">{v.professor || '—'}</td>
                    <td className="py-2 pr-3">{v.local_estagio || '—'}</td>
                    <td className="py-2 pr-3">{v.carga_horaria != null ? `${v.carga_horaria}h` : '—'}</td>
                    <td className="py-2 pr-3 font-bold">{fmtNota(v.nota)}</td>
                    <td className="py-2 pr-3">
                      {v.resultado === 'Aprovado' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">Aprovado</span>
                      ) : v.resultado === 'Reprovado' ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-bold">Reprovado</span>
                      ) : '—'}
                    </td>
                    <td className="py-2">
                      {v.situacao === 'Concluído' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">Concluído</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">Pendente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-slate-400">
          Dados do sistema da secretaria (SGE), atualizados automaticamente{resumo.fonte_em ? ` — última mudança registrada: ${fmtData(resumo.fonte_em)}` : ''}.
        </p>
      </div>
    </div>
  );
};
