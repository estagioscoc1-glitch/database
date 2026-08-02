import React, { useState, useEffect } from 'react';
import { CashRegister } from '../../types/financeiro';
import { 
  getCashRegisters, getOpenCashRegister, openCashRegister, 
  closeCashRegister, reopenCashRegister, getReceipts, getExpenses 
} from '../../services/financeiroStorage';
import { FinancialPrintModal, FinancialPrintData } from './FinancialPrintModal';
import { 
  Wallet, CheckCircle2, XCircle, Clock, PlusCircle, Lock, Unlock, 
  Search, RefreshCw, AlertCircle, FileText, TrendingUp, TrendingDown, DollarSign, Printer
} from 'lucide-react';

interface CashRegisterManagerProps {
  currentUser?: string;
  isAdmin?: boolean;
}

export const CashRegisterManager: React.FC<CashRegisterManagerProps> = ({ 
  currentUser = 'Administrador Tesouraria', 
  isAdmin = true 
}) => {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [openCash, setOpenCash] = useState<CashRegister | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Open Cash Modal State
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [initialBalance, setInitialBalance] = useState('0.00');
  const [openNotes, setOpenNotes] = useState('');

  // Close Cash Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  // Selected Register Detail Modal
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);

  // Financial Print Modal State
  const [printModalData, setPrintModalData] = useState<FinancialPrintData | null>(null);

  const handlePrintRegister = (reg: CashRegister) => {
    const allRcs = getReceipts().filter(r => r.cashRegisterId === reg.id && r.status === 'VALIDO');
    const allExps = getExpenses().filter(e => e.cashRegisterId === reg.id);

    setPrintModalData({
      type: 'CAIXA_DIARIO',
      title: `Relatório de Fechamento de Caixa Diário #${reg.seqNumber}`,
      subtitle: `Operador Responsável: ${reg.responsibleUser} • Seq #${reg.seqNumber}`,
      dateRange: `Aberto em: ${new Date(reg.openedAt).toLocaleString('pt-BR')}${reg.closedAt ? ' • Fechado em: ' + new Date(reg.closedAt).toLocaleString('pt-BR') : ' (Aberto)'}`,
      user: currentUser,
      cashRegister: reg,
      receipts: allRcs,
      expenses: allExps
    });
  };

  const refreshData = () => {
    const list = getCashRegisters();
    setRegisters(list);
    setOpenCash(getOpenCashRegister());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (openCash) {
      alert('Já existe um caixa ABERTO. É necessário fechar o caixa atual antes de abrir um novo.');
      return;
    }
    const val = parseFloat(initialBalance.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      alert('Por favor, informe um valor inicial válido.');
      return;
    }

    openCashRegister(currentUser, val, openNotes);
    setShowOpenModal(false);
    setInitialBalance('0.00');
    setOpenNotes('');
    refreshData();
  };

  const handleCloseCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openCash) return;

    closeCashRegister(openCash.id, currentUser, closeNotes);
    setShowCloseModal(false);
    setCloseNotes('');
    refreshData();
  };

  const handleReopen = (regId: string) => {
    if (!isAdmin) {
      alert('Apenas administradores possuem permissão para reabrir caixa.');
      return;
    }
    if (openCash) {
      alert('Não é possível reabrir este caixa pois já existe outro caixa ABERTO no momento.');
      return;
    }
    if (confirm('Deseja realmente REABRIR este caixa? Esta operação será registrada no histórico de auditoria.')) {
      reopenCashRegister(regId, currentUser);
      refreshData();
    }
  };

  // Calculate live numbers for open cash register
  const openReceipts = openCash ? getReceipts().filter(r => r.cashRegisterId === openCash.id && r.status === 'VALIDO') : [];
  const openExpenses = openCash ? getExpenses().filter(e => e.cashRegisterId === openCash.id) : [];
  const liveIncomesTotal = openReceipts.reduce((sum, r) => sum + r.totalValue, 0);
  const liveExpensesTotal = openExpenses.reduce((sum, e) => sum + e.value, 0);
  const liveBalance = (openCash?.initialBalance || 0) + liveIncomesTotal - liveExpensesTotal;

  const filteredRegisters = registers.filter(r => 
    r.responsibleUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.seqNumber.toString().includes(searchQuery) ||
    r.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Open Cash Register Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-6 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${openCash ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">Status do Caixa Ativo</h3>
                  {openCash ? (
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase rounded-full animate-pulse">
                      ● ABERTO #{openCash.seqNumber}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase rounded-full">
                      ● FECHADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {openCash 
                    ? `Operador: ${openCash.responsibleUser} • Aberto em ${new Date(openCash.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Nenhum caixa aberto no momento. Abra o caixa para registrar entradas e saídas.'}
                </p>
              </div>
            </div>

            <div>
              {openCash ? (
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Lock className="h-4 w-4" /> Fechar Caixa
                </button>
              ) : (
                <button
                  onClick={() => setShowOpenModal(true)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 uppercase tracking-wide"
                >
                  <PlusCircle className="h-4.5 w-4.5" /> Abrir Novo Caixa
                </button>
              )}
            </div>
          </div>

          {openCash && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fundo Inicial</span>
                <span className="text-sm font-black font-mono text-white">R$ {openCash.initialBalance.toFixed(2)}</span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Entradas (+)
                </span>
                <span className="text-sm font-black font-mono text-emerald-400">R$ {liveIncomesTotal.toFixed(2)}</span>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Saídas (-)
                </span>
                <span className="text-sm font-black font-mono text-rose-400">R$ {liveExpensesTotal.toFixed(2)}</span>
              </div>
              <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Saldo do Caixa</span>
                <span className="text-base font-black font-mono text-emerald-400">R$ {liveBalance.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Instructions / Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-3 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-sm mb-1">
              <AlertCircle className="h-4 w-4" /> Diretrizes da Tesouraria
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Todos os recebimentos em espécie, PIX ou cartão são vinculados ao caixa aberto no momento do recebimento para conferência no fechamento.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Total de caixas no histórico:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{registers.length}</span>
          </div>
        </div>

      </div>

      {/* Caixa History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Histórico de Caixas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Registros de aberturas, fechamentos e conciliação de tesouraria</p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por operador ou nº..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={refreshData}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all cursor-pointer"
              title="Atualizar Caixas"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Caixa Nº</th>
                <th className="p-3.5">Operador Responsável</th>
                <th className="p-3.5">Abertura</th>
                <th className="p-3.5">Fechamento</th>
                <th className="p-3.5 text-right">Fundo Inicial</th>
                <th className="p-3.5 text-right">Saldo Final</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredRegisters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhum caixa encontrado.
                  </td>
                </tr>
              ) : (
                filteredRegisters.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-mono font-black text-blue-600 dark:text-blue-400">#{reg.seqNumber}</td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{reg.responsibleUser}</td>
                    <td className="p-3.5 text-slate-500">{new Date(reg.openedAt).toLocaleString('pt-BR')}</td>
                    <td className="p-3.5 text-slate-500">{reg.closedAt ? new Date(reg.closedAt).toLocaleString('pt-BR') : '-'}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">R$ {reg.initialBalance.toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {reg.finalBalance !== undefined ? `R$ ${reg.finalBalance.toFixed(2)}` : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      {reg.status === 'OPEN' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                          Aberto
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-full text-[10px] font-black uppercase">
                          Fechado
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRegister(reg)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Detalhes
                      </button>
                      {reg.status === 'CLOSED' && isAdmin && (
                        <button
                          onClick={() => handleReopen(reg.id)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:text-amber-300 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Unlock className="h-3 w-3" /> Reabrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* OPEN CASH MODAL */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Abertura de Caixa</h3>
              </div>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOpenCashSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Operador Responsável</label>
                <input
                  type="text"
                  disabled
                  value={currentUser}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Saldo Inicial / Troco de Fundo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Observações da Abertura</label>
                <textarea
                  rows={2}
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="Ex: Fundo constituído em cédulas de R$ 10,00 e R$ 5,00..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE CASH MODAL */}
      {showCloseModal && openCash && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Fechamento do Caixa #{openCash.seqNumber}</h3>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo Inicial:</span>
                <span className="font-mono font-bold">R$ {openCash.initialBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>(+) Entradas no Caixa:</span>
                <span className="font-mono">R$ {liveIncomesTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>(-) Saídas do Caixa:</span>
                <span className="font-mono">R$ {liveExpensesTotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                <span>Saldo Final Calculado:</span>
                <span className="font-mono text-emerald-500">R$ {liveBalance.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseCashSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Observações / Conciliação do Fechamento</label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ex: Valores conferidos sem divergência de caixa em espécie..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  Efetuar Fechamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER DETAIL MODAL */}
      {selectedRegister && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Detalhes do Caixa #{selectedRegister.seqNumber}
                </h3>
              </div>
              <button onClick={() => setSelectedRegister(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedRegister.status}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Operador</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedRegister.responsibleUser}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Abertura</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(selectedRegister.openedAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Fechamento</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedRegister.closedAt ? new Date(selectedRegister.closedAt).toLocaleString('pt-BR') : 'Ainda Aberto'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Fundo Inicial</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {selectedRegister.initialBalance.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Saldo Final</span>
                <span className="font-mono font-black text-emerald-600">
                  {selectedRegister.finalBalance !== undefined ? `R$ ${selectedRegister.finalBalance.toFixed(2)}` : 'Em andamento'}
                </span>
              </div>
            </div>

            {selectedRegister.notes && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">Anotações</span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">{selectedRegister.notes}</p>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const reg = selectedRegister;
                  setSelectedRegister(null);
                  handlePrintRegister(reg);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="h-4 w-4" /> Imprimir Relatório de Caixa
              </button>

              <button
                onClick={() => setSelectedRegister(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINANCIAL PRINT MODAL */}
      {printModalData && (
        <FinancialPrintModal
          data={printModalData}
          onClose={() => setPrintModalData(null)}
        />
      )}

    </div>
  );
};
