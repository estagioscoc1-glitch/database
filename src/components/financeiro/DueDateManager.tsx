import React, { useState, useEffect } from 'react';
import { Installment } from '../../types/financeiro';
import { getInstallments, updateInstallmentDueDate } from '../../services/financeiroStorage';
import { Calendar, Search, Edit3, CheckCircle2, Clock } from 'lucide-react';

interface DueDateManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const DueDateManager: React.FC<DueDateManagerProps> = ({ 
  currentUser = 'Financeiro',
  allStudentUsers = [] 
}) => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedInst, setSelectedInst] = useState<Installment | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDiscountValue, setNewDiscountValue] = useState('0.00');
  const [newDiscountLimitDate, setNewDiscountLimitDate] = useState('');
  const [newInterestStartDate, setNewInterestStartDate] = useState('');
  const [reason, setReason] = useState('');

  const refreshData = () => {
    setInstallments(getInstallments().filter(i => i.status === 'PENDENTE'));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const openModal = (inst: Installment) => {
    setSelectedInst(inst);
    setNewDueDate(inst.dueDate);
    setNewDiscountValue(inst.discountValue.toString());
    setNewDiscountLimitDate(inst.discountLimitDate);
    setNewInterestStartDate(inst.interestStartDate);
    setReason('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !reason.trim()) {
      alert('Informe o motivo da alteração de vencimento.');
      return;
    }

    const discVal = parseFloat(newDiscountValue.replace(',', '.'));

    updateInstallmentDueDate(
      selectedInst.id,
      newDueDate,
      isNaN(discVal) ? 0 : discVal,
      newDiscountLimitDate,
      newInterestStartDate,
      currentUser,
      reason.trim()
    );

    setSelectedInst(null);
    refreshData();
    alert('Vencimento alterado com sucesso!');
  };

  const filteredInstallments = installments.filter(i => 
    i.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.enrollment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-1">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" /> Alteração de Vencimentos & Condições
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Repactuação individual de datas de vencimento, prazos de desconto por pontualidade e incidência de juros.
        </p>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por aluno ou matrícula..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Aluno</th>
                <th className="p-3.5">Parcela nº</th>
                <th className="p-3.5">Competência</th>
                <th className="p-3.5">Vencimento Atual</th>
                <th className="p-3.5 text-right">Valor Original</th>
                <th className="p-3.5 text-right">Desconto Atual</th>
                <th className="p-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredInstallments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhuma parcela pendente encontrada.
                  </td>
                </tr>
              ) : (
                filteredInstallments.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {inst.studentName}
                      <span className="block text-[10px] font-mono text-slate-400">{inst.enrollment}</span>
                    </td>
                    <td className="p-3.5 font-bold">{inst.number}/{inst.totalInstallments}</td>
                    <td className="p-3.5 font-mono text-slate-500">{inst.competencia}</td>
                    <td className="p-3.5 font-mono font-bold text-blue-600">
                      {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold">R$ {inst.originalValue.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">R$ {inst.discountValue.toFixed(2)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openModal(inst)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Edit3 className="h-3 w-3" /> Alterar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL */}
      {selectedInst && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Alterar Vencimento & Condições
              </h3>
              <button onClick={() => setSelectedInst(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
              <p className="font-bold text-slate-900 dark:text-white">{selectedInst.studentName}</p>
              <p className="text-slate-400 font-mono">Parcela {selectedInst.number}/{selectedInst.totalInstallments} ({selectedInst.competencia})</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Nova Data de Vencimento (*)</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Novo Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Data Limite Desconto</label>
                  <input
                    type="date"
                    value={newDiscountLimitDate}
                    onChange={(e) => setNewDiscountLimitDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Motivo / Justificativa da Alteração (*)</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Prorrogação autorizada pelo departamento financeiro..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInst(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
