import React, { useState, useEffect } from 'react';
import {
  vagasAbertasParaInscricao, minhasInscricoes, inscreverSe, cancelarInscricao,
  type VagaEstagio, type InscricaoEstagio,
} from '../../lib/supabaseEstagioModulo';
import {
  Briefcase, CheckCircle2, AlertTriangle, Clock, XCircle, MapPin, CalendarDays,
} from 'lucide-react';

// ===========================================================================
//  INSCRIÇÃO EM ESTÁGIO — painel do aluno
//
//  Mostra as vagas que a coordenação abriu para inscrição. O aluno se
//  inscreve, e a inscrição fica PENDENTE até alguém da coordenação aprovar.
//
//  Inscrever-se NÃO é entrar no estágio. Só ao aprovar é que o aluno passa a
//  fazer parte da vaga e aparece na lista do supervisor. Deixei isso escrito
//  na tela, porque a diferença importa e o aluno precisa saber.
//
//  Sem vaga aberta, a seção não aparece — o painel não fica com um espaço
//  vazio o semestre inteiro.
// ===========================================================================

interface Props {
  alunoId: string;
  alunoNome: string;
  alunoMatricula?: string;
  /** Turma do aluno. Decide quais vagas ele enxerga. */
  turmaId?: string;
}

export const InscricaoEstagioAluno: React.FC<Props> = ({ alunoId, alunoNome, alunoMatricula, turmaId }) => {
  const [vagas, setVagas] = useState<VagaEstagio[]>([]);
  const [inscricoes, setInscricoes] = useState<InscricaoEstagio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const recarregar = async () => {
    const [v, i] = await Promise.all([vagasAbertasParaInscricao(turmaId), minhasInscricoes(alunoId)]);
    setVagas(v.lista); setInscricoes(i.lista); setCarregando(false);
  };
  useEffect(() => { void recarregar(); }, [alunoId, turmaId]);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 6000);
  };

  const minhaInscricao = (vagaId: string) => inscricoes.find(i => i.vagaId === vagaId);

  const inscrever = async (v: VagaEstagio) => {
    const { erro } = await inscreverSe({
      vagaId: v.id!, alunoId, alunoNome, alunoMatricula,
      situacao: 'PENDENTE',
    });
    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', 'Inscrição enviada. Aguarde a análise da coordenação.');
    void recarregar();
  };

  const dataBr = (iso?: string) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  if (carregando) return null;
  // Sem vaga aberta e sem inscrição minha, a seção nem existe.
  if (vagas.length === 0 && inscricoes.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-white" />
        <h3 className="font-black text-sm text-white">Vagas de Estágio</h3>
      </div>

      <div className="p-5 space-y-3">
        {aviso && (
          <div className={`flex items-start gap-2 px-4 py-3 rounded-2xl border text-xs font-bold ${
            aviso.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
            {aviso.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
            <span className="leading-relaxed">{aviso.texto}</span>
          </div>
        )}

        {vagas.map(v => {
          const minha = minhaInscricao(v.id!);
          return (
            <div key={v.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <p className="font-black text-sm text-slate-800 dark:text-white">{v.componente}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] font-bold text-slate-500">
                {v.localNome && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.localNome}</span>
                )}
                {v.turno && <span>{v.turno}</span>}
                {(v.dataInicio || v.dataFim) && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> {dataBr(v.dataInicio)} a {dataBr(v.dataFim)}
                  </span>
                )}
                <span>{v.vagasTotal} lugares</span>
              </div>
              {v.inscricoesAte && (
                <p className="text-[11px] font-bold text-amber-700 mt-1">
                  Inscrições até {dataBr(v.inscricoesAte)}
                </p>
              )}

              <div className="mt-3">
                {!minha ? (
                  <button type="button" onClick={() => void inscrever(v)}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
                    Quero me inscrever
                  </button>
                ) : minha.situacao === 'PENDENTE' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-black">
                      <Clock className="h-3.5 w-3.5" /> Aguardando análise
                    </span>
                    <button type="button"
                            onClick={async () => {
                              if (!window.confirm('Desistir desta inscrição?')) return;
                              await cancelarInscricao(minha.id!);
                              void recarregar();
                            }}
                            className="text-[11px] font-bold text-slate-500 hover:text-rose-600">
                      Desistir
                    </button>
                  </div>
                ) : minha.situacao === 'APROVADA' ? (
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black w-fit">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Inscrição aprovada
                  </span>
                ) : (
                  <div>
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black w-fit">
                      <XCircle className="h-3.5 w-3.5" /> Não aprovada
                    </span>
                    {minha.motivoRecusa && (
                      <p className="text-[11px] text-slate-500 mt-1.5">{minha.motivoRecusa}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {vagas.length === 0 && (
          <p className="text-[12px] text-slate-500 leading-relaxed">
            Não há vagas abertas para inscrição no momento.
          </p>
        )}

        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
          Inscrever-se não garante a vaga. A coordenação analisa cada pedido e você é avisado aqui
          quando ela decidir.
        </p>
      </div>
    </div>
  );
};
