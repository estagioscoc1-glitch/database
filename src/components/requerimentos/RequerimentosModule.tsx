import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import {
  listarTipos, listarRequerimentos, salvarRequerimento, mudarSituacao,
  marcarTaxaPaga, apagarRequerimento, gerarProtocolo, somarDias,
  salvarTipo, apagarTipo, SITUACOES,
  type TipoRequerimento, type Requerimento, type SituacaoRequerimento,
} from '../../lib/supabaseRequerimentos';
import {
  FileText, Plus, Search, Inbox, Settings2, AlertTriangle, Trash2,
  CheckCircle2, Clock, CalendarClock, RefreshCw, X, Save, DollarSign,
  FileSignature, Stamp, ClipboardList, ScrollText,
} from 'lucide-react';
import { ContratosModule } from '../contratos/ContratosModule';
import { DeclaracoesModule } from '../declaracoes/DeclaracoesModule';
import { FichaEstagioModule } from '../estagios/FichaEstagioModule';
import { HistoricoEscolarModule } from '../historico/HistoricoEscolarModule';

// ===========================================================================
//  MENU REQUERIMENTOS
//
//  Fila de pedidos de documento da secretaria: Histórico, Declaração de
//  Conclusão, Diploma, Segunda Via de Diploma, Transferência, Contrato e
//  Requerimento de Matrícula.
//
//  TUDO É GRAVADO NO BANCO DE DADOS (Supabase). A tela antiga que existia
//  dentro do menu Movimentação guardava no localStorage, ou seja, dentro do
//  navegador de UM computador: o pedido aberto pela secretária não aparecia
//  pra mais ninguém e sumia se limpassem o cache. Aquela tela continua no
//  código, escondida, e não deve ser usada.
//
//  Sobre a TAXA: ela é conferida à mão pela secretaria (um botão "Paga /
//  Não paga"). A conferência automática de inadimplência depende do menu
//  Financeiro, que ainda não foi ligado ao banco — quando for, é aqui que
//  entra o aviso automático de aluno devedor.
// ===========================================================================

const hoje = () => new Date().toISOString().split('T')[0];

const formatarData = (iso?: string) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

const formatarDinheiro = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  currentUser?: string;
}

export const RequerimentosModule: React.FC<Props> = ({ currentUser = 'Administração' }) => {
  const { users, classes, courses } = useApp();

  const [aba, setAba] = useState<'fila' | 'novo' | 'tipos' | 'contratos' | 'declaracoes' | 'ficha' | 'historico' | 'historico'>('fila');
  const [tipos, setTipos] = useState<TipoRequerimento[]>([]);
  const [pedidos, setPedidos] = useState<Requerimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroBanco, setErroBanco] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // ---- filtros da fila
  const [filtroSituacao, setFiltroSituacao] = useState<'TODOS' | SituacaoRequerimento>('TODOS');
  const [busca, setBusca] = useState('');

  // ---- formulário de novo pedido
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunoEscolhido, setAlunoEscolhido] = useState<any | null>(null);
  const [tipoEscolhidoId, setTipoEscolhidoId] = useState('');
  const [dataPedido, setDataPedido] = useState(hoje());
  const [obsPedido, setObsPedido] = useState('');
  const [taxaPedido, setTaxaPedido] = useState(0);
  const [taxaPagaPedido, setTaxaPagaPedido] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // ---- edição de tipo
  const [tipoEmEdicao, setTipoEmEdicao] = useState<TipoRequerimento | null>(null);

  const mostrar = (tipo: 'ok' | 'erro', texto: string) => {
    setAviso({ tipo, texto });
    window.setTimeout(() => setAviso(null), 5000);
  };

  const recarregar = async () => {
    setCarregando(true);
    const [resTipos, resPedidos] = await Promise.all([listarTipos(), listarRequerimentos()]);
    setTipos(resTipos.tipos);
    setPedidos(resPedidos.lista);
    setErroBanco(resTipos.erro || resPedidos.erro || null);
    setCarregando(false);
  };

  useEffect(() => { void recarregar(); }, []);

  const alunos = useMemo(
    () => users.filter(u => u.role === UserRole.STUDENT),
    [users]
  );

  const alunosFiltrados = useMemo(() => {
    const termo = buscaAluno.trim().toLowerCase();
    if (termo.length < 2) return [];
    return alunos
      .filter(a =>
        a.name?.toLowerCase().includes(termo) ||
        (a.enrollment ?? '').toLowerCase().includes(termo)
      )
      .slice(0, 8);
  }, [alunos, buscaAluno]);

  /** Descobre o curso do aluno pela turma dele, pra gravar junto no pedido. */
  const cursoDoAluno = (aluno: any): string | undefined => {
    const turma = classes.find(c => c.id === aluno?.classId);
    const curso = courses.find(c => c.id === (turma as any)?.courseId || c.id === aluno?.courseId);
    return curso?.name;
  };

  const tipoEscolhido = tipos.find(t => t.id === tipoEscolhidoId);

  // Quando muda o tipo, já sugere a taxa cadastrada nele.
  useEffect(() => {
    if (!tipoEscolhido) return;
    setTaxaPedido(tipoEscolhido.taxa);
    setTaxaPagaPedido(!tipoEscolhido.taxaObrigatoria || tipoEscolhido.taxa === 0);
  }, [tipoEscolhidoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const limparFormulario = () => {
    setBuscaAluno('');
    setAlunoEscolhido(null);
    setTipoEscolhidoId('');
    setDataPedido(hoje());
    setObsPedido('');
    setTaxaPedido(0);
    setTaxaPagaPedido(false);
  };

  const abrirPedido = async () => {
    if (!alunoEscolhido || !tipoEscolhido) return;
    setSalvando(true);

    const protocolo = await gerarProtocolo();
    const novo: Requerimento = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      protocolo,
      alunoId: alunoEscolhido.id,
      alunoNome: alunoEscolhido.name,
      alunoMatricula: alunoEscolhido.enrollment,
      cursoNome: cursoDoAluno(alunoEscolhido),
      tipoId: tipoEscolhido.id,
      tipoNome: tipoEscolhido.nome,
      situacao: 'SOLICITADO',
      solicitadoEm: dataPedido,
      prazoEm: somarDias(dataPedido, tipoEscolhido.prazoDias),
      taxa: taxaPedido,
      taxaPaga: taxaPagaPedido,
      observacoes: obsPedido.trim() || undefined,
      atendente: currentUser,
    };

    const { erro } = await salvarRequerimento(novo);
    setSalvando(false);

    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', `Requerimento ${protocolo} aberto com sucesso.`);
    limparFormulario();
    setAba('fila');
    void recarregar();
  };

  const trocarSituacao = async (req: Requerimento, situacao: SituacaoRequerimento) => {
    const { erro } = await mudarSituacao(req.id, situacao);
    if (erro) { mostrar('erro', erro); return; }
    void recarregar();
  };

  const alternarTaxa = async (req: Requerimento) => {
    const { erro } = await marcarTaxaPaga(req.id, !req.taxaPaga);
    if (erro) { mostrar('erro', erro); return; }
    void recarregar();
  };

  const excluir = async (req: Requerimento) => {
    if (!window.confirm(
      `Apagar o requerimento ${req.protocolo} de ${req.alunoNome}?\n\n` +
      `Isso some do sistema pra sempre. Se o pedido só foi desistido, prefira ` +
      `mudar a situação para "Cancelado" — assim o histórico fica registrado.`
    )) return;
    const { erro } = await apagarRequerimento(req.id);
    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', 'Requerimento apagado.');
    void recarregar();
  };

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter(p => {
      if (filtroSituacao !== 'TODOS' && p.situacao !== filtroSituacao) return false;
      if (!termo) return true;
      return (
        p.alunoNome.toLowerCase().includes(termo) ||
        p.protocolo.toLowerCase().includes(termo) ||
        p.tipoNome.toLowerCase().includes(termo) ||
        (p.alunoMatricula ?? '').toLowerCase().includes(termo)
      );
    });
  }, [pedidos, filtroSituacao, busca]);

  const contarPor = (s: SituacaoRequerimento) => pedidos.filter(p => p.situacao === s).length;

  const estaAtrasado = (p: Requerimento) =>
    !!p.prazoEm && p.prazoEm < hoje() && p.situacao !== 'ENTREGUE' && p.situacao !== 'CANCELADO';

  const salvarTipoEditado = async () => {
    if (!tipoEmEdicao || !tipoEmEdicao.nome.trim()) return;
    const { erro } = await salvarTipo(tipoEmEdicao);
    if (erro) { mostrar('erro', erro); return; }
    mostrar('ok', 'Tipo de requerimento salvo.');
    setTipoEmEdicao(null);
    void recarregar();
  };

  const excluirTipo = async (t: TipoRequerimento) => {
    if (!window.confirm(
      `Apagar o tipo "${t.nome}"?\n\nOs requerimentos já abertos continuam ` +
      `existindo e guardam o nome do tipo como estava na data do pedido.`
    )) return;
    const { erro } = await apagarTipo(t.id);
    if (erro) { mostrar('erro', erro); return; }
    void recarregar();
  };

  // =========================================================== RENDERIZAÇÃO

  return (
    <div className="space-y-5">

      {/* Avisos */}
      {aviso && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-bold ${
          aviso.tipo === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {aviso.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{aviso.texto}</span>
        </div>
      )}

      {erroBanco && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-xs font-bold leading-relaxed">
            {erroBanco}
          </div>
        </div>
      )}

      {/* Cabeçalho + abas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <FileText className="h-5 w-5" />
            <h3 className="font-black text-sm">Requerimentos</h3>
          </div>
          <button
            type="button"
            onClick={() => void recarregar()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[11px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          {([
            { id: 'fila',  rotulo: 'Fila de Pedidos', icone: Inbox },
            { id: 'novo',  rotulo: 'Novo Requerimento', icone: Plus },
            { id: 'tipos', rotulo: 'Tipos e Prazos', icone: Settings2 },
            { id: 'contratos', rotulo: 'Contratos', icone: FileSignature },
            { id: 'declaracoes', rotulo: 'Declarações', icone: Stamp },
            { id: 'ficha', rotulo: 'Ficha de Estágio', icone: ClipboardList },
            { id: 'historico', rotulo: 'Histórico Escolar', icone: ScrollText },
          ] as const).map(t => {
            const Icone = t.icone;
            const ativa = aba === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAba(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
                  ativa
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <Icone className={`h-4 w-4 ${ativa ? 'text-white' : 'text-blue-600'}`} />
                {t.rotulo}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------- FILA */}
      {aba === 'fila' && (
        <div className="space-y-4">

          {/* Contadores */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SITUACOES.map(s => (
              <button
                key={s.valor}
                type="button"
                onClick={() => setFiltroSituacao(filtroSituacao === s.valor ? 'TODOS' : s.valor)}
                className={`p-3 rounded-2xl border text-left transition-all ${s.cor} ${
                  filtroSituacao === s.valor ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <p className="text-2xl font-black leading-none">{contarPor(s.valor)}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide mt-1">{s.rotulo}</p>
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome, matrícula, protocolo ou tipo"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
              />
            </div>
            {filtroSituacao !== 'TODOS' && (
              <button
                type="button"
                onClick={() => setFiltroSituacao('TODOS')}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold text-blue-600"
              >
                <X className="h-3 w-3" /> Mostrando só "{SITUACOES.find(s => s.valor === filtroSituacao)?.rotulo}" — limpar filtro
              </button>
            )}
          </div>

          {/* Lista */}
          {carregando ? (
            <div className="p-12 text-center text-sm font-bold text-slate-400">Carregando…</div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
              <Inbox className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">
                {pedidos.length === 0
                  ? 'Nenhum requerimento aberto ainda. Use a aba "Novo Requerimento".'
                  : 'Nenhum pedido encontrado com esse filtro.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pedidosFiltrados.map(p => {
                const cor = SITUACOES.find(s => s.valor === p.situacao)?.cor ?? '';
                const atrasado = estaAtrasado(p);
                return (
                  <div
                    key={p.id}
                    className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-sm ${
                      atrasado ? 'border-rose-300' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] font-black text-slate-400">{p.protocolo}</span>
                          <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${cor}`}>
                            {SITUACOES.find(s => s.valor === p.situacao)?.rotulo}
                          </span>
                          {atrasado && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black uppercase flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" /> Prazo vencido
                            </span>
                          )}
                        </div>
                        <p className="font-black text-sm text-slate-800 dark:text-white mt-1.5 truncate">
                          {p.alunoNome}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                          {p.tipoNome}
                          {p.alunoMatricula ? ` · Matrícula ${p.alunoMatricula}` : ''}
                          {p.cursoNome ? ` · ${p.cursoNome}` : ''}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                          <Clock className="h-3 w-3" />
                          Pedido em {formatarData(p.solicitadoEm)} · Prazo {formatarData(p.prazoEm)}
                          {p.entregueEm ? ` · Entregue em ${formatarData(p.entregueEm)}` : ''}
                        </p>
                        {p.observacoes && (
                          <p className="text-[11px] text-slate-500 mt-1.5 italic">{p.observacoes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {p.taxa > 0 && (
                          <button
                            type="button"
                            onClick={() => void alternarTaxa(p)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-black ${
                              p.taxaPaga
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}
                            title="Clique para alternar entre paga e não paga"
                          >
                            <DollarSign className="h-3 w-3" />
                            {formatarDinheiro(p.taxa)} · {p.taxaPaga ? 'PAGA' : 'A PAGAR'}
                          </button>
                        )}

                        <select
                          value={p.situacao}
                          onChange={e => void trocarSituacao(p, e.target.value as SituacaoRequerimento)}
                          className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-[11px] font-bold outline-none"
                        >
                          {SITUACOES.map(s => (
                            <option key={s.valor} value={s.valor}>{s.rotulo}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void excluir(p)}
                          className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                          title="Apagar de vez"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------ NOVO PEDIDO */}
      {aba === 'novo' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">

          {/* Aluno */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              1. Quem está pedindo
            </label>
            {alunoEscolhido ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-2xl">
                <div className="min-w-0">
                  <p className="font-black text-sm text-slate-800 dark:text-white truncate">{alunoEscolhido.name}</p>
                  <p className="text-[11px] font-bold text-slate-500">
                    {alunoEscolhido.enrollment ? `Matrícula ${alunoEscolhido.enrollment}` : 'Sem matrícula cadastrada'}
                    {cursoDoAluno(alunoEscolhido) ? ` · ${cursoDoAluno(alunoEscolhido)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setAlunoEscolhido(null); setBuscaAluno(''); }}
                  className="p-2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={buscaAluno}
                    onChange={e => setBuscaAluno(e.target.value)}
                    placeholder="Digite o nome ou a matrícula do aluno"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
                  />
                </div>
                {alunosFiltrados.length > 0 && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {alunosFiltrados.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAlunoEscolhido(a)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <p className="font-bold text-sm text-slate-800 dark:text-white">{a.name}</p>
                        <p className="text-[11px] text-slate-500">{a.enrollment || 'sem matrícula'}</p>
                      </button>
                    ))}
                  </div>
                )}
                {buscaAluno.trim().length >= 2 && alunosFiltrados.length === 0 && (
                  <p className="mt-2 text-[11px] font-bold text-slate-400">Nenhum aluno encontrado.</p>
                )}
              </>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              2. O que está sendo pedido
            </label>
            <select
              value={tipoEscolhidoId}
              onChange={e => setTipoEscolhidoId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
            >
              <option value="">Escolha…</option>
              {tipos.filter(t => t.ativo).map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            {tipoEscolhido?.observacao && (
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{tipoEscolhido.observacao}</p>
            )}
          </div>

          {/* Data e prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                3. Data do pedido
              </label>
              <input
                type="date"
                value={dataPedido}
                onChange={e => setDataPedido(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                Prazo de entrega
              </label>
              <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300">
                {tipoEscolhido
                  ? `${formatarData(somarDias(dataPedido, tipoEscolhido.prazoDias))} (${tipoEscolhido.prazoDias} dias)`
                  : 'Escolha o tipo primeiro'}
              </div>
            </div>
          </div>

          {/* Taxa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                4. Taxa (R$)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={taxaPedido}
                onChange={e => setTaxaPedido(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={taxaPagaPedido}
                  onChange={e => setTaxaPagaPedido(e.target.checked)}
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Taxa já paga</span>
              </label>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
              5. Observações (opcional)
            </label>
            <textarea
              value={obsPedido}
              onChange={e => setObsPedido(e.target.value)}
              rows={2}
              placeholder="Ex.: aluno vai retirar pessoalmente"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => void abrirPedido()}
              disabled={!alunoEscolhido || !tipoEscolhido || salvando}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-xs transition-all"
            >
              <Save className="h-4 w-4" /> {salvando ? 'Abrindo…' : 'Abrir Requerimento'}
            </button>
            <button
              type="button"
              onClick={limparFormulario}
              className="px-4 py-3 text-slate-500 font-bold text-xs hover:text-slate-800"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- TIPOS */}
      {aba === 'tipos' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTipoEmEdicao({
                id: '', nome: '', categoria: 'OUTROS', prazoDias: 5, taxa: 0,
                taxaObrigatoria: false, exigeCurso: true, ativo: true, ordem: tipos.length + 1,
              })}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
            >
              <Plus className="h-4 w-4" /> Novo Tipo
            </button>
          </div>

          {tipoEmEdicao && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-blue-300 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Nome</label>
                  <input
                    type="text"
                    value={tipoEmEdicao.nome}
                    onChange={e => setTipoEmEdicao({ ...tipoEmEdicao, nome: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Prazo (dias)</label>
                  <input
                    type="number" min={0}
                    value={tipoEmEdicao.prazoDias}
                    onChange={e => setTipoEmEdicao({ ...tipoEmEdicao, prazoDias: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Taxa (R$)</label>
                  <input
                    type="number" min={0} step="0.01"
                    value={tipoEmEdicao.taxa}
                    onChange={e => setTipoEmEdicao({ ...tipoEmEdicao, taxa: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5">Explicação (aparece na hora de pedir)</label>
                  <textarea
                    rows={2}
                    value={tipoEmEdicao.observacao ?? ''}
                    onChange={e => setTipoEmEdicao({ ...tipoEmEdicao, observacao: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void salvarTipoEditado()}
                  disabled={!tipoEmEdicao.nome.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-xl text-xs"
                >
                  <Save className="h-4 w-4" /> Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEmEdicao(null)}
                  className="px-4 py-2.5 text-slate-500 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {tipos.length === 0 && !carregando ? (
            <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
              <Settings2 className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">
                Nenhum tipo cadastrado. Rode o arquivo supabase/15_requerimentos.sql no Supabase — ele já cria os sete tipos da escola.
              </p>
            </div>
          ) : (
            tipos.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="font-black text-sm text-slate-800 dark:text-white">{t.nome}</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    Prazo de {t.prazoDias} dias
                    {t.taxa > 0 ? ` · Taxa ${formatarDinheiro(t.taxa)}` : ' · Sem taxa'}
                  </p>
                  {t.observacao && (
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{t.observacao}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTipoEmEdicao(t)}
                    className="px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-xl"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void excluirTipo(t)}
                    className="p-2 text-slate-300 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {/* Contratos — tela própria, com geração e editor de modelo.
          Fica aqui porque "Contrato" também é um dos tipos de requerimento
          que a secretaria atende, então o atendente não precisa trocar de menu. */}
      {aba === 'contratos' && <ContratosModule currentUser={currentUser} />}

      {/* Declarações — os cinco modelos, incluindo os três que o aluno também
          emite sozinho pelo painel dele (Escolaridade, SETRANSP e Vacina). */}
      {aba === 'declaracoes' && <DeclaracoesModule currentUser={currentUser} />}

      {/* Ficha Geral de Estágio — o "Resumo das Avaliações dos Estágios
          Curriculares", que vai assinado pela secretaria, pela coordenação
          de estágio e pela direção. */}
      {aba === 'ficha' && <FichaEstagioModule currentUser={currentUser} />}

      {/* Histórico Escolar — completo ou parcial. O parcial é o que a escola
          chama de "Modelo de Transferência". Trava por curso: cada curso tem
          resolução, carga horária e competências próprias. */}
      {aba === 'historico' && <HistoricoEscolarModule currentUser={currentUser} />}

      {/* Histórico Escolar — completo ou parcial. O parcial é o que a escola
          chama de "Modelo de Transferência". Cada curso tem o seu modelo,
          com resolução, carga horária e competências próprias. */}
      {aba === 'historico' && <HistoricoEscolarModule currentUser={currentUser} />}
    </div>
  );
};
