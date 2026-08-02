import React, { useState, useEffect } from 'react';
import { CashRegister, FinancialReceipt, Expense, Installment, ReportTemplate } from '../../types/financeiro';
import { 
  getCashRegisters, getReceipts, getExpenses, getInstallments,
  getReportTemplates, saveReportTemplate, deleteReportTemplate, setActiveReportTemplate
} from '../../services/financeiroStorage';
import { FinancialPrintModal, FinancialPrintData } from './FinancialPrintModal';
import { 
  FileSpreadsheet, Printer, Upload, Wallet, PieChart, FileText, CheckCircle2, 
  Trash2, Eye, FileUp, Sparkles, AlertCircle, ShieldCheck, Download, Layers
} from 'lucide-react';

interface FinancialReportsManagerProps {
  currentUser?: string;
}

export const FinancialReportsManager: React.FC<FinancialReportsManagerProps> = ({
  currentUser = 'Administração Financeira'
}) => {
  const [reportType, setReportType] = useState<'CAIXA' | 'GERENCIAL' | 'MODELOS'>('CAIXA');
  
  // Data States
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedCashId, setSelectedCashId] = useState<string>('');
  const [receipts, setReceipts] = useState<FinancialReceipt[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  // Templates State
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS');

  // New Template Form State
  const [newTplCategory, setNewTplCategory] = useState<'CAIXA_DIARIO' | 'MENSAL' | 'ANUAL' | 'OUTROS'>('CAIXA_DIARIO');
  const [newTplName, setNewTplName] = useState('');
  const [newTplDescription, setNewTplDescription] = useState('');
  const [newTplIsActive, setNewTplIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');

  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null);

  // Financial Print Modal State
  const [printModalData, setPrintModalData] = useState<FinancialPrintData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const regs = getCashRegisters();
    setCashRegisters(regs);
    if (regs.length > 0 && !selectedCashId) setSelectedCashId(regs[0].id);

    setReceipts(getReceipts());
    setExpenses(getExpenses());
    setInstallments(getInstallments());
    setTemplates(getReportTemplates());
  };

  // Selected cash details
  const selectedCashReg = cashRegisters.find(r => r.id === selectedCashId);
  const cashReceipts = receipts.filter(r => r.cashRegisterId === selectedCashId && r.status === 'VALIDO');
  const cashExpenses = expenses.filter(e => e.cashRegisterId === selectedCashId);

  // Group receipts by payment method
  const receiptsByMethod: { [key: string]: number } = {};
  cashReceipts.forEach(rc => {
    receiptsByMethod[rc.paymentMethod] = (receiptsByMethod[rc.paymentMethod] || 0) + rc.totalValue;
  });

  const totalCashIncomes = cashReceipts.reduce((sum, r) => sum + r.totalValue, 0);
  const totalCashExpenses = cashExpenses.reduce((sum, e) => sum + e.value, 0);
  const netCashBalance = (selectedCashReg?.initialBalance || 0) + totalCashIncomes - totalCashExpenses;

  // Gerencial Totals
  const validReceipts = receipts.filter(r => r.status === 'VALIDO');
  const totalRevenue = validReceipts.reduce((sum, r) => sum + r.totalValue, 0);
  const totalExpensesVal = expenses.reduce((sum, e) => sum + e.value, 0);
  const operatingProfit = totalRevenue - totalExpensesVal;

  const pendingCount = installments.filter(i => i.status === 'PENDENTE').length;
  const paidCount = installments.filter(i => i.status === 'PAGA').length;
  const defaultRate = (pendingCount + paidCount) > 0 ? ((pendingCount / (pendingCount + paidCount)) * 100) : 0;

  // Active templates for each category
  const activeCaixaTemplate = templates.find(t => t.category === 'CAIXA_DIARIO' && t.isActive);
  const activeMensalTemplate = templates.find(t => t.category === 'MENSAL' && t.isActive);
  const activeAnualTemplate = templates.find(t => t.category === 'ANUAL' && t.isActive);

  const handlePrint = () => {
    if (reportType === 'CAIXA') {
      setPrintModalData({
        type: 'CAIXA_DIARIO',
        title: `Relatório de Fechamento de Caixa Diário - ${selectedCashReg?.seqNumber ? `#${selectedCashReg.seqNumber}` : 'Caixa Geral'}`,
        subtitle: `Operador / Caixa: ${selectedCashReg?.responsibleUser || 'Geral'}`,
        dateRange: selectedCashReg ? `Aberto em: ${new Date(selectedCashReg.openedAt).toLocaleDateString('pt-BR')}` : undefined,
        user: currentUser,
        cashRegister: selectedCashReg,
        receipts: cashReceipts,
        expenses: cashExpenses
      });
    } else if (reportType === 'GERENCIAL') {
      setPrintModalData({
        type: 'GERENCIAL_DRE',
        title: 'Demonstrativo do Resultado do Exercício (DRE) & Faturamento Consolidado',
        subtitle: 'Relatório Financeiro Gerencial',
        user: currentUser,
        receipts: validReceipts,
        expenses: expenses,
        installments: installments
      });
    }
  };

  const handleExportCSV = () => {
    const headers = "Data,Tipo,Descricao,Forma_Pagamento,Valor\n";
    const rows = cashReceipts.map(r => 
      `"${r.date}","Entrada","${r.description}","${r.paymentMethod}",${r.totalValue}`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_financeiro_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('O arquivo selecionado é muito grande. O limite máximo é 10MB.');
        return;
      }
      setSelectedFile(file);
      if (!newTplName) {
        setNewTplName(file.name.replace(/\.[^/.]+$/, ""));
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setFileDataUrl(event.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileDataUrl) {
      alert('Por favor, selecione um arquivo de modelo em PDF ou Documento.');
      return;
    }
    if (!newTplName.trim()) {
      alert('Por favor, informe o nome do modelo.');
      return;
    }

    saveReportTemplate({
      name: newTplName.trim(),
      category: newTplCategory,
      fileName: selectedFile.name,
      fileType: selectedFile.type || 'application/pdf',
      fileSize: selectedFile.size,
      fileData: fileDataUrl,
      uploadedBy: currentUser,
      isActive: newTplIsActive,
      description: newTplDescription.trim() || undefined
    });

    alert('Modelo de relatório importado e salvo no sistema com sucesso!');
    setSelectedFile(null);
    setFileDataUrl('');
    setNewTplName('');
    setNewTplDescription('');
    loadData();
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo "${name}"?`)) {
      deleteReportTemplate(id, currentUser);
      loadData();
    }
  };

  const handleSetActive = (id: string, category: string) => {
    setActiveReportTemplate(id, category, currentUser);
    loadData();
  };

  const filteredTemplates = templates.filter(t => {
    if (selectedCategoryFilter === 'TODOS') return true;
    return t.category === selectedCategoryFilter;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'CAIXA_DIARIO': return 'Caixa Diário';
      case 'MENSAL': return 'Relatório Mensal';
      case 'ANUAL': return 'Relatório Anual / DRE';
      case 'OUTROS': return 'Outros Modelos';
      default: return cat;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Navigation Subtabs & Export Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm print:hidden">
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6">
          <button
            onClick={() => setReportType('CAIXA')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
              reportType === 'CAIXA'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Relatório do Fechamento de Caixa</span>
          </button>

          <button
            onClick={() => setReportType('GERENCIAL')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
              reportType === 'GERENCIAL'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <PieChart className="h-4 w-4" />
            <span>Relatório Gerencial DRE</span>
          </button>

          <button
            onClick={() => setReportType('MODELOS')}
            className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
              reportType === 'MODELOS'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Upload className="h-4 w-4 text-amber-500" />
            <span>Importar Modelos (PDF)</span>
            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] rounded-md font-bold">Novo</span>
          </button>
        </div>

        {reportType !== 'MODELOS' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200/60"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar Planilha (CSV)
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" /> Imprimir Relatório
            </button>
          </div>
        )}
      </div>

      {/* REPORT 1: RELATÓRIO DE CAIXA */}
      {reportType === 'CAIXA' && (
        <div id="printable-report-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm print:shadow-none print:border-none print:p-0">
          
          {/* Active PDF Template Info Banner (Hidden on Print) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl print:hidden">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">Modelo de Relatório PDF Ativo:</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-extrabold uppercase">
                    {activeCaixaTemplate ? activeCaixaTemplate.name : 'Modelo Padrão do Sistema'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeCaixaTemplate ? `Arquivo: ${activeCaixaTemplate.fileName}` : 'Utilizando layout padrão de fechamento de caixa do Colégio Oswaldo Cruz.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setReportType('MODELOS')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importar / Alterar Modelo PDF</span>
            </button>
          </div>

          {/* Cash Register Selector (Hidden on Print) */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
            <label className="text-xs font-black uppercase text-slate-500">Selecione o Caixa p/ Relatório:</label>
            <select
              value={selectedCashId}
              onChange={(e) => setSelectedCashId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              {cashRegisters.map(r => (
                <option key={r.id} value={r.id}>
                  Caixa #{r.seqNumber} - {r.responsibleUser} ({r.status})
                </option>
              ))}
            </select>
          </div>

          {/* Letterhead */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-900 dark:text-white">Colégio Oswaldo Cruz</h2>
              <p className="text-xs font-bold text-slate-500">Relatório Consolidado de Fechamento de Caixa Diário</p>
            </div>
            <div className="text-right text-xs font-mono">
              <p className="font-bold text-blue-600">Caixa #{selectedCashReg?.seqNumber}</p>
              <p className="text-slate-400">Operador: {selectedCashReg?.responsibleUser}</p>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Fundo Inicial</span>
              <span className="text-base font-black font-mono">R$ {(selectedCashReg?.initialBalance || 0).toFixed(2)}</span>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">(+) Entradas Totais</span>
              <span className="text-base font-black font-mono text-emerald-600">R$ {totalCashIncomes.toFixed(2)}</span>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/60 dark:border-rose-800">
              <span className="text-[10px] font-bold text-rose-600 uppercase block">(-) Saídas Totais</span>
              <span className="text-base font-black font-mono text-rose-600">R$ {totalCashExpenses.toFixed(2)}</span>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Líquido</span>
              <span className="text-lg font-black font-mono text-emerald-400">R$ {netCashBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Breakdown by Payment Method */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-400">Subtotais por Forma de Pagamento</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(receiptsByMethod).map(([method, val]) => (
                <div key={method} className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">{method}</span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-white">R$ {val.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Entries Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-400">Entradas Vinculadas a este Caixa ({cashReceipts.length})</h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Recibo nº</th>
                    <th className="p-2.5">Aluno / Lançamento</th>
                    <th className="p-2.5">Forma</th>
                    <th className="p-2.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashReceipts.map(r => (
                    <tr key={r.receiptNumber}>
                      <td className="p-2.5 font-mono font-bold text-blue-600">{r.receiptNumber}</td>
                      <td className="p-2.5">{r.studentName} - {r.description}</td>
                      <td className="p-2.5 font-mono text-slate-500">{r.paymentMethod}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600">R$ {r.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Block */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
              <p className="font-bold">{selectedCashReg?.responsibleUser}</p>
              <p className="text-[10px] text-slate-400">Operador do Caixa</p>
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 pt-2">
              <p className="font-bold">Gerência Financeira</p>
              <p className="text-[10px] text-slate-400">Visto de Conferência</p>
            </div>
          </div>

        </div>
      )}

      {/* REPORT 2: RELATÓRIO GERENCIAL DRE */}
      {reportType === 'GERENCIAL' && (
        <div className="space-y-6">
          
          {/* Active PDF Template Info Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <div className="flex items-center gap-3">
              <PieChart className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">Modelo PDF DRE / Mensal Ativo:</span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-md text-[10px] font-extrabold uppercase">
                    {activeAnualTemplate ? activeAnualTemplate.name : (activeMensalTemplate ? activeMensalTemplate.name : 'Modelo Padrão Sistema DRE')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {activeAnualTemplate ? `Arquivo: ${activeAnualTemplate.fileName}` : 'Demonstrativo do Resultado do Exercício com comparativo de faturamento e custos.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setReportType('MODELOS')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Importar / Alterar Modelo PDF</span>
            </button>
          </div>

          {/* Executive Indicators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Bruto</span>
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                R$ {totalRevenue.toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-400">Receitas quitadas no sistema</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Despesas / Saídas</span>
              <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                R$ {totalExpensesVal.toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-400">Contas pagas e saídas de caixa</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resultado Operacional</span>
              <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                R$ {operatingProfit.toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-400">Resultado operacional líquido</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Inadimplência</span>
              <span className="text-xl font-black font-mono text-amber-500">
                {defaultRate.toFixed(1)}%
              </span>
              <p className="text-[10px] text-slate-400">Parcelas pendentes vs quitadas</p>
            </div>
          </div>

          {/* DRE Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Demonstrativo de Resultado do Exercício (DRE)
            </h3>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 font-black uppercase text-[10px] flex justify-between">
                <span>Indicador DRE</span>
                <span>Valor (R$)</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                <div className="p-3 flex justify-between font-extrabold text-slate-900 dark:text-white">
                  <span>(+) RECEITA BRUTA DE MENSALIDADES E TAXAS</span>
                  <span className="font-mono text-emerald-600">R$ {totalRevenue.toFixed(2)}</span>
                </div>
                <div className="p-3 flex justify-between text-rose-600 font-extrabold">
                  <span>(-) CUSTOS OPERACIONAIS E DESPESAS</span>
                  <span className="font-mono">- R$ {totalExpensesVal.toFixed(2)}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 flex justify-between text-sm font-black text-blue-600 dark:text-blue-400">
                  <span>(=) RESULTADO OPERACIONAL LÍQUIDO</span>
                  <span className="font-mono">R$ {operatingProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* REPORT 3: IMPORTAR E GERENCIAR MODELOS DE RELATÓRIOS (PDF / DOC) */}
      {reportType === 'MODELOS' && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-amber-900/40 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl text-[10px] font-black uppercase tracking-wider">
                Módulo de Importação de Modelos PDF
              </span>
              <span className="text-xs text-amber-200/80 font-bold">Relatórios Personalizados</span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-wide">
              Central de Importação de Modelos de Relatório
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Aqui você pode enviar os seus modelos de relatório no formato <strong>PDF</strong> ou <strong>Documento</strong> (Caixa Diário, Mensal, DRE Anual). O sistema armazenará o arquivo e utilizará o layout importado como modelo padrão para a emissão de relatórios no Colégio Oswaldo Cruz.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* UPLOAD FORM (LEFT 5 COLS) */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <FileUp className="h-5 w-5 text-amber-500" />
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">Importar Novo Modelo PDF</h4>
              </div>

              <form onSubmit={handleImportTemplate} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    1. Categoria do Relatório *
                  </label>
                  <select
                    value={newTplCategory}
                    onChange={(e: any) => setNewTplCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="CAIXA_DIARIO">Relatório de Caixa Diário</option>
                    <option value="MENSAL">Relatório Financeiro Mensal</option>
                    <option value="ANUAL">Relatório Anual & DRE</option>
                    <option value="OUTROS">Outros Modelos Customizados</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    2. Nome / Título do Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Modelo Timbrado Fechamento Diário 2026"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="font-extrabold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    3. Descrição / Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Layout oficial com cabeçalho timbrado e campos de visto financeiro."
                    value={newTplDescription}
                    onChange={(e) => setNewTplDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  />
                </div>

                {/* File Dropzone */}
                <div>
                  <label className="font-extrabold uppercase text-slate-600 dark:text-slate-400 block mb-1">
                    4. Selecionar Arquivo do Modelo (.pdf, .docx, .png) *
                  </label>
                  
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-amber-500 rounded-2xl p-4 text-center space-y-2 bg-slate-50 dark:bg-slate-850 transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.png,.jpg"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <Upload className="h-8 w-8 text-amber-500 mx-auto" />
                    
                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="font-black text-slate-900 dark:text-white">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Documento'}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-extrabold text-slate-700 dark:text-slate-300">Clique ou arraste seu arquivo PDF aqui</p>
                        <p className="text-[10px] text-slate-400">Formatos aceitos: PDF, DOCX, PNG (máx 10MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="set-active-check"
                    checked={newTplIsActive}
                    onChange={(e) => setNewTplIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="set-active-check" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Definir imediatamente como Modelo Ativo para esta categoria
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importar e Salvar Modelo</span>
                </button>
              </form>
            </div>

            {/* IMPORTED MODELS DIRECTORY (RIGHT 7 COLS) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Category Filter Pills */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-500" />
                  <span>Filtrar Categoria:</span>
                </span>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {['TODOS', 'CAIXA_DIARIO', 'MENSAL', 'ANUAL', 'OUTROS'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-amber-500 text-white font-extrabold shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'TODOS' ? 'Todos' : getCategoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              <div className="space-y-3">
                {filteredTemplates.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-2">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="font-bold">Nenhum modelo encontrado para esta categoria.</p>
                    <p className="text-xs">Utilize o formulário ao lado para importar seu arquivo PDF.</p>
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => (
                    <div 
                      key={tpl.id}
                      className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 transition-all space-y-3 ${
                        tpl.isActive
                          ? 'border-amber-500 dark:border-amber-500/80 ring-2 ring-amber-500/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase">
                              {getCategoryLabel(tpl.category)}
                            </span>

                            {tpl.isActive ? (
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Modelo Ativo no Código
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold">
                                Inativo
                              </span>
                            )}
                          </div>

                          <h5 className="text-base font-black text-slate-900 dark:text-white">
                            {tpl.name}
                          </h5>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setPreviewTemplate(tpl)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </button>

                          {!tpl.isActive && (
                            <button
                              onClick={() => handleSetActive(tpl.id, tpl.category)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              Ativar Padrão
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-all cursor-pointer"
                            title="Excluir Modelo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {tpl.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl font-medium">
                          {tpl.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Arquivo: <strong className="text-slate-700 dark:text-slate-300 font-sans">{tpl.fileName}</strong> ({Math.round(tpl.fileSize / 1024)} KB)</span>
                        <span>Importado em {new Date(tpl.uploadedAt).toLocaleDateString('pt-BR')} por {tpl.uploadedBy}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Modelo PDF: {previewTemplate.name}
                </h3>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">Arquivo: {previewTemplate.fileName}</p>
                  <p className="text-[11px] text-slate-400">Categoria: {getCategoryLabel(previewTemplate.category)} • Tamanho: {(previewTemplate.fileSize / 1024).toFixed(1)} KB</p>
                </div>

                <a
                  href={previewTemplate.fileData}
                  download={previewTemplate.fileName}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold flex items-center gap-1.5 shadow-md"
                >
                  <Download className="h-4 w-4" /> Baixar Arquivo
                </a>
              </div>

              {/* PDF Preview Frame or Image Frame */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl h-96 overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                {previewTemplate.fileType.includes('pdf') || previewTemplate.fileData.startsWith('data:application/pdf') ? (
                  <iframe 
                    src={previewTemplate.fileData} 
                    className="w-full h-full border-none"
                    title={previewTemplate.name}
                  />
                ) : (
                  <img 
                    src={previewTemplate.fileData} 
                    alt={previewTemplate.name} 
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-5 py-2 bg-slate-900 text-white font-extrabold text-xs rounded-xl"
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
