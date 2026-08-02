import React, { useState, useEffect } from 'react';
import { Expense, PaymentMethodItem } from '../../types/financeiro';
import { 
  getExpenses, addExpense, getOpenCashRegister, getPaymentMethods 
} from '../../services/financeiroStorage';
import { 
  TrendingDown, PlusCircle, Search, Filter, RefreshCw, FileText, 
  Calendar, Building, DollarSign, Paperclip, CheckCircle2 
} from 'lucide-react';

interface ExpensesManagerProps {
  currentUser?: string;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({ 
  currentUser = 'Administração Financeira' 
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [openCash, setOpenCash] = useState(getOpenCashRegister());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // New Expense Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [resourceOrigin, setResourceOrigin] = useState<'CAIXA_ABERTO' | 'CONTA_BANCARIA'>('CAIXA_ABERTO');
  const [category, setCategory] = useState('FORNECEDORES');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [voucherName, setVoucherName] = useState('');

  const refreshData = () => {
    setExpenses(getExpenses());
    setPaymentMethods(getPaymentMethods().filter(m => m.active));
    setOpenCash(getOpenCashRegister());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert('Por favor, informe um valor válido para a despesa.');
      return;
    }

    if (resourceOrigin === 'CAIXA_ABERTO' && !openCash) {
      if (!confirm('Atenção: Não há caixa ABERTO na tesouraria no momento. Deseja registrar a saída mesmo assim?')) {
        return;
      }
    }

    addExpense({
      resourceOrigin,
      category,
      description,
      value: val,
      paymentMethod,
      beneficiary,
      date,
      user: currentUser,
      notes: notes.trim() || undefined,
      voucher: voucherName || undefined
    }, currentUser);

    // Reset Form
    setShowAddModal(false);
    setDescription('');
    setValue('');
    setBeneficiary('');
    setNotes('');
    setVoucherName('');
    refreshData();
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exp.beneficiary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          exp.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !categoryFilter || exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalFilteredValue = filteredExpenses.reduce((sum, e) => sum + e.value, 0);

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 rounded-xl">
              <TrendingDown className="h-5 w-5" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Gestão de Saídas / Despesas
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle de pagamento a fornecedores, serviços, folha de pagamento e saídas de caixa
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 uppercase tracking-wide"
        >
          <PlusCircle className="h-4.5 w-4.5" /> Registrar Nova Saída
        </button>
      </div>

      {/* Expenses Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar despesa ou favorecido..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="">Todas Categoria</option>
              <option value="FORNECEDORES">Fornecedores</option>
              <option value="FOLHA_PAGAMENTO">Folha de Pagamento</option>
              <option value="MANUTENCAO">Manutenção</option>
              <option value="IMPOSTOS">Impostos</option>
              <option value="SERVICOS">Serviços</option>
              <option value="MATERIAL">Material</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Total de Saídas Exibidas</span>
            <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
              R$ {totalFilteredValue.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Descrição da Despesa</th>
                <th className="p-3.5">Favorecido</th>
                <th className="p-3.5">Categoria</th>
                <th className="p-3.5">Origem Recurso</th>
                <th className="p-3.5">Forma Pagto</th>
                <th className="p-3.5 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhuma saída/despesa registrada.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-mono text-slate-500">
                      {new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {exp.description}
                      {exp.notes && <span className="block text-[10px] font-normal text-slate-400">{exp.notes}</span>}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{exp.beneficiary}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {exp.resourceOrigin === 'CAIXA_ABERTO' ? (
                        <span className="text-amber-600 font-bold text-[10px] uppercase">Caixa Físico</span>
                      ) : (
                        <span className="text-blue-600 font-bold text-[10px] uppercase">Conta Bancária</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{exp.paymentMethod}</td>
                    <td className="p-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      - R$ {exp.value.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* NEW EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Lançamento de Nova Saída
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Origem do Recurso (*)</label>
                  <select
                    value={resourceOrigin}
                    onChange={(e: any) => setResourceOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="CAIXA_ABERTO">Caixa Aberto da Tesouraria</option>
                    <option value="CONTA_BANCARIA">Conta Bancária da Escola</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Categoria (*)</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="FORNECEDORES">Fornecedores</option>
                    <option value="FOLHA_PAGAMENTO">Folha de Pagamento</option>
                    <option value="MANUTENCAO">Manutenção & Reparos</option>
                    <option value="IMPOSTOS">Impostos & Taxas</option>
                    <option value="SERVICOS">Serviços de Terceiros</option>
                    <option value="MATERIAL">Material Didático/Escritório</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Descrição da Despesa (*)</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Pagamento de conta de energia da unidade Asa Norte"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Favorecido / Beneficiário (*)</label>
                  <input
                    type="text"
                    required
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    placeholder="Ex: Neoenergia Brasília"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor da Saída (R$ *)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-rose-500"
                  >
                    {paymentMethods.map(pm => (
                      <option key={pm.id} value={pm.name}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Data (*)</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Comprovante / Anexo (Opcional)</label>
                <input
                  type="text"
                  value={voucherName}
                  onChange={(e) => setVoucherName(e.target.value)}
                  placeholder="Ex: NF-4092.pdf ou Recibo-01.jpg"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Aprovado pela diretoria financeira..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Confirmar Registros de Saída
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
