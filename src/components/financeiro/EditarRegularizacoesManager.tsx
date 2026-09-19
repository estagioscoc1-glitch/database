import React, { useState, useEffect } from 'react';
import {
  listarRegularizacoes, editarRegularizacao, excluirRegularizacao, RegistroRegularizacao,
} from '../../services/regularizacaoStorage';
import { Search, Trash2, Loader2, Save, CheckCircle2, XCircle } from 'lucide-react';

// ===========================================================================
//  EDITAR REGULARIZAÇÕES
//
//  Aqui dá pra mudar QUALQUER coisa de um registro já importado — mês,
//  número da parcela, status (pago/pendente) e data de pagamento — porque
//  a importação automática é só um ponto de partida, não a palavra final.
//  Toda troca de status fica registrada no log de auditoria.
// ===========================================================================

interface Props {
  currentUser?: string;
}

export const EditarRegularizacoesManager: React.FC<Props> = ({ currentUser = 'Financeiro' }) => {
  const [registros, setRegistros] = useState<RegistroRegularizacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = async () => {
    setCarregando(true);
    setRegistros(await listarRegularizacoes());
    setCarregando(false);
  };

  useEffect(() => { void carregar(); }, []);

  const filtrados = registros.filter(r => {
    if (filtroTipo && r.tipo !== filtroTipo) return false;
    if (busca.trim().length >= 2) {
      const q = busca.toLowerCase();
      return r.alunoNome.toLowerCase().includes(q) || r.alunoMatricula.includes(q);
    }
    return true;
  });

  const handleAlterar = async (r: RegistroRegularizacao, campos: Partial<RegistroRegularizacao>) => {
    setSalvandoId(r.id);
    try {
      const ok = await editarRegularizacao(r.id, campos as any, currentUser);
      if (ok) {
        setRegistros(prev => prev.map(x => x.id === r.id ? { ...x, ...campos } : x));
      } else {
        alert('Não foi possível salvar agora. Tente de novo.');
      }
    } finally {
      setSalvandoId(null);
    }
  };

  const handleExcluir = async (r: RegistroRegularizacao) => {
    if (!confirm(`Excluir o registro de ${r.tipo} de ${r.alunoNome}? Isso não afeta parcelas do financeiro normal, só a regularização retroativa.`)) return;
    const ok = await excluirRegularizacao(r.id, currentUser);
    if (ok) setRegistros(prev => prev.filter(x => x.id !== r.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno ou matrícula..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs"
          />
        </div>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs">
          <option value="">Todos os tipos</option>
          <option value="PARCELA">Parcela</option>
          <option value="SEGURO">Seguro</option>
          <option value="KIT">Kit</option>
          <option value="JALECO">Jaleco</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  {['Aluno', 'Tipo', 'Parcela nº', 'Competência', 'Status', 'Data Pagto.', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-black text-[10px] uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(r => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{r.alunoNome} <span className="text-slate-400 font-normal">({r.alunoMatricula})</span></td>
                    <td className="px-3 py-2">
                      <select value={r.tipo} onChange={(e) => handleAlterar(r, { tipo: e.target.value as any })}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-bold">
                        <option value="PARCELA">Parcela</option>
                        <option value="SEGURO">Seguro</option>
                        <option value="KIT">Kit</option>
                        <option value="JALECO">Jaleco</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {r.tipo === 'PARCELA' ? (
                        <input type="number" min={1} value={r.numeroParcela ?? ''}
                          onChange={(e) => handleAlterar(r, { numeroParcela: parseInt(e.target.value, 10) || null })}
                          className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-center" />
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={r.competencia ?? ''} placeholder="MM/AAAA"
                        onChange={(e) => handleAlterar(r, { competencia: e.target.value || null })}
                        className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono" />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleAlterar(r, { status: r.status === 'PAGO' ? 'PENDENTE' : 'PAGO' })}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${
                          r.status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {r.status === 'PAGO' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {r.status}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" value={r.dataPagamento ?? ''}
                        onChange={(e) => handleAlterar(r, { dataPagamento: e.target.value || null })}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {salvandoId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : (
                        <button type="button" onClick={() => handleExcluir(r)} className="p-1.5 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
