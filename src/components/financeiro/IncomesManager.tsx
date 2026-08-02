import React, { useState, useEffect } from 'react';
import { 
  Installment, PaymentMethodItem, MiscPaymentCatalog, FinancialReceipt 
} from '../../types/financeiro';
import { 
  getInstallments, calculateInstallmentAmountDue, payInstallment, 
  getPaymentMethods, getMiscPaymentCatalog, payMiscIncome, getOpenCashRegister 
} from '../../services/financeiroStorage';
import { FinancialReceiptModal } from './FinancialReceiptModal';
import { 
  Search, DollarSign, CheckCircle2, AlertCircle, CreditCard, 
  FileText, Calendar, Sparkles, User, Filter, ArrowRight
} from 'lucide-react';

interface IncomesManagerProps {
  currentUser?: string;
  allStudentUsers?: any[]; // Passed from AppContext
}

export const IncomesManager: React.FC<IncomesManagerProps> = ({ 
  currentUser = 'Tesouraria',
  allStudentUsers = [] 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'PARCELAS' | 'DIVERSOS'>('PARCELAS');
  
  // Common state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [openCash, setOpenCash] = useState(getOpenCashRegister());
  const [activeReceipt, setActiveReceipt] = useState<FinancialReceipt | null>(null);

  // Installment Receiving State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentInstallments, setStudentInstallments] = useState<Installment[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('PIX');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Miscellaneous Income State
  const [miscSearchQuery, setMiscSearchQuery] = useState('');
  const [selectedMiscStudent, setSelectedMiscStudent] = useState<any | null>(null);
  const [miscCatalog, setMiscCatalog] = useState<MiscPaymentCatalog[]>([]);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [miscChargeName, setMiscChargeName] = useState('');
  const [miscCategory, setMiscCategory] = useState('Taxa Administrativa');
  const [miscValue, setMiscValue] = useState('0.00');
  const [miscPaymentMethod, setMiscPaymentMethod] = useState('PIX');
  const [miscNotes, setMiscNotes] = useState('');

  const refreshData = () => {
    setPaymentMethods(getPaymentMethods().filter(m => m.active));
    setMiscCatalog(getMiscPaymentCatalog().filter(c => c.active));
    setOpenCash(getOpenCashRegister());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Update installments when student selection changes
  useEffect(() => {
    if (selectedStudent) {
      const all = getInstallments();
      const stInsts = all.filter(i => 
        (i.studentId === selectedStudent.id || i.enrollment === selectedStudent.enrollment) &&
        i.status === 'PENDENTE'
      );
      setStudentInstallments(stInsts);
    } else {
      setStudentInstallments([]);
    }
  }, [selectedStudent]);

  const handlePayInstallmentClick = (inst: Installment) => {
    if (!openCash) {
      if (!confirm('ATENÇÃO: Não há nenhum caixa ABERTO no momento. Deseja prosseguir com o recebimento mesmo assim?')) {
        return;
      }
    }

    setProcessingId(inst.id);
    const result = payInstallment(inst.id, selectedPaymentMethod, currentUser);
    setProcessingId(null);

    if (result) {
      setActiveReceipt(result.receipt);
      // Refresh list
      const all = getInstallments();
      const updated = all.filter(i => 
        (i.studentId === selectedStudent?.id || i.enrollment === selectedStudent?.enrollment) &&
        i.status === 'PENDENTE'
      );
      setStudentInstallments(updated);
    }
  };

  const handleCatalogSelect = (catId: string) => {
    setSelectedCatalogId(catId);
    if (!catId) return;
    const found = miscCatalog.find(c => c.id === catId);
    if (found) {
      setMiscChargeName(found.name);
      setMiscCategory(found.category);
      setMiscValue(found.defaultValue.toString());
    }
  };

  const handleMiscSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMiscStudent) {
      alert('Por favor, busque e selecione um aluno para vincular o recebimento.');
      return;
    }
    const val = parseFloat(miscValue.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert('Por favor, informe um valor de cobrança válido.');
      return;
    }

    const catalogItem = miscCatalog.find(c => c.id === selectedCatalogId);

    const result = payMiscIncome(
      selectedMiscStudent.id || 'st_unknown',
      selectedMiscStudent.name || selectedMiscStudent.studentName,
      selectedMiscStudent.enrollment || 'ALU-00',
      miscChargeName,
      miscCategory,
      val,
      miscPaymentMethod,
      currentUser,
      catalogItem?.blockedActions,
      miscNotes
    );

    setActiveReceipt(result.receipt);

    // Reset misc form
    setMiscChargeName('');
    setMiscValue('0.00');
    setMiscNotes('');
    setSelectedCatalogId('');
  };

  // Filter students for search dropdown
  const filteredStudents = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allStudentUsers.filter((s: any) => 
      s.name?.toLowerCase().includes(q) || 
      s.enrollment?.toLowerCase().includes(q) || 
      s.cpf?.includes(q)
    ).slice(0, 6);
  };

  return (
    <div className="space-y-6">
      
      {/* Subtab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setActiveSubTab('PARCELAS')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'PARCELAS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Recebimento de Parcelas / Mensalidades</span>
        </button>

        <button
          onClick={() => setActiveSubTab('DIVERSOS')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            activeSubTab === 'DIVERSOS'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Recebimentos Diversos (Taxas, Unif., Apostilas)</span>
        </button>
      </div>

      {/* SUBTAB 1: RECEBIMENTO DE PARCELAS */}
      {activeSubTab === 'PARCELAS' && (
        <div className="space-y-6">
          
          {/* Student Search Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" /> Seleção de Aluno para Quitação
              </h3>
              {openCash ? (
                <span className="text-[11px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">
                  Caixa #{openCash.seqNumber} Aberto
                </span>
              ) : (
                <span className="text-[11px] font-mono font-extrabold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-full">
                  Sem Caixa Aberto
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="h-4.5 w-4.5 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSelectedStudent(null);
                }}
                placeholder="Digite o Nome, Matrícula ou CPF do aluno..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />

              {/* Suggestions Dropdown */}
              {searchQuery && !selectedStudent && (
                <div className="absolute left-0 right-0 top-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-60 overflow-y-auto">
                  {filteredStudents(searchQuery).length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Nenhum aluno encontrado.</div>
                  ) : (
                    filteredStudents(searchQuery).map((st: any) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchQuery(st.name);
                        }}
                        className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-all flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white block">{st.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">Matrícula: {st.enrollment || 'N/A'} • Curso: {st.courseName || 'Técnico'}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-blue-600" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Active Student Summary */}
            {selectedStudent && (
              <div className="p-4 bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/60 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 block">Aluno Selecionado</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{selectedStudent.name}</span>
                  <p className="text-[11px] font-mono text-slate-500">Matrícula: {selectedStudent.enrollment} • CPF: {selectedStudent.cpf || 'Não cadastrado'}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-[11px]"
                >
                  Trocar Aluno
                </button>
              </div>
            )}
          </div>

          {/* Payment Method Selector Bar */}
          {selectedStudent && studentInstallments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-blue-600" /> Forma de Pagamento Global:
              </span>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {paymentMethods.map(pm => (
                  <option key={pm.id} value={pm.name}>{pm.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Installments Table */}
          {selectedStudent && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Parcelas Pendentes de {selectedStudent.name} ({studentInstallments.length})
              </h3>

              {studentInstallments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Todas as parcelas do aluno estão em dia ou quitadas!</p>
                  <p className="text-[11px] text-slate-400">Você pode gerar novas parcelas na guia 'Gerar Parcelas'.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Parcela nº</th>
                        <th className="p-3.5">Competência</th>
                        <th className="p-3.5">Vencimento</th>
                        <th className="p-3.5 text-right">Valor Original</th>
                        <th className="p-3.5 text-right">Desconto/Bolsa</th>
                        <th className="p-3.5 text-right">Multa / Juros</th>
                        <th className="p-3.5 text-right">Valor Atualizado</th>
                        <th className="p-3.5 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {studentInstallments.map((inst) => {
                        const calc = calculateInstallmentAmountDue(inst);
                        return (
                          <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {inst.number}/{inst.totalInstallments}
                            </td>
                            <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{inst.competencia}</td>
                            <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                              {new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                              {calc.isOverdue && (
                                <span className="block text-[9px] font-black text-rose-500 uppercase">
                                  Atrasada ({calc.daysOverdue} dias)
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                              R$ {inst.originalValue.toFixed(2)}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                              {calc.discountApplied > 0 ? `- R$ ${calc.discountApplied.toFixed(2)}` : 'R$ 0,00'}
                              {inst.scholarshipApplied && (
                                <span className="block text-[9px] font-bold text-blue-500 truncate max-w-[120px] ml-auto">
                                  {inst.scholarshipApplied}
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-rose-500">
                              {(calc.fineValue + calc.interestValue) > 0 
                                ? `+ R$ ${(calc.fineValue + calc.interestValue).toFixed(2)}` 
                                : 'R$ 0,00'}
                            </td>
                            <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                              R$ {calc.finalTotal.toFixed(2)}
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handlePayInstallmentClick(inst)}
                                disabled={processingId === inst.id}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* SUBTAB 2: RECEBIMENTOS DIVERSOS */}
      {activeSubTab === 'DIVERSOS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Lançamento de Recebimentos Diversos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Venda de apostilas, uniformes, declarações, diplomas, taxas de exames e serviços avulsos
            </p>
          </div>

          <form onSubmit={handleMiscSubmit} className="space-y-5 text-xs">
            
            {/* Student Search */}
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold uppercase text-slate-500">Aluno do Lançamento (*)</label>
              <div className="relative">
                <Search className="h-4.5 w-4.5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={miscSearchQuery}
                  onChange={(e) => {
                    setMiscSearchQuery(e.target.value);
                    if (!e.target.value) setSelectedMiscStudent(null);
                  }}
                  placeholder="Buscar aluno por nome ou matrícula..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />

                {/* Suggestions */}
                {miscSearchQuery && !selectedMiscStudent && (
                  <div className="absolute left-0 right-0 top-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                    {filteredStudents(miscSearchQuery).map((st: any) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedMiscStudent(st);
                          setMiscSearchQuery(st.name);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        {st.name} ({st.enrollment})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedMiscStudent && (
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Aluno vinculado: {selectedMiscStudent.name} ({selectedMiscStudent.enrollment})
                </div>
              )}
            </div>

            {/* Catalog Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                  Selecione um Item do Catálogo (Opcional)
                </label>
                <select
                  value={selectedCatalogId}
                  onChange={(e) => handleCatalogSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleção Manual / Avulso --</option>
                  {miscCatalog.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} (R$ {cat.defaultValue.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">
                  Nome da Cobrança / Item (*)
                </label>
                <input
                  type="text"
                  required
                  value={miscChargeName}
                  onChange={(e) => setMiscChargeName(e.target.value)}
                  placeholder="Ex: Segunda via de Carteirinha de Estudante"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Categoria</label>
                <input
                  type="text"
                  value={miscCategory}
                  onChange={(e) => setMiscCategory(e.target.value)}
                  placeholder="Ex: Material, Taxa, Eventos..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor do Recebimento (R$ *)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={miscValue}
                  onChange={(e) => setMiscValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Forma de Pagamento (*)</label>
                <select
                  value={miscPaymentMethod}
                  onChange={(e) => setMiscPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                >
                  {paymentMethods.map(pm => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Observações Internas</label>
              <textarea
                rows={2}
                value={miscNotes}
                onChange={(e) => setMiscNotes(e.target.value)}
                placeholder="Ex: Entregue no ato do pagamento..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-95 uppercase tracking-wide flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Registrar Recebimento e Gerar Recibo
              </button>
            </div>

          </form>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {activeReceipt && (
        <FinancialReceiptModal 
          receipt={activeReceipt} 
          onClose={() => setActiveReceipt(null)} 
        />
      )}

    </div>
  );
};
