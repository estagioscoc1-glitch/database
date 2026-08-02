import React, { useState, useEffect } from 'react';
import { FinancialReceipt } from '../../types/financeiro';
import { getReceipts, addFinancialAuditLog } from '../../services/financeiroStorage';
import { FinancialReceiptModal } from './FinancialReceiptModal';
import { 
  Printer, Search, FileText, CheckCircle2, XCircle, Calendar, 
  User, DollarSign, Filter, RefreshCw, ArrowUpDown, ShieldCheck 
} from 'lucide-react';

interface ReprintReceiptsManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
}

export const ReprintReceiptsManager: React.FC<ReprintReceiptsManagerProps> = ({
  currentUser = 'Tesouraria',
  allStudentUsers = []
}) => {
  const [receipts, setReceipts] = useState<FinancialReceipt[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'VALIDO' | 'CANCELADO' | 'TODOS'>('VALIDO');
  const [methodFilter, setMethodFilter] = useState<string>('TODOS');
  
  // Modal for reprinting receipt
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialReceipt | null>(null);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = () => {
    const list = getReceipts();
    setReceipts(list);
  };

  const handleOpenReprintModal = (receipt: FinancialReceipt) => {
    setSelectedReceipt(receipt);
    addFinancialAuditLog(
      currentUser,
      'REIMPRESSAO_RECIBO',
      `Emitida 2ª via do recibo nº ${receipt.receiptNumber} para o aluno ${receipt.studentName} (${receipt.enrollment}) no valor de R$ ${receipt.totalValue.toFixed(2)}`
    );
  };

  // Unique payment methods present in receipts
  const paymentMethodsList = Array.from(new Set(receipts.map(r => r.paymentMethod))).filter(Boolean);

  // Filtered receipts
  const filteredReceipts = receipts.filter(r => {
    // Status filter
    if (statusFilter !== 'TODOS' && r.status !== statusFilter) return false;

    // Payment method filter
    if (methodFilter !== 'TODOS' && r.paymentMethod !== methodFilter) return false;

    // Search term filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNumber = r.receiptNumber?.toLowerCase().includes(q);
      const matchName = r.studentName?.toLowerCase().includes(q);
      const matchEnrollment = r.enrollment?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchUser = r.user?.toLowerCase().includes(q);

      if (!matchNumber && !matchName && !matchEnrollment && !matchDesc && !matchUser) {
        return false;
      }
    }

    return true;
  });

  const totalFilteredValue = filteredReceipts
    .filter(r => r.status === 'VALIDO')
    .reduce((sum, r) => sum + r.totalValue, 0);

  return (
    <div className="space-y-6">
      
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-blue-900/40 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl text-[10px] font-black uppercase tracking-wider">
            Controle de Baixas & Vias
          </span>
          <span className="text-xs text-blue-200/80 font-bold">Módulo Financeiro</span>
        </div>
        <h3 className="text-xl font-black uppercase tracking-wide flex items-center gap-2">
          <Printer className="h-6 w-6 text-blue-400" />
          Reimpressão de Recibos / 2ª Via
        </h3>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          Consulte e reimprima 2ª via de recibos oficiais de pagamentos já dados baixa no sistema (mensalidades, taxas, materiais e demais lançamentos). Todas as reemissões são registradas no log de auditoria.
        </p>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="h-4.5 w-4.5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº do Recibo, Nome do Aluno, Matrícula..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"
            >
              <option value="VALIDO">Apenas Recibos Válidos</option>
              <option value="CANCELADO">Apenas Recibos Cancelados</option>
              <option value="TODOS">Todos os Recibos</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-3">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold"
            >
              <option value="TODOS">Todas as Formas de Pagamento</option>
              {paymentMethodsList.map(pm => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
          </div>

          {/* Reload Button */}
          <div className="md:col-span-1 flex items-center">
            <button
              onClick={loadReceipts}
              title="Atualizar Lista"
              className="w-full h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

        </div>

        {/* Results Counter & Total Value */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">
              Encontrados: <strong className="text-blue-600 dark:text-blue-400">{filteredReceipts.length}</strong> recibo(s)
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Soma Total Válidos Exibidos: </span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              R$ {totalFilteredValue.toFixed(2)}
            </span>
          </div>
        </div>

      </div>

      {/* Receipts List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        {filteredReceipts.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Nenhum recibo encontrado para a busca especificada.</p>
            <p className="text-xs text-slate-400">Verifique os filtros selecionados ou digite um novo termo de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Nº Recibo</th>
                  <th className="p-3.5">Data / Hora</th>
                  <th className="p-3.5">Aluno / Matrícula</th>
                  <th className="p-3.5">Descrição</th>
                  <th className="p-3.5">Forma Pagto</th>
                  <th className="p-3.5 text-right">Valor Total</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredReceipts.map((rc) => (
                  <tr key={rc.receiptNumber} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all">
                    <td className="p-3.5 font-mono font-black text-blue-600 dark:text-blue-400">
                      {rc.receiptNumber}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(rc.date).toLocaleDateString('pt-BR')} {new Date(rc.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 dark:text-white block">{rc.studentName}</span>
                      <span className="text-[10px] font-mono text-slate-400">Matrícula: {rc.enrollment}</span>
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {rc.description}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-extrabold text-[10px] uppercase font-mono">
                        {rc.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                      R$ {rc.totalValue.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      {rc.status === 'VALIDO' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Válido
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Cancelado
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenReprintModal(rc)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                      >
                        <Printer className="h-3.5 w-3.5" /> 2ª Via / Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* REPRINT RECEIPT MODAL */}
      {selectedReceipt && (
        <FinancialReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

    </div>
  );
};
