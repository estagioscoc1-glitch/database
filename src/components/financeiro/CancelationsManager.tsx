import React, { useState, useEffect } from 'react';
import { FinancialReceipt, PaymentMethodItem } from '../../types/financeiro';
import { 
  getReceipts, cancelReceipt, updateReceiptPaymentMethod, getPaymentMethods 
} from '../../services/financeiroStorage';
import { XCircle, RefreshCw, Search, ShieldAlert, Edit3, CheckCircle2 } from 'lucide-react';

interface CancelationsManagerProps {
  currentUser?: string;
  isAdmin?: boolean;
}

export const CancelationsManager: React.FC<CancelationsManagerProps> = ({ 
  currentUser = 'Tesouraria',
  isAdmin = true 
}) => {
  const [receipts, setReceipts] = useState<FinancialReceipt[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialReceipt | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Edit Payment Method Modal State
  const [editMethodReceipt, setEditMethodReceipt] = useState<FinancialReceipt | null>(null);
  const [newMethod, setNewMethod] = useState('');

  const refreshData = () => {
    setReceipts(getReceipts());
    setPaymentMethods(getPaymentMethods().filter(m => m.active));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceipt || !cancelReason.trim()) return;

    if (confirm(`Deseja realmente CANCELAR o recibo #${selectedReceipt.receiptNumber}? O lançamento será estornado e reaberto.`)) {
      cancelReceipt(selectedReceipt.receiptNumber, currentUser, cancelReason.trim());
      setSelectedReceipt(null);
      setCancelReason('');
      refreshData();
    }
  };

  const handleEditMethodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMethodReceipt || !newMethod) return;

    const res = updateReceiptPaymentMethod(editMethodReceipt.receiptNumber, newMethod, currentUser, isAdmin);
    alert(res.message);
    if (res.success) {
      setEditMethodReceipt(null);
      refreshData();
    }
  };

  const filteredReceipts = receipts.filter(r => 
    r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.enrollment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-1">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <XCircle className="h-5 w-5 text-rose-600" /> Cancelamento, Estornos & Alteração de Forma de Pagamento
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pesquise por número de recibo para estornar um recebimento ou alterar a forma de pagamento do lançamento.
        </p>
      </div>

      {/* Receipts Search & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nº de recibo, aluno ou matrícula..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Recibo Nº</th>
                <th className="p-3.5">Data / Hora</th>
                <th className="p-3.5">Aluno</th>
                <th className="p-3.5">Descrição Lançamento</th>
                <th className="p-3.5">Forma Pagto</th>
                <th className="p-3.5 text-right">Valor (R$)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhum recibo encontrado.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((rc) => (
                  <tr key={rc.receiptNumber} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-mono font-black text-blue-600">{rc.receiptNumber}</td>
                    <td className="p-3.5 font-mono text-slate-500">{new Date(rc.date).toLocaleString('pt-BR')}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{rc.studentName}</td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">{rc.description}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">{rc.paymentMethod}</td>
                    <td className="p-3.5 text-right font-mono font-black text-emerald-600">R$ {rc.totalValue.toFixed(2)}</td>
                    <td className="p-3.5 text-center">
                      {rc.status === 'VALIDO' ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                          Válido
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full text-[10px] font-black uppercase">
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      {rc.status === 'VALIDO' && (
                        <>
                          <button
                            onClick={() => {
                              setEditMethodReceipt(rc);
                              setNewMethod(rc.paymentMethod);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] cursor-pointer"
                          >
                            Mudar Forma
                          </button>
                          <button
                            onClick={() => setSelectedReceipt(rc)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 font-extrabold rounded-lg text-[11px] cursor-pointer"
                          >
                            Estornar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* CANCEL MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-rose-600 uppercase tracking-wider">
                Estornar Recibo #{selectedReceipt.receiptNumber}
              </h3>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Esta ação cancelará o recibo de R$ {selectedReceipt.totalValue.toFixed(2)} do aluno <strong>{selectedReceipt.studentName}</strong> e reabrirá a cobrança pendente.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Motivo do Estorno / Cancelamento (*)</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Lançamento em duplicidade ou erro na forma de pagamento..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Confirmar Estorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT METHOD MODAL */}
      {editMethodReceipt && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Alterar Forma de Pagamento
              </h3>
              <button onClick={() => setEditMethodReceipt(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="text-xs space-y-1">
              <p className="text-slate-500">Recibo: <strong>#{editMethodReceipt.receiptNumber}</strong></p>
              <p className="text-slate-500">Aluno: <strong>{editMethodReceipt.studentName}</strong></p>
            </div>

            <form onSubmit={handleEditMethodSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Nova Forma de Pagamento (*)</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditMethodReceipt(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Atualizar Forma de Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
