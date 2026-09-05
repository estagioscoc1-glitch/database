import React, { useState, useEffect, useMemo } from 'react';
import {
  listarRecibos, marcarReciboPago, listarSupervisores, formatarDinheiro,
  type ReciboEstagio, type Supervisor,
} from '../../lib/supabaseEstagioModulo';
import {
  Receipt, AlertTriangle, CheckCircle2, RefreshCw, Filter, Wallet,
} from 'lucide-react';

// ===========================================================================
//  PAGAMENTO AOS SUPERVISORES
//
//  Reúne os recibos emitidos ao fechar cada vaga e monta o relatório do que
//  cada supervisor tem a receber.
//
//  TRÊS RECORTES, como a coordenação pediu: por mês, por ano e por
//  supervisor. Os três podem ser combinados — "o que o Jefferson pegou em
//  setembro" é o cruzamento dos três filtros.
//
//  O VALOR NÃO É RECALCULADO AQUI. Cada recibo guarda a quantidade de alunos
//  e o valor por aluno que valiam quando a vaga fechou. Se a escola reajustar
//  o preço depois, recibo antigo continua mostrando o que foi combinado.
// ===========================================================================

const campo = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm';
const rotulo = 'block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1';

export const EstagioPagamentosModule: React.FC<{ currentUser?: string }> = () => {
  const [recibos, setRecibos] = useState<ReciboEstagio[]>([]);
  const [supervisores, setSupervisores] = useState<Supervisor[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [fSupervisor, setFSupervisor] = useState('');
  const [fMes, setFMes] = useState('');
  const [fAno, setFAno] = useState('');
  const [fSituacao, setFSituacao] = useState<'TODOS' | 'PENDENTE' | 'PAGO'>('TODOS');

  const recarregar = async () => {
    setCarregando(true);
    const [r, s] = await Promise.all([listarRecibos(), listarSupervisores()]);
    setRecibos(r.lista); setSupervisores(s.lista);
    setErro(r.erro || s.erro || null);
    setCarregando(false);
  };
  useEffect(() => { void recarregar(); }, []);

  const anos = useMemo(() => {
    const s = new Set(recibos.map(r => (r.competencia || '').split('/')[1]).filter(Boolean));
    return Array.from(s).sort().reverse();
  }, [recibos]);

  const filtrados = useMemo(() => recibos.filter(r => {
    if (fSupervisor && r.supervisorId !== fSupervisor) return false;
    if (fSituacao !== 'TODOS' && r.situacao !== fSituacao) return false;
    const [mes, ano] = (r.competencia || '').split('/');
    if (fMes && mes !== fMes) return false;
    if (fAno && ano !== fAno) return false;
    return true;
  }), [recibos, fSupervisor, fMes, fAno, fSituacao]);

  const total = filtrados.reduce((s, r) => s + r.valorTotal, 0);
  const totalPendente = filtrados.filter(r => r.situacao === 'PENDENTE').reduce((s, r) => s + r.valorTotal, 0);
  const totalAlunos = filtrados.reduce((s, r) => s + r.qtdAlunos, 0);

  /** Total por supervisor — é o que a tesouraria usa para pagar. */
  const porSupervisor = useMemo(() => {
    const mapa: Record<string, { nome: string; qtd: number; alunos: number; total: number; pendente: number }> = {};
    for (const r of filtrados) {
      const chave = r.supervisorId || r.supervisorNome;
      if (!mapa[chave]) mapa[chave] = { nome: r.supervisorNome, qtd: 0, alunos: 0, total: 0, pendente: 0 };
      mapa[chave].qtd += 1;
      mapa[chave].alunos += r.qtdAlunos;
      mapa[chave].total += r.valorTotal;
      if (r.situacao === 'PENDENTE') mapa[chave].pendente += r.valorTotal;
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [filtrados]);

  return (
    <div className="space-y-5">
      {aviso && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {aviso}
        </div>
      )}
      {erro && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <span className="text-xs font-bold text-amber-800 leading-relaxed">{erro}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Wallet className="h-5 w-5" />
            <h3 className="font-black text-sm">Pagamento aos Supervisores</h3>
          </div>
          <button type="button" onClick={() => void recarregar()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[11px]">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase mb-2">
          <Filter className="h-3.5 w-3.5" /> Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className={rotulo}>Supervisor</label>
            <select className={campo} value={fSupervisor} onChange={e => setFSupervisor(e.target.value)}>
              <option value="">Todos</option>
              {supervisores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={rotulo}>Mês</label>
            <select className={campo} value={fMes} onChange={e => setFMes(e.target.value)}>
              <option value="">Todos</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m =>
                <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={rotulo}>Ano</label>
            <select className={campo} value={fAno} onChange={e => setFAno(e.target.value)}>
              <option value="">Todos</option>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={rotulo}>Situação</label>
            <select className={campo} value={fSituacao} onChange={e => setFSituacao(e.target.value as any)}>
              <option value="TODOS">Todas</option>
              <option value="PENDENTE">A pagar</option>
              <option value="PAGO">Pagas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { r: 'Recibos', v: String(filtrados.length), cor: 'bg-slate-100 text-slate-700 border-slate-200' },
          { r: 'Alunos', v: String(totalAlunos), cor: 'bg-blue-50 text-blue-700 border-blue-200' },
          { r: 'Total', v: formatarDinheiro(total), cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { r: 'A pagar', v: formatarDinheiro(totalPendente), cor: 'bg-amber-50 text-amber-700 border-amber-200' },
        ].map(c => (
          <div key={c.r} className={`p-3 rounded-2xl border ${c.cor}`}>
            <p className="text-lg font-black leading-tight">{c.v}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5">{c.r}</p>
          </div>
        ))}
      </div>

      {/* Resumo por supervisor */}
      {porSupervisor.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 font-black text-xs text-slate-600 uppercase tracking-wider">
            Resumo por supervisor
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {['Supervisor', 'Estágios', 'Alunos', 'Total', 'A pagar'].map(h => (
                  <th key={h} className="px-4 py-2 text-left font-black text-[10px] uppercase text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porSupervisor.map(p => (
                <tr key={p.nome} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">{p.nome}</td>
                  <td className="px-4 py-2 text-slate-500">{p.qtd}</td>
                  <td className="px-4 py-2 text-slate-500">{p.alunos}</td>
                  <td className="px-4 py-2 font-mono font-bold text-slate-700 dark:text-slate-200">{formatarDinheiro(p.total)}</td>
                  <td className={`px-4 py-2 font-mono font-bold ${p.pendente > 0 ? 'text-amber-700' : 'text-slate-300'}`}>
                    {formatarDinheiro(p.pendente)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recibos */}
      <div className="space-y-2.5">
        {filtrados.map(r => (
          <div key={r.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-black text-slate-400">{r.numero}</span>
                <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${
                  r.situacao === 'PAGO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {r.situacao === 'PAGO' ? 'Pago' : 'A pagar'}
                </span>
                {r.competencia && (
                  <span className="text-[10px] font-bold text-slate-400">{r.competencia}</span>
                )}
              </div>
              <p className="font-black text-sm text-slate-800 dark:text-white mt-1">{r.supervisorNome}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {r.componente}{r.localNome ? ` · ${r.localNome}` : ''} · {r.qtdAlunos} aluno(s) ×
                {' '}{formatarDinheiro(r.valorPorAluno)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-base text-slate-700 dark:text-slate-200">
                {formatarDinheiro(r.valorTotal)}
              </span>
              <button type="button"
                      onClick={async () => {
                        const { erro: e } = await marcarReciboPago(r.id!, r.situacao !== 'PAGO');
                        if (e) { setErro(e); return; }
                        setAviso(r.situacao === 'PAGO' ? 'Recibo voltou para a pagar.' : 'Recibo marcado como pago.');
                        window.setTimeout(() => setAviso(null), 4000);
                        void recarregar();
                      }}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-black ${
                        r.situacao === 'PAGO' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                {r.situacao === 'PAGO' ? 'Desmarcar' : 'Marcar pago'}
              </button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && !carregando && (
          <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
            <Receipt className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-500">
              {recibos.length === 0
                ? 'Nenhum recibo emitido ainda. Feche uma vaga e clique em Emitir Recibo.'
                : 'Nenhum recibo com esses filtros.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
