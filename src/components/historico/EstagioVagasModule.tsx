import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  listarVagas, salvarVaga, mudarSituacaoVaga, apagarVaga,
  listarAlunosDaVaga, incluirAlunoNaVaga, removerAlunoDaVaga,
  atualizarPreRequisitos, listarSupervisores, listarLocais, listarCatalogo,
  mediaDoAluno, formatarDinheiro, SITUACOES_VAGA,
  corrigirNotaHistorico, nomeOficialDoComponente, reciboDaVaga, listarRecibos, type ReciboEstagio,
  type VagaEstagio, type AlunoNaVaga, type SituacaoVaga,
  type Supervisor, type LocalEstagio, type EstagioCatalogo,
} from '../../lib/supabaseEstagioModulo';
import {
  Briefcase, Plus, Trash2, Save, X, AlertTriangle, CheckCircle2,
  RefreshCw, Search, Users, Link2, Lock, Copy, Printer, Receipt, Pencil,
} from 'lucide-react';
import { FichaAvaliacaoPrintView } from './FichaAvaliacaoPrintView';
import { ListaVagaPrintView } from './ListaVagaPrintView';
import {
  emitirRecibo, copiarNotasParaHistorico, listarInscricoesDaVaga,
  aprovarInscricao, recusarInscricao, abrirInscricoes,
  type InscricaoEstagio,
} from '../../lib/supabaseEstagioModulo';

// ===========================================================================
//  VAGAS DE ESTÁGIO
//
//  A vaga é a turma de estágio: um componente, um supervisor, um local, um
//  período. Dentro dela entram os alunos.
//
//  O VALOR POR ALUNO É COPIADO do catálogo no momento em que a vaga é criada,
//  e não lido dele depois. Se a escola reajustar o preço no ano que vem, as
//  vagas antigas continuam valendo o que valiam — senão um recibo já assinado
//  passaria a mostrar outro número.
//
//  A CHAVE DE ACESSO é gerada junto com a vaga. É por ela que o supervisor
//  entra para lançar as notas, sem precisar enxergar o resto do portal.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

export const EstagioVagasModule: React.FC<{ currentUser?: string }> = ({ currentUser = 'Administração' }) => {
  const { users } = useApp();

  const [vagas, setVagas] = useState<VagaEstagio[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [locais, setLocais] = useState<LocalEstagio[]>([]);
  const [catalogo, setCatalogo] = useState<EstagioCatalogo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const [vagaEdit, setVagaEdit] = useState<VagaEstagio | null>(null);
  const [vagaAberta, setVagaAberta] = useState<VagaEstagio | null>(null);
  const [alunosDaVaga, setAlunosDaVaga] = useState<AlunoNaVaga[]>([]);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'TODAS' | SituacaoVaga>('TODAS');
  const [fichaImprimir, setFichaImprimir] = useState<AlunoNaVaga | null>(null);

  /* CORREÇÃO DE NOTA JÁ NO HISTÓRICO — só o admin tem este botão.
     A nota do supervisor já foi copiada para o histórico na hora do
     lançamento; corrigir ela agora é mudar direto lá, não relançar aqui. */
  const [corrigindo, setCorrigindo] = useState<AlunoNaVaga | null>(null);
  const [notaCorrigida, setNotaCorrigida] = useState('');

  /* Recibo desta vaga, se já foi emitido — para mostrar o selo PAGO sem
     precisar ir até Estágio — Pagamentos conferir. */
  const [reciboVagaAtual, setReciboVagaAtual] = useState<ReciboEstagio | null>(null);
  useEffect(() => {
    if (vagaAberta?.id) void reciboDaVaga(vagaAberta.id).then(setReciboVagaAtual);
    else setReciboVagaAtual(null);
  }, [vagaAberta?.id]);

  /* Selo PAGO nos cartões da lista — uma consulta só para todas as vagas,
     em vez de uma por cartão. */
  const [vagaIdsPagas, setVagaIdsPagas] = useState<Set<string>>(new Set());
  useEffect(() => {
    void listarRecibos().then(({ lista }) => {
      setVagaIdsPagas(new Set(lista.filter(r => r.situacao === 'PAGO' && r.vagaId).map(r => r.vagaId!)));
    });
  }, [reciboVagaAtual]);
  const [listaImprimir, setListaImprimir] = useState(false);
  const [inscricoes, setInscricoes] = useState<InscricaoEstagio[]>([]);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 6000);
  };

  const recarregar = async () => {
    setCarregando(true);
    const [v, s, l, c] = await Promise.all([
      listarVagas(), listarSupervisores(), listarLocais(), listarCatalogo(),
    ]);
    setVagas(v.lista); setSupervisores(s.lista); setLocais(l.lista); setCatalogo(c.lista);
    setErro(v.erro || s.erro || l.erro || c.erro || null);
    setCarregando(false);
  };
  useEffect(() => { void recarregar(); }, []);

  const abrirVaga = async (v: VagaEstagio) => {
    setVagaAberta(v);
    const [al, ins] = await Promise.all([listarAlunosDaVaga(v.id!), listarInscricoesDaVaga(v.id!)]);
    setAlunosDaVaga(al.lista);
    setInscricoes(ins.lista);
    if (al.erro) mostrar('erro', al.erro);
  };

  const alunos = useMemo(() => users.filter(u => u.role === UserRole.STUDENT), [users]);
  const candidatos = useMemo(() => {
    const t = buscaAluno.trim().toLowerCase();
    if (t.length < 2) return [];
    const jaNaVaga = new Set(alunosDaVaga.map(a => a.alunoId));
    return alunos
      .filter(a => !jaNaVaga.has(a.id))
      .filter(a => a.name?.toLowerCase().includes(t) || (a.enrollment ?? '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [alunos, buscaAluno, alunosDaVaga]);

  const novaVaga = (): VagaEstagio => ({
    codigo: `Vaga ${vagas.length + 1}`,
    componente: '', vagasTotal: 10, situacao: 'ABERTA', valorPorAluno: 0,
  });

  const gravarVaga = async () => {
    if (!vagaEdit?.componente) { mostrar('erro', 'Escolha o componente do estágio.'); return; }
    const { erro: e } = await salvarVaga(vagaEdit);
    if (e) { mostrar('erro', e); return; }
    mostrar('ok', `${vagaEdit.codigo} salva.`);
    setVagaEdit(null); void recarregar();
  };

  const incluir = async (a: any) => {
    if (!vagaAberta?.id) return;
    if (alunosDaVaga.length >= vagaAberta.vagasTotal) {
      mostrar('erro', `A vaga tem ${vagaAberta.vagasTotal} lugares e já está cheia. Aumente o total antes de incluir mais.`);
      return;
    }
    const { erro: e } = await incluirAlunoNaVaga({
      vagaId: vagaAberta.id, alunoId: a.id, alunoNome: a.name,
      alunoMatricula: a.enrollment ?? '',
      notaConhecimento: null, notaHabilidade: null, notaAtitudes: null, notaValores: null,
      resultado: 'PENDENTE',
    });
    if (e) { mostrar('erro', e); return; }
    setBuscaAluno('');
    await abrirVaga(vagaAberta);
  };

  /**
   * Fechar a vaga trava novas inclusões e libera o recibo do supervisor.
   * A cópia para o histórico não acontece mais aqui — é feita na hora em
   * que o supervisor lança a nota, para o aluno não esperar o fechamento.
   */
  const fechar = async (v: VagaEstagio) => {
    const semNota = alunosDaVaga.filter(a => mediaDoAluno(a) === null).length;
    if (semNota > 0 && !window.confirm(
      `${semNota} aluno(s) ainda não têm nota lançada e vão ficar sem histórico. Fechar mesmo assim?`
    )) return;

    const { erro: e } = await mudarSituacaoVaga(v.id!, 'FECHADA', currentUser);
    if (e) { mostrar('erro', e); return; }

    mostrar('ok', 'Vaga fechada. Já dá para gerar o recibo do supervisor.');
    void recarregar();
    setVagaAberta({ ...v, situacao: 'FECHADA' });
  };

  const vagasFiltradas = filtroSituacao === 'TODAS'
    ? vagas : vagas.filter(v => v.situacao === filtroSituacao);

  const semPreco = catalogo.filter(c => !c.valorPorAluno).length === catalogo.length && catalogo.length > 0;

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

      {erro && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-bold text-amber-800 leading-relaxed">{erro}</span>
        </div>
      )}

      {semPreco && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
            Nenhum estágio tem preço cadastrado. As vagas criadas agora vão nascer com valor zero,
            e o recibo do supervisor sairá zerado. Preencha os valores em Estágio — Cadastros antes.
          </p>
        </div>
      )}

      {/* ------------------------------------------------- LISTA DE VAGAS */}
      {!vagaAberta && (
        <>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Briefcase className="h-5 w-5" />
                <h3 className="font-black text-sm">Vagas de Estágio</h3>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void recarregar()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
                  <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
                </button>
                <button type="button" onClick={() => setVagaEdit(novaVaga())}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
                  <Plus className="h-4 w-4" /> Nova Vaga
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SITUACOES_VAGA.map(s => (
                <button key={s.valor} type="button"
                        onClick={() => setFiltroSituacao(filtroSituacao === s.valor ? 'TODAS' : s.valor)}
                        className={`p-3 rounded-2xl border text-left transition-all ${s.cor} ${
                          filtroSituacao === s.valor ? 'ring-2 ring-blue-500' : ''}`}>
                  <p className="text-2xl font-black leading-none">
                    {vagas.filter(v => v.situacao === s.valor).length}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-1">{s.rotulo}</p>
                </button>
              ))}
            </div>
          </div>

          {vagaEdit && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-blue-300 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={rotulo}>Código da vaga</label>
                  <input className={campo} value={vagaEdit.codigo}
                         onChange={e => setVagaEdit({ ...vagaEdit, codigo: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={rotulo}>Componente do estágio</label>
                  <select className={campo} value={vagaEdit.catalogoId ?? ''}
                          onChange={e => {
                            const c = catalogo.find(x => x.id === e.target.value);
                            setVagaEdit({
                              ...vagaEdit, catalogoId: c?.id, componente: c?.componente ?? '',
                              curso: c?.curso,
                              // Preço COPIADO agora, e não lido do catálogo depois.
                              valorPorAluno: c?.valorPorAluno ?? 0,
                            });
                          }}>
                    <option value="">Escolha…</option>
                    {catalogo.map(c => (
                      <option key={c.id} value={c.id}>{c.curso} — {c.componente}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Supervisor</label>
                  <select className={campo} value={vagaEdit.supervisorId ?? ''}
                          onChange={e => {
                            const s = supervisores.find(x => x.id === e.target.value);
                            setVagaEdit({ ...vagaEdit, supervisorId: s?.id, supervisorNome: s?.nome ?? '' });
                          }}>
                    <option value="">Escolha…</option>
                    {supervisores.filter(s => s.ativo).map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Local</label>
                  <select className={campo} value={vagaEdit.localId ?? ''}
                          onChange={e => {
                            const l = locais.find(x => x.id === e.target.value);
                            setVagaEdit({ ...vagaEdit, localId: l?.id, localNome: l?.nome ?? '' });
                          }}>
                    <option value="">Escolha…</option>
                    {locais.filter(l => l.ativo).map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Turno</label>
                  <select className={campo} value={vagaEdit.turno ?? ''}
                          onChange={e => setVagaEdit({ ...vagaEdit, turno: e.target.value })}>
                    <option value="">Escolha…</option>
                    {['MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Início</label>
                  <input type="date" className={campo} value={vagaEdit.dataInicio ?? ''}
                         onChange={e => setVagaEdit({ ...vagaEdit, dataInicio: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Término</label>
                  <input type="date" className={campo} value={vagaEdit.dataFim ?? ''}
                         onChange={e => setVagaEdit({ ...vagaEdit, dataFim: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Quantidade de alunos</label>
                  <input type="number" min={1} className={campo} value={vagaEdit.vagasTotal}
                         onChange={e => setVagaEdit({ ...vagaEdit, vagasTotal: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={rotulo}>Valor por aluno</label>
                  <input type="number" min={0} step="0.01" className={campo} value={vagaEdit.valorPorAluno}
                         onChange={e => setVagaEdit({ ...vagaEdit, valorPorAluno: Number(e.target.value) })} />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Vem do catálogo e fica gravado nesta vaga. Reajuste futuro não altera vagas antigas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void gravarVaga()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
                  <Save className="h-4 w-4" /> Salvar Vaga
                </button>
                <button type="button" onClick={() => setVagaEdit(null)}
                        className="px-4 py-2.5 text-slate-500 font-bold text-xs">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {vagasFiltradas.map(v => {
              const cor = SITUACOES_VAGA.find(s => s.valor === v.situacao)?.cor ?? '';
              return (
                <div key={v.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-slate-800 dark:text-white">{v.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${cor}`}>
                        {SITUACOES_VAGA.find(s => s.valor === v.situacao)?.rotulo}
                      </span>
                      {vagaIdsPagas.has(v.id!) && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase">
                          Pago
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 mt-1">{v.componente}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {v.supervisorNome || 'Sem supervisor'} · {v.localNome || 'Sem local'}
                      {v.turno ? ` · ${v.turno}` : ''} · {v.vagasTotal} lugares
                      {v.valorPorAluno > 0 ? ` · ${formatarDinheiro(v.valorPorAluno)}/aluno` : ' · sem preço'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void abrirVaga(v)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px]">
                      <Users className="h-3.5 w-3.5" /> Alunos
                    </button>
                    <button type="button" onClick={() => setVagaEdit(v)}
                            className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl">Editar</button>
                    <button type="button"
                            onClick={async () => {
                              if (!window.confirm(`Apagar ${v.codigo}? Os alunos incluídos nela também saem.`)) return;
                              const { erro: e } = await apagarVaga(v.id!);
                              if (e) { mostrar('erro', e); return; }
                              void recarregar();
                            }}
                            className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
            {vagas.length === 0 && !carregando && (
              <div className="p-12 text-center text-sm font-bold text-slate-400">
                Nenhuma vaga criada ainda.
              </div>
            )}
          </div>
        </>
      )}

      {/* --------------------------------------------- ALUNOS DA VAGA */}
      {vagaAberta && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <button type="button" onClick={() => { setVagaAberta(null); void recarregar(); }}
                        className="text-[11px] font-bold text-blue-600 mb-2">← Voltar para as vagas</button>
                <p className="font-black text-sm text-slate-800 dark:text-white">
                  {vagaAberta.codigo} — {vagaAberta.componente}
                </p>
                <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                  {vagaAberta.supervisorNome || 'Sem supervisor'} · {vagaAberta.localNome || 'Sem local'} ·
                  {' '}{alunosDaVaga.length} de {vagaAberta.vagasTotal} lugares
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => setListaImprimir(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-black rounded-xl text-xs">
                  <Printer className="h-4 w-4" /> Relação de Alunos
                </button>
                {vagaAberta.situacao !== 'FECHADA' ? (
                  <button type="button" onClick={() => void fechar(vagaAberta)}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs">
                    <Lock className="h-4 w-4" /> Fechar Vaga
                  </button>
                ) : (
                  <>
                    <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black">
                      Vaga fechada
                    </span>
                    {reciboVagaAtual ? (
                      <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black">
                        <Receipt className="h-3.5 w-3.5" /> PAGO — {reciboVagaAtual.numero}
                      </span>
                    ) : (
                      <button type="button"
                              onClick={async () => {
                                /* O recibo sai já como PAGO — é o próprio comprovante de
                                   pagamento, não existe etapa intermediária de "a pagar". */
                                const { erro: e } = await emitirRecibo(
                                  vagaAberta, alunosDaVaga.map(a => a.alunoNome), currentUser);
                                if (e) { mostrar('erro', e); return; }
                                mostrar('ok', 'Recibo emitido e vaga marcada como paga.');
                                void reciboDaVaga(vagaAberta.id!).then(setReciboVagaAtual);
                              }}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-xl text-xs">
                        <Receipt className="h-4 w-4" /> Emitir Recibo
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chave de acesso do supervisor */}
            {vagaAberta.tokenAcesso && (
              <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750">
                <Link2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Chave do supervisor</p>
                  <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                    {vagaAberta.tokenAcesso}
                  </p>
                </div>
                <button type="button"
                        onClick={() => { void navigator.clipboard.writeText(vagaAberta.tokenAcesso!); mostrar('ok', 'Chave copiada.'); }}
                        className="p-2 text-slate-400 hover:text-blue-600"><Copy className="h-4 w-4" /></button>
              </div>
            )}
          </div>

          {/* Inscrições — controle de quem pediu vaga pelo painel do aluno */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <label className={rotulo}>Inscrição pelo painel do aluno</label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!vagaAberta.inscricoesAbertas}
                         onChange={async e => {
                           const { erro: err } = await abrirInscricoes(vagaAberta.id!, e.target.checked, vagaAberta.inscricoesAte);
                           if (err) { mostrar('erro', err); return; }
                           setVagaAberta({ ...vagaAberta, inscricoesAbertas: e.target.checked });
                           mostrar('ok', e.target.checked
                             ? 'Vaga aberta. Os alunos já veem no painel deles.'
                             : 'Inscrições fechadas. A vaga sumiu do painel do aluno.');
                         }} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Abrir para inscrição</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Até</span>
                  <input type="date"
                         className="px-2 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg outline-none text-[11px]"
                         value={vagaAberta.inscricoesAte ?? ''}
                         onChange={async e => {
                           await abrirInscricoes(vagaAberta.id!, !!vagaAberta.inscricoesAbertas, e.target.value);
                           setVagaAberta({ ...vagaAberta, inscricoesAte: e.target.value });
                         }} />
                </div>
              </div>
            </div>

            {inscricoes.filter(i => i.situacao === 'PENDENTE').length === 0 ? (
              <p className="text-[11px] text-slate-400">
                {vagaAberta.inscricoesAbertas
                  ? 'Nenhuma inscrição aguardando análise.'
                  : 'A vaga não está aberta para inscrição.'}
              </p>
            ) : (
              <div className="space-y-2">
                {inscricoes.filter(i => i.situacao === 'PENDENTE').map(i => (
                  <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800">{i.alunoNome}</p>
                      <p className="text-[11px] text-slate-500">{i.alunoMatricula || 'Sem matrícula'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button"
                              onClick={async () => {
                                const { erro: err } = await aprovarInscricao(i, currentUser);
                                if (err) { mostrar('erro', err); return; }
                                mostrar('ok', `${i.alunoNome} foi incluído na vaga.`);
                                await abrirVaga(vagaAberta);
                              }}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[11px]">
                        Aprovar
                      </button>
                      <button type="button"
                              onClick={async () => {
                                const motivo = window.prompt('Motivo da recusa (o aluno vai ver):') ?? '';
                                if (motivo === null) return;
                                const { erro: err } = await recusarInscricao(i.id!, motivo, currentUser);
                                if (err) { mostrar('erro', err); return; }
                                await abrirVaga(vagaAberta);
                              }}
                              className="px-3 py-2 text-[11px] font-bold text-slate-500 hover:text-rose-600">
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incluir aluno */}
          {vagaAberta.situacao !== 'FECHADA' && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
              <label className={rotulo}>Incluir aluno na vaga</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input className={campo + ' pl-9'} placeholder="Digite o nome ou a matrícula"
                       value={buscaAluno} onChange={e => setBuscaAluno(e.target.value)} />
              </div>
              {candidatos.length > 0 && (
                <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {candidatos.map(a => (
                    <button key={a.id} type="button" onClick={() => void incluir(a)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-white">{a.name}</p>
                      <p className="text-[11px] text-slate-500">{a.enrollment || 'sem matrícula'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de alunos */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    {['Aluno', 'Matrícula', 'Mensalidade', 'Seguro', 'Kit', 'Média', 'Resultado', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-black text-[10px] uppercase text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alunosDaVaga.map(a => {
                    const media = mediaDoAluno(a);
                    return (
                      <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{a.alunoNome}</td>
                        <td className="px-3 py-2 text-slate-500">{a.alunoMatricula || '—'}</td>
                        {(['mensalidadeOk', 'seguroOk', 'kitOk'] as const).map(k => (
                          <td key={k} className="px-3 py-2">
                            <input type="checkbox" checked={!!a[k]}
                                   onChange={async e => {
                                     const novo = { ...a, [k]: e.target.checked };
                                     setAlunosDaVaga(alunosDaVaga.map(x => x.id === a.id ? novo : x));
                                     await atualizarPreRequisitos(a.id!, {
                                       mensalidadeOk: novo.mensalidadeOk,
                                       seguroOk: novo.seguroOk,
                                       kitOk: novo.kitOk,
                                     });
                                   }} />
                          </td>
                        ))}
                        <td className={`px-3 py-2 font-mono font-black ${media === null ? 'text-slate-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {media === null ? '—' : media.toFixed(1).replace('.', ',')}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                            a.resultado === 'APTO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : a.resultado === 'NÃO APTO' ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {a.resultado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button type="button" onClick={() => setFichaImprimir(a)}
                                  title="Imprimir a ficha de avaliação"
                                  className="p-2 text-slate-400 hover:text-blue-600">
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {media !== null && (
                            <button type="button"
                                    onClick={() => { setCorrigindo(a); setNotaCorrigida(media.toFixed(1)); }}
                                    title="Corrigir a nota já lançada no histórico"
                                    className="p-2 text-slate-400 hover:text-amber-600">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {vagaAberta.situacao !== 'FECHADA' && (
                            <button type="button"
                                    onClick={async () => {
                                      if (!window.confirm(`Tirar ${a.alunoNome} da vaga?`)) return;
                                      await removerAlunoDaVaga(a.id!);
                                      await abrirVaga(vagaAberta);
                                    }}
                                    className="p-2 text-slate-300 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {alunosDaVaga.length === 0 && (
              <div className="p-10 text-center text-sm font-bold text-slate-400">
                Nenhum aluno incluído nesta vaga ainda.
              </div>
            )}
            {alunosDaVaga.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {alunosDaVaga.length} aluno(s) ·
                {' '}Total a pagar ao supervisor:{' '}
                <span className="text-blue-700">
                  {formatarDinheiro(alunosDaVaga.length * vagaAberta.valorPorAluno)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {listaImprimir && vagaAberta && (
        <ListaVagaPrintView
          vaga={vagaAberta}
          alunos={alunosDaVaga}
          supervisorRegistro={(() => {
            const s = supervisores.find(x => x.id === vagaAberta.supervisorId);
            return s?.conselho && s?.registro ? `${s.conselho} ${s.registro}` : undefined;
          })()}
          onClose={() => setListaImprimir(false)}
        />
      )}

      {/* CORREÇÃO DE NOTA — só o admin vê este botão e esta janela. */}
      {corrigindo && vagaAberta && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-black text-sm text-slate-800 dark:text-white">
              Corrigir nota no histórico
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {corrigindo.alunoNome} · {nomeOficialDoComponente(vagaAberta.curso, vagaAberta.componente)}
              <br />Esta é a nota que já está no histórico do aluno. Mudar aqui muda lá — não altera
              o que o supervisor lançou na vaga.
            </p>
            <input type="number" step="0.1" min={0} max={10}
                   className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm font-mono"
                   value={notaCorrigida} onChange={e => setNotaCorrigida(e.target.value)} />
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setCorrigindo(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
              <button type="button"
                      onClick={async () => {
                        const valor = Number(notaCorrigida.replace(',', '.'));
                        if (isNaN(valor) || valor < 0 || valor > 10) {
                          mostrar('erro', 'Digite um número de 0 a 10.'); return;
                        }
                        const nomeOficial = nomeOficialDoComponente(vagaAberta.curso, vagaAberta.componente);
                        const { erro: e } = await corrigirNotaHistorico(corrigindo.alunoId, nomeOficial, valor);
                        if (e) { mostrar('erro', e); return; }
                        mostrar('ok', 'Nota corrigida no histórico.');
                        setCorrigindo(null);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
                Salvar correção
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
          supervisorRegistro={(() => {
            const s = supervisores.find(x => x.id === vagaAberta.supervisorId);
            return s?.conselho && s?.registro ? `${s.conselho} ${s.registro}` : undefined;
          })()}
          onClose={() => setFichaImprimir(null)}
        />
      )}
    </div>
  );
};
