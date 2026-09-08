import React, { useState, useEffect } from 'react';
import {
  meuCadastroSupervisor, minhasVagas, listarAlunosDaVaga, lancarNotas,
  listarCatalogo, mediaDoAluno, atualizarCamposDaFicha,
  type Supervisor, type VagaEstagio, type AlunoNaVaga, type EstagioCatalogo,
} from '../../lib/supabaseEstagioModulo';
import { FichaAvaliacaoPrintView } from './FichaAvaliacaoPrintView';
import {
  Briefcase, Users, Save, ChevronLeft, AlertTriangle, CheckCircle2,
  RefreshCw, ClipboardCheck, Info, FileText,
} from 'lucide-react';

// ===========================================================================
//  ÁREA DO SUPERVISOR DE ESTÁGIO
//
//  O que ele vê: SÓ as vagas dele, e SÓ as que ainda estão abertas. Vaga
//  fechada some da lista — o trabalho dele ali terminou, e a lista não cresce
//  a cada semestre. O histórico continua no banco, e a secretaria vê tudo.
//
//  Dentro da vaga, os alunos daquela turma. Para cada aluno, a ficha com os
//  quatro elementos de competência, onde ele lança as notas. Nada de papel.
//
//  ISTO NÃO DEPENDE SÓ DA TELA. As regras de segurança do banco (arquivo
//  supabase/24_estagios_modulo.sql) já impedem que ele leia alunos de outras
//  vagas ou altere nota de vaga fechada — mesmo que alguém tentasse por fora.
// ===========================================================================

const BLOCOS = [
  { chave: 'notaConhecimento', titulo: 'Conhecimento Técnico Profissional', lista: 'compConhecimento' },
  { chave: 'notaHabilidade',   titulo: 'Habilidade Técnica',                lista: 'compHabilidade' },
  { chave: 'notaAtitudes',     titulo: 'Atitudes Pessoais',                 lista: 'compAtitudes' },
  { chave: 'notaValores',      titulo: 'Valores Éticos',                    lista: 'compValores' },
] as const;

export const SupervisorEstagioModule: React.FC<{ usuarioId: string; nome?: string }> = ({ usuarioId, nome }) => {
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [vagas, setVagas] = useState<VagaEstagio[]>([]);
  const [vagaAberta, setVagaAberta] = useState<VagaEstagio | null>(null);
  const [alunos, setAlunos] = useState<AlunoNaVaga[]>([]);
  const [fichaAberta, setFichaAberta] = useState<AlunoNaVaga | null>(null);

  /* A FICHA DE VERDADE — a mesma que o administrador imprime, com o timbre
     da escola, os quatro blocos e o verso da frequência. É diferente da
     tela acima, que é só o formulário para lançar as quatro notas. */
  const [fichaImprimir, setFichaImprimir] = useState<AlunoNaVaga | null>(null);
  const [catalogo, setCatalogo] = useState<EstagioCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 5000);
  };

  const recarregar = async () => {
    setCarregando(true);
    const sup = await meuCadastroSupervisor(usuarioId);
    setSupervisor(sup);
    if (sup?.id) {
      const [v, c] = await Promise.all([minhasVagas(sup.id), listarCatalogo()]);
      setVagas(v.lista);
      setCatalogo(c.lista);
    }
    setCarregando(false);
  };
  useEffect(() => { void recarregar(); }, [usuarioId]);

  const abrir = async (v: VagaEstagio) => {
    setVagaAberta(v);
    const { lista } = await listarAlunosDaVaga(v.id!);
    setAlunos(lista);
  };

  const gravar = async () => {
    if (!fichaAberta || !vagaAberta) return;
    setSalvando(true);
    /* Lançou aqui, já vale no histórico do aluno — não espera o Fechar
       Vaga. Corrigir depois é só o administrador, numa tela própria. */
    const { erro, foiParaOHistorico } = await lancarNotas(fichaAberta, vagaAberta, nome);
    setSalvando(false);
    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', foiParaOHistorico
      ? `Notas de ${fichaAberta.alunoNome} salvas e já lançadas no histórico dele.`
      : `Notas de ${fichaAberta.alunoNome} salvas.`);
    setFichaAberta(null);
    if (vagaAberta) await abrir(vagaAberta);
  };

  if (carregando) {
    return <div className="p-12 text-center text-sm font-bold text-slate-400">Carregando…</div>;
  }

  // Quem não é supervisor não vê nada aqui.
  if (!supervisor) {
    return (
      <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
        <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">
          Seu login ainda não está vinculado a um cadastro de supervisor de estágio.
        </p>
        <p className="text-[11px] text-slate-400 mt-2 max-w-md leading-relaxed">
          Peça à secretaria para vincular sua conta em Movimentação → Estágio — Cadastros.
        </p>
      </div>
    );
  }

  const doCatalogo = vagaAberta
    ? catalogo.find(c => c.componente === vagaAberta.componente)
    : undefined;

  return (
    <div className="space-y-5">

      {aviso && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-2xl border text-xs font-bold ${
          aviso.tipo === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {aviso.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertTriangle className="h-4 w-4 mt-0.5" />}
          <span className="leading-relaxed">{aviso.texto}</span>
        </div>
      )}

      {/* ---------------------------------------- LISTA DAS MINHAS VAGAS */}
      {!vagaAberta && (
        <>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Briefcase className="h-5 w-5" />
              <div>
                <h3 className="font-black text-sm">Meus Estágios</h3>
                <p className="text-[11px] font-bold text-slate-500">
                  {supervisor.nome}
                  {supervisor.conselho && supervisor.registro ? ` · ${supervisor.conselho} ${supervisor.registro}` : ''}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => void recarregar()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </button>
          </div>

          {vagas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
              <ClipboardCheck className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">Nenhuma vaga aberta para você no momento.</p>
              <p className="text-[11px] text-slate-400 mt-2 max-w-md leading-relaxed">
                Vagas já fechadas não aparecem aqui. Quando a coordenação abrir uma nova
                e colocar você como supervisor, ela surge nesta tela.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {vagas.map(v => (
                <button key={v.id} type="button" onClick={() => void abrir(v)}
                        className="w-full text-left bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-800 dark:text-white">
                        {v.codigo} — {v.componente}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                        {v.localNome || 'Sem local'}{v.turno ? ` · ${v.turno}` : ''}
                        {v.dataInicio ? ` · a partir de ${new Date(v.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-black">
                      <Users className="h-3.5 w-3.5" /> Ver alunos
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* --------------------------------------------- ALUNOS DA VAGA */}
      {vagaAberta && !fichaAberta && (
        <>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button type="button" onClick={() => { setVagaAberta(null); setAlunos([]); }}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mb-2">
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <p className="font-black text-sm text-slate-800 dark:text-white">
              {vagaAberta.codigo} — {vagaAberta.componente}
            </p>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
              {vagaAberta.localNome || 'Sem local'} · {alunos.length} aluno(s)
            </p>
          </div>

          <div className="space-y-2.5">
            {alunos.map(a => {
              const media = mediaDoAluno(a);
              const lancado = media !== null;
              return (
                <div key={a.id}
                     className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 transition-all flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setFichaAberta({ ...a })}
                          className="flex-1 min-w-0 text-left">
                    <p className="font-black text-sm text-slate-800 dark:text-white truncate">{a.alunoNome}</p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {a.alunoMatricula || 'Sem matrícula'}
                    </p>
                  </button>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`font-mono font-black text-lg ${lancado ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300'}`}>
                      {lancado ? media.toFixed(1).replace('.', ',') : '—'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                      a.resultado === 'APTO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : a.resultado === 'NÃO APTO' ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {a.resultado === 'PENDENTE' ? 'LANÇAR' : a.resultado}
                    </span>
                    {/* ABRIR A FICHA DE VERDADE — com timbre, os quatro
                        blocos e o verso da frequência. Independe da nota já
                        ter sido lançada: o supervisor pode querer imprimir
                        a folha de frequência antes mesmo de avaliar. */}
                    <button type="button" onClick={() => setFichaImprimir(a)}
                            title="Abrir ficha para imprimir"
                            className="p-2 text-slate-400 hover:text-blue-600 flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {alunos.length === 0 && (
              <div className="p-10 text-center text-sm font-bold text-slate-400">
                Nenhum aluno nesta vaga ainda.
              </div>
            )}
          </div>
        </>
      )}

      {/* ------------------------------------- FICHA DE AVALIAÇÃO */}
      {fichaAberta && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button type="button" onClick={() => setFichaAberta(null)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 mb-2">
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar para a lista
            </button>
            <p className="font-black text-base text-slate-800 dark:text-white">{fichaAberta.alunoNome}</p>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
              {vagaAberta?.componente} · {vagaAberta?.localNome}
            </p>
          </div>

          {BLOCOS.map(bloco => {
            const itens = (doCatalogo as any)?.[bloco.lista] as string[] | undefined;
            const valor = (fichaAberta as any)[bloco.chave] as number | null;
            return (
              <div key={bloco.chave} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  {bloco.titulo}
                </div>
                <div className="p-5">
                  {itens && itens.length > 0 ? (
                    <ul className="mb-4 space-y-1 text-[12px] text-slate-600 dark:text-slate-300 list-disc pl-5">
                      {itens.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  ) : (
                    <p className="mb-4 text-[11px] text-slate-400 italic">
                      Os itens avaliados deste bloco ainda não foram cadastrados pela coordenação.
                    </p>
                  )}
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Nota de 0 a 10
                  </label>
                  <input
                    type="number" min={0} max={10} step="0.1"
                    className="w-32 px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-lg font-black text-center"
                    value={valor ?? ''}
                    onChange={e => setFichaAberta({
                      ...fichaAberta,
                      [bloco.chave]: e.target.value === '' ? null : Number(e.target.value),
                    } as AlunoNaVaga)}
                  />
                </div>
              </div>
            );
          })}

          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Observações (opcional)
              </label>
              <textarea rows={3}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm resize-y"
                        value={fichaAberta.observacoes ?? ''}
                        onChange={e => setFichaAberta({ ...fichaAberta, observacoes: e.target.value })} />
            </div>

            {/* SGE, VAGA E SALA — só entram na ficha impressa. O sistema não
                usa nem confere esses números; ficam gravados assim que o
                campo perde o foco. */}
            <div className="grid grid-cols-3 gap-3">
              {([
                ['sgeManual', 'SGE'], ['vagaManual', 'VAGA'], ['salaManual', 'SALA'],
              ] as const).map(([chave, rotulo]) => (
                <div key={chave}>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    {rotulo} <span className="font-medium normal-case text-slate-400">(só para a ficha impressa)</span>
                  </label>
                  <input
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
                    value={(fichaAberta as any)[chave] ?? ''}
                    onChange={e => setFichaAberta({ ...fichaAberta, [chave]: e.target.value } as AlunoNaVaga)}
                    onBlur={e => { if (fichaAberta.id) void atualizarCamposDaFicha(fichaAberta.id, { [chave]: e.target.value } as any); }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold text-blue-800 leading-relaxed">
                A média é a média das quatro notas, calculada pelo sistema. Média a partir de 6,0
                resulta em APTO. Você não digita a média nem o resultado.
              </p>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Média: <span className="font-mono text-xl text-blue-700">
                  {mediaDoAluno(fichaAberta) === null ? '—' : mediaDoAluno(fichaAberta)!.toFixed(1).replace('.', ',')}
                </span>
              </div>
              <button type="button" onClick={() => void gravar()} disabled={salvando}
                      className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-xs">
                <Save className="h-4 w-4" /> {salvando ? 'Salvando…' : 'Salvar Avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {fichaImprimir && vagaAberta && (
        <FichaAvaliacaoPrintView
          vaga={vagaAberta}
          aluno={fichaImprimir}
          catalogo={catalogo.find(c => c.componente === vagaAberta.componente)}
          supervisorRegistro={supervisor.conselho && supervisor.registro ? `${supervisor.conselho} ${supervisor.registro}` : undefined}
          onClose={() => setFichaImprimir(null)}
        />
      )}
    </div>
  );
};
