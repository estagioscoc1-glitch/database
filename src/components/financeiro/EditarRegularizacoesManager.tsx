import React, { useState, useEffect } from 'react';
import {
  listarRegularizacoesDoAluno, editarRegularizacao, excluirRegularizacao, importarRegularizacoesEmLote,
  RegistroRegularizacao, TipoRegularizacao, seguroAindaValido, getParcelaInicialAluno, salvarParcelaInicialAluno,
} from '../../services/regularizacaoStorage';
import { getInstallments } from '../../services/financeiroStorage';
import { Installment } from '../../types/financeiro';
import { Search, Trash2, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';

// ===========================================================================
//  EDITAR REGULARIZAÇÕES — visão completa por aluno
//
//  Busca um aluno e mostra TUDO num lugar só: todas as parcelas dele (pagas
//  e pendentes, sejam do financeiro normal ou da regularização), Seguro,
//  Kit, Jaleco e Matrícula — com acesso total pra marcar/desmarcar,
//  ajustar mês e data, direto por aqui.
//
//  IMPORTANTE: esta tela NUNCA passa pelo caixa. Regularização retroativa
//  não é um recebimento de dinheiro de verdade (não tem valor, não gera
//  recibo) — por isso não precisa de caixa aberto pra usar, diferente de
//  "Entradas". As parcelas que já vieram do financeiro normal aparecem
//  aqui só pra CONSULTA (ficam com um cadeado) — pra mudar essas de
//  verdade, o caminho continua sendo Entradas/Alteração Vencimentos,
//  porque essas sim mexem em dinheiro e recibo real.
// ===========================================================================

interface Props {
  currentUser?: string;
  allStudentUsers?: any[];
}

const MAX_PARCELAS_PADRAO = 18; // cobre os 3 módulos (1–6, 7–12, 13–18)

interface LinhaParcela {
  numero: number;
  pago: boolean;
  origem: 'NORMAL' | 'RETROATIVO' | 'NENHUMA';
  registroRetroativo?: RegistroRegularizacao;
}

export const EditarRegularizacoesManager: React.FC<Props> = ({ currentUser = 'Financeiro', allStudentUsers = [] }) => {
  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [parcelasReais, setParcelasReais] = useState<Installment[]>([]);
  const [regularizacoes, setRegularizacoes] = useState<RegistroRegularizacao[]>([]);
  const [parcelaInicial, setParcelaInicial] = useState(1);
  const [editandoParcelaInicial, setEditandoParcelaInicial] = useState(false);
  const [novoParcelaInicial, setNovoParcelaInicial] = useState('1');
  const [motivoParcelaInicial, setMotivoParcelaInicial] = useState('');
  const [salvandoParcelaInicial, setSalvandoParcelaInicial] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);

  const alunosFiltrados = busca.trim().length >= 2 && !aluno
    ? allStudentUsers.filter((a: any) => a.name?.toLowerCase().includes(busca.toLowerCase()) || a.enrollment?.includes(busca)).slice(0, 8)
    : [];

  const carregarDoAluno = async (a: any) => {
    setAluno(a);
    setBusca('');
    setCarregando(true);
    try {
      const [todas, reg, pi] = await Promise.all([
        getInstallments(), listarRegularizacoesDoAluno(a.id), getParcelaInicialAluno(a.id),
      ]);
      setParcelasReais(todas.filter(p => p.studentId === a.id));
      setRegularizacoes(reg);
      setParcelaInicial(pi);
      setNovoParcelaInicial(String(pi));
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarParcelaInicial = async () => {
    const n = parseInt(novoParcelaInicial, 10) || 1;
    setSalvandoParcelaInicial(true);
    try {
      const ok = await salvarParcelaInicialAluno(aluno.id, n, motivoParcelaInicial, currentUser);
      if (ok) { setParcelaInicial(n); setEditandoParcelaInicial(false); }
      else alert('Não foi possível salvar agora.');
    } finally {
      setSalvandoParcelaInicial(false);
    }
  };

  // ------------------------------------------------------------ montagem das parcelas
  // Mesma correção do bug de numeração aplicada na aba do aluno: o
  // financeiro normal numera sempre a partir de "1", então precisa de um
  // deslocamento pelo tanto de parcelas retroativas já existentes, senão
  // a parcela atual (financeiro normal) bate de frente com a 1ª retroativa.
  const numerosRetroativosBrutos = regularizacoes.filter(r => r.tipo === 'PARCELA').map(r => r.numeroParcela ?? 0);
  // Mesmo ajuste do arquivo da aba do aluno: o deslocamento considera
  // também a parcela inicial configurada manualmente (aproveitamento de
  // estudos), não só as parcelas retroativas importadas.
  const deslocamento = Math.max(
    numerosRetroativosBrutos.length > 0 ? Math.max(...numerosRetroativosBrutos) : 0,
    parcelaInicial - 1
  );

  const numerosReais = new Map(parcelasReais.map(p => [deslocamento + p.number, p]));
  const numerosRetroativos = new Map(
    regularizacoes.filter(r => r.tipo === 'PARCELA' && r.numeroParcela != null).map(r => [r.numeroParcela as number, r])
  );
  const maiorNumero = Math.max(
    MAX_PARCELAS_PADRAO,
    deslocamento,
    ...parcelasReais.map(p => deslocamento + (p.totalInstallments || p.number || 0))
  );

  const linhasParcelas: LinhaParcela[] = [];
  for (let n = parcelaInicial; n <= maiorNumero; n++) {
    if (n > deslocamento) {
      const real = numerosReais.get(n);
      if (real) {
        linhasParcelas.push({ numero: n, pago: real.status === 'PAGA' || real.status === 'ABONADA', origem: 'NORMAL' });
        continue;
      }
    }
    const retro = numerosRetroativos.get(n);
    if (retro) {
      linhasParcelas.push({ numero: n, pago: retro.status === 'PAGO', origem: 'RETROATIVO', registroRetroativo: retro });
      continue;
    }
    linhasParcelas.push({ numero: n, pago: false, origem: 'NENHUMA' });
  }

  // ------------------------------------------------------------ toggles
  const handleToggleParcela = async (linha: LinhaParcela) => {
    if (linha.origem === 'NORMAL') return; // read-only — gerenciado pelo financeiro normal
    const chave = `parcela-${linha.numero}`;
    setSalvandoChave(chave);
    try {
      if (linha.registroRetroativo) {
        const novoStatus = linha.pago ? 'PENDENTE' : 'PAGO';
        const ok = await editarRegularizacao(linha.registroRetroativo.id, { status: novoStatus }, currentUser);
        if (ok) setRegularizacoes(prev => prev.map(r => r.id === linha.registroRetroativo!.id ? { ...r, status: novoStatus } : r));
      } else {
        // Ainda não existe registro nenhum pra essa parcela — cria um novo, já como PAGO.
        const res = await importarRegularizacoesEmLote([{
          alunoId: aluno.id, alunoMatricula: aluno.enrollment || '—', alunoNome: aluno.name,
          tipo: 'PARCELA', numeroParcela: linha.numero, status: 'PAGO',
          origemPlanilha: 'Lançamento manual em Editar Regularizações',
        }], currentUser);
        if (res.ok) await carregarDoAluno(aluno);
      }
    } finally {
      setSalvandoChave(null);
    }
  };

  const itemExtra = (tipo: TipoRegularizacao) => regularizacoes.find(r => r.tipo === tipo);

  const handleToggleExtra = async (tipo: TipoRegularizacao) => {
    const chave = `extra-${tipo}`;
    setSalvandoChave(chave);
    try {
      const existente = itemExtra(tipo);
      if (existente) {
        const novoStatus = existente.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
        const ok = await editarRegularizacao(existente.id, { status: novoStatus }, currentUser);
        if (ok) setRegularizacoes(prev => prev.map(r => r.id === existente.id ? { ...r, status: novoStatus } : r));
      } else {
        const res = await importarRegularizacoesEmLote([{
          alunoId: aluno.id, alunoMatricula: aluno.enrollment || '—', alunoNome: aluno.name,
          tipo, status: 'PAGO', origemPlanilha: 'Lançamento manual em Editar Regularizações',
        }], currentUser);
        if (res.ok) await carregarDoAluno(aluno);
      }
    } finally {
      setSalvandoChave(null);
    }
  };

  const handleDataExtra = async (tipo: TipoRegularizacao, data: string) => {
    const existente = itemExtra(tipo);
    if (!existente) return;
    const ok = await editarRegularizacao(existente.id, { dataPagamento: data || null }, currentUser);
    if (ok) setRegularizacoes(prev => prev.map(r => r.id === existente.id ? { ...r, dataPagamento: data || null } : r));
  };

  const handleExcluirExtra = async (tipo: TipoRegularizacao) => {
    const existente = itemExtra(tipo);
    if (!existente) return;
    if (!confirm(`Excluir o registro de ${tipo}?`)) return;
    const ok = await excluirRegularizacao(existente.id, currentUser);
    if (ok) setRegularizacoes(prev => prev.filter(r => r.id !== existente.id));
  };

  // ============================================================== render
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
          Essa tela não passa pelo caixa — não precisa ter um caixa aberto pra usar. Regularização retroativa não
          gera recibo nem entra em receita, só marca a situação do aluno.
        </p>
      </div>

      {!aluno ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno por nome ou matrícula..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs"
          />
          {alunosFiltrados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
              {alunosFiltrados.map((a: any) => (
                <button key={a.id} onClick={() => carregarDoAluno(a)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 flex justify-between">
                  <span className="font-bold">{a.name}</span>
                  <span className="text-slate-400">{a.enrollment}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between p-3 bg-slate-800 dark:bg-slate-950 rounded-xl">
            <div>
              <p className="font-black text-white text-sm">{aluno.name}</p>
              <p className="text-[11px] text-slate-300">Matrícula: {aluno.enrollment || '—'}</p>
            </div>
            <button onClick={() => { setAluno(null); setParcelasReais([]); setRegularizacoes([]); }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-[11px]">
              Trocar aluno
            </button>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            {!editandoParcelaInicial ? (
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  Mostrando a partir da parcela <strong>{parcelaInicial}ª</strong>
                  {parcelaInicial > 1 && ' (aproveitamento de estudos ou similar)'}.
                </p>
                <button onClick={() => setEditandoParcelaInicial(true)} className="text-[11px] font-bold text-amber-700 hover:underline">
                  Ajustar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  Use isso só quando o aluno NUNCA deveu as parcelas anteriores (ex.: aproveitamento de estudos,
                  entrou direto num módulo mais avançado). Não use pra esconder parcela atrasada.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">Parcela inicial:</span>
                  <input type="number" min={1} value={novoParcelaInicial} onChange={(e) => setNovoParcelaInicial(e.target.value)}
                    className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-bold text-center" />
                  <input type="text" value={motivoParcelaInicial} onChange={(e) => setMotivoParcelaInicial(e.target.value)}
                    placeholder="Motivo (ex.: aproveitamento de estudos)"
                    className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs" />
                  <button onClick={handleSalvarParcelaInicial} disabled={salvandoParcelaInicial}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-black rounded-lg text-[11px]">
                    {salvandoParcelaInicial ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button onClick={() => setEditandoParcelaInicial(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px]">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {carregando ? (
            <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5">
                <h4 className="text-xs font-black uppercase text-slate-500 mb-3">Mensalidades — clique pra marcar/desmarcar</h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {linhasParcelas.map(l => {
                    const chave = `parcela-${l.numero}`;
                    const bloqueada = l.origem === 'NORMAL';
                    return (
                      <button
                        key={l.numero}
                        type="button"
                        disabled={bloqueada || salvandoChave === chave}
                        onClick={() => handleToggleParcela(l)}
                        title={bloqueada ? 'Parcela do financeiro normal — gerencie em Entradas ou Alteração Vencimentos' : 'Clique pra marcar/desmarcar'}
                        className={`relative text-center p-2.5 rounded-xl border font-black text-xs transition-all ${
                          l.pago
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                        } ${bloqueada ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                      >
                        {salvandoChave === chave ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : (
                          <>
                            <div>{l.numero}ª</div>
                            <div className="text-[9px] font-bold uppercase mt-0.5">{l.pago ? 'Paga' : 'Pendente'}</div>
                            {bloqueada && <div className="text-[8px] text-slate-400 normal-case">normal 🔒</div>}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500">Outros Itens</h4>
                {(['SEGURO', 'KIT', 'JALECO', 'MATRICULA', 'DEPENDENCIA'] as TipoRegularizacao[]).map(tipo => {
                  const item = itemExtra(tipo);
                  const pago = item?.status === 'PAGO';
                  const chave = `extra-${tipo}`;
                  const seguroVencido = tipo === 'SEGURO' && pago && item?.dataPagamento && !seguroAindaValido(item.dataPagamento);
                  return (
                    <div key={tipo} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                      <button
                        type="button" disabled={salvandoChave === chave} onClick={() => handleToggleExtra(tipo)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[11px] uppercase min-w-[140px] justify-center ${
                          pago ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                               : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {salvandoChave === chave ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (pago ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />)}
                        {tipo} — {pago ? 'Pago' : 'Pendente'}
                      </button>

                      {tipo === 'SEGURO' && pago && (
                        <>
                          <input type="date" value={item?.dataPagamento ?? ''} onChange={(e) => handleDataExtra(tipo, e.target.value)}
                            className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs" />
                          {seguroVencido && <span className="text-[10px] font-black text-amber-600 uppercase">Vencido (+ de 1 ano)</span>}
                        </>
                      )}

                      {item && (
                        <button onClick={() => handleExcluirExtra(tipo)} className="ml-auto p-1.5 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
