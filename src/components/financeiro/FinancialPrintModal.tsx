import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, X, ExternalLink, ZoomIn, ZoomOut, Maximize2, Minimize2, 
  FileText, ShieldCheck, Download, CheckCircle2, DollarSign, Wallet
} from 'lucide-react';
import { motion } from 'motion/react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { CashRegister, FinancialReceipt, Expense, Installment } from '../../types/financeiro';

export interface FinancialPrintData {
  type: 'CAIXA_DIARIO' | 'GERENCIAL_DRE' | 'MENSAL_BALANCETE' | 'ANUAL' | 'IRPF_DECLARACAO' | 'RECIBO_2VIA' | 'INADIMPLENCIA';
  title: string;
  subtitle?: string;
  dateRange?: string;
  user?: string;

  // Specific payloads
  cashRegister?: CashRegister;
  receipts?: FinancialReceipt[];
  expenses?: Expense[];
  installments?: Installment[];
  
  // Student & IRPF
  studentInfo?: {
    name: string;
    enrollment: string;
    cpf?: string;
    rg?: string;
    courseName?: string;
    className?: string;
    responsibleName?: string;
    responsibleCpf?: string;
  };
  singleReceipt?: FinancialReceipt;
  yearCalendar?: number;
  irpfInstallments?: Array<{ 
    competencia: string; 
    number: number; 
    totalInstallments: number; 
    paidDate: string; 
    receiptNumber: string; 
    value: number 
  }>;
}

interface FinancialPrintModalProps {
  data: FinancialPrintData;
  onClose: () => void;
}

export const FinancialPrintModal: React.FC<FinancialPrintModalProps> = ({ data, onClose }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const printableRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Opens report in a new browser tab/window for dedicated standalone printing
  const handleOpenNewPage = () => {
    if (!printableRef.current) return;
    const contentHtml = printableRef.current.innerHTML;

    const printWin = window.open('', '_blank', 'width=1100,height=900,scrollbars=yes,resizable=yes');
    if (!printWin) {
      alert('Não foi possível abrir uma nova janela. Por favor, libere os popups do navegador.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>${data.title} - Colégio Oswaldo Cruz</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
              @page { size: A4 portrait; margin: 12mm; }
            }
            body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #0f172a; min-height: 100vh; padding: 2rem 1rem; }
            .a4-sheet { background: white; max-width: 820px; margin: 0 auto; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          </style>
        </head>
        <body>
          <div class="no-print max-w-[820px] mx-auto mb-6 flex items-center justify-between bg-slate-800 text-white p-4 rounded-2xl shadow-xl">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-sm uppercase tracking-wide">Janela de Impressão • ${data.title}</span>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="window.print()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-2">
                🖨️ Imprimir Documento
              </button>
              <button onclick="window.close()" class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-extrabold text-xs rounded-xl cursor-pointer">
                Fechar
              </button>
            </div>
          </div>

          <div class="a4-sheet print:shadow-none print:border-none print:p-0">
            ${contentHtml}
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Calculations for CAIXA_DIARIO
  const cashReg = data.cashRegister;
  const cashReceipts = (data.receipts || []).filter(r => r.status === 'VALIDO');
  const cashExpenses = data.expenses || [];

  const totalIncomes = cashReceipts.reduce((sum, r) => sum + r.totalValue, 0);
  const totalExpensesVal = cashExpenses.reduce((sum, e) => sum + e.value, 0);
  const initialBal = cashReg?.initialBalance || 0;
  const netBalance = initialBal + totalIncomes - totalExpensesVal;

  const receiptsByMethod: { [key: string]: number } = {};
  cashReceipts.forEach(r => {
    receiptsByMethod[r.paymentMethod] = (receiptsByMethod[r.paymentMethod] || 0) + r.totalValue;
  });

  // Calculations for GERENCIAL_DRE & MENSAL & ANUAL
  const totalRevenue = (data.receipts || []).filter(r => r.status === 'VALIDO').reduce((sum, r) => sum + r.totalValue, 0);
  const totalExp = (data.expenses || []).reduce((sum, e) => sum + e.value, 0);
  const opProfit = totalRevenue - totalExp;

  // Render Document Body Content
  const renderDocumentBody = () => {
    switch (data.type) {
      
      case 'CAIXA_DIARIO':
        return (
          <div className="space-y-6 text-xs text-slate-800">
            {/* Cash Summary Banner */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Inicial</span>
                <span className="font-mono font-black text-sm">R$ {initialBal.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">(+) Entradas Totais</span>
                <span className="font-mono font-black text-sm text-emerald-600">R$ {totalIncomes.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">(-) Saídas Totais</span>
                <span className="font-mono font-black text-sm text-rose-600">R$ {totalExpensesVal.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-slate-900 text-white rounded-xl text-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase block">Saldo Fechamento</span>
                <span className="font-mono font-black text-sm text-emerald-400">R$ {netBalance.toFixed(2)}</span>
              </div>
            </div>

            {/* Subtotals by Payment Method */}
            <div className="space-y-1.5">
              <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-500 border-b pb-1 border-slate-200">
                1. Subtotais por Forma de Pagamento
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(receiptsByMethod).length === 0 ? (
                  <p className="text-slate-400 italic">Nenhum recebimento registrado neste caixa.</p>
                ) : (
                  Object.entries(receiptsByMethod).map(([method, val]) => (
                    <div key={method} className="p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">{method}</span>
                      <span className="font-mono font-extrabold text-xs">R$ {val.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Incomes Table */}
            <div className="space-y-1.5">
              <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-500 border-b pb-1 border-slate-200">
                2. Relação Discriminada de Entradas ({cashReceipts.length})
              </h4>
              <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
                <thead className="bg-slate-100 uppercase text-[9px] font-extrabold text-slate-600">
                  <tr>
                    <th className="p-2 border border-slate-200">Nº Recibo</th>
                    <th className="p-2 border border-slate-200">Data/Hora</th>
                    <th className="p-2 border border-slate-200">Aluno / Lançamento</th>
                    <th className="p-2 border border-slate-200">Forma</th>
                    <th className="p-2 border border-slate-200 text-right">Valor R$</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cashReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-slate-400 italic">Nenhuma entrada no caixa.</td>
                    </tr>
                  ) : (
                    cashReceipts.map(r => (
                      <tr key={r.receiptNumber}>
                        <td className="p-2 border border-slate-200 font-mono font-bold text-blue-700">{r.receiptNumber}</td>
                        <td className="p-2 border border-slate-200 font-mono">{new Date(r.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-2 border border-slate-200">{r.studentName} - {r.description}</td>
                        <td className="p-2 border border-slate-200 uppercase font-mono">{r.paymentMethod}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-700">R$ {r.totalValue.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Expenses Table */}
            {cashExpenses.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-500 border-b pb-1 border-slate-200">
                  3. Relação Discriminada de Saídas / Sangrias ({cashExpenses.length})
                </h4>
                <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
                  <thead className="bg-slate-100 uppercase text-[9px] font-extrabold text-slate-600">
                    <tr>
                      <th className="p-2 border border-slate-200">Data</th>
                      <th className="p-2 border border-slate-200">Categoria</th>
                      <th className="p-2 border border-slate-200">Descrição / Favorecido</th>
                      <th className="p-2 border border-slate-200 text-right">Valor R$</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cashExpenses.map(e => (
                      <tr key={e.id}>
                        <td className="p-2 border border-slate-200 font-mono">{e.date}</td>
                        <td className="p-2 border border-slate-200 uppercase font-bold">{e.category}</td>
                        <td className="p-2 border border-slate-200">{e.description}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-rose-700">- R$ {e.value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case 'GERENCIAL_DRE':
      case 'MENSAL_BALANCETE':
      case 'ANUAL':
        return (
          <div className="space-y-6 text-xs text-slate-800">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Faturamento Bruto Quitados</span>
                <span className="text-lg font-black font-mono text-emerald-700">R$ {totalRevenue.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Despesas Operacionais Totais</span>
                <span className="text-lg font-black font-mono text-rose-700">R$ {totalExp.toFixed(2)}</span>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase block">Resultado Operacional Líquido</span>
                <span className="text-lg font-black font-mono text-blue-800">R$ {opProfit.toFixed(2)}</span>
              </div>
            </div>

            {/* DRE Structure Table */}
            <div className="space-y-2">
              <h4 className="font-black uppercase text-[10px] tracking-wider text-slate-500 border-b pb-1 border-slate-200">
                Demonstrativo de Resultado do Exercício (DRE)
              </h4>
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="p-2.5 bg-slate-100 font-black uppercase text-[10px] flex justify-between border-b border-slate-300">
                  <span>Estrutura de Contas</span>
                  <span>Valor Realizado (R$)</span>
                </div>
                <div className="divide-y divide-slate-200 font-semibold">
                  <div className="p-2.5 flex justify-between bg-white text-slate-900">
                    <span>(+) RECEITA BRUTA OPERACIONAL (MENSALIDADES E TAXAS)</span>
                    <span className="font-mono font-black text-emerald-700">R$ {totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 flex justify-between bg-white text-rose-700">
                    <span>(-) CUSTOS OPERACIONAIS E DESPESAS ADMINISTRATIVAS</span>
                    <span className="font-mono font-black">- R$ {totalExp.toFixed(2)}</span>
                  </div>
                  <div className="p-3.5 bg-slate-900 text-white flex justify-between font-black text-sm">
                    <span>(=) RESULTADO OPERACIONAL LÍQUIDO</span>
                    <span className="font-mono text-emerald-400">R$ {opProfit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'IRPF_DECLARACAO':
        const std = data.studentInfo;
        const calendar = data.yearCalendar || new Date().getFullYear() - 1;
        const instList = data.irpfInstallments || [];
        const totalIrpfValue = instList.reduce((sum, item) => sum + item.value, 0);

        return (
          <div className="space-y-6 text-xs text-slate-900 leading-relaxed">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <h4 className="font-black uppercase text-xs text-blue-900 border-b border-slate-200 pb-1">
                DECLARAÇÃO DE QUITAÇÃO ANUAL DE DÉBITOS EDUCACIONAIS (IRPF {calendar})
              </h4>
              <p className="text-[11px] text-slate-700">
                Declaração oficial emitida em conformidade com as disposições da <strong>Lei Federal nº 12.003/2009</strong> para fins de comprovação junto à Secretaria da Receita Federal do Brasil.
              </p>
            </div>

            {/* Identification Grid */}
            <div className="border border-slate-300 rounded-xl p-4 grid grid-cols-2 gap-3 bg-white">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Aluno(a) Beneficiário(a):</span>
                <span className="font-black text-sm uppercase block">{std?.name || 'N/A'}</span>
                <span className="text-[11px] font-mono text-slate-500">Matrícula: {std?.enrollment || 'N/A'} • CPF: {std?.cpf || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Responsável Financeiro:</span>
                <span className="font-black text-sm uppercase block">{std?.responsibleName || std?.name}</span>
                <span className="text-[11px] font-mono text-slate-500">CPF Contribuinte: {std?.responsibleCpf || std?.cpf || 'Não informado'}</span>
              </div>
            </div>

            {/* Declaratory Text */}
            <p className="text-justify leading-relaxed">
              O <strong>COLÉGIO OSWALDO CRUZ</strong>, pessoa jurídica de direito privado, inscrito no CNPJ sob o nº 00.000.000/0001-00, declara para os devidos fins de direito e comprovação de rendimentos no Imposto de Renda Pessoa Física (IRPF), que o(a) contribuinte acima qualificado(a) efetuou a quitação integral das mensalidades relativas às prestações de serviços educacionais no ano-calendário de <strong>{calendar}</strong>, conforme discriminado na tabela a seguir:
            </p>

            {/* Installments Table */}
            <div className="space-y-2">
              <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
                <thead className="bg-slate-100 uppercase text-[9px] font-extrabold text-slate-700">
                  <tr>
                    <th className="p-2 border border-slate-300">Competência</th>
                    <th className="p-2 border border-slate-300">Parcela</th>
                    <th className="p-2 border border-slate-300">Data de Quitação</th>
                    <th className="p-2 border border-slate-300">Nº do Recibo</th>
                    <th className="p-2 border border-slate-300 text-right">Valor Pago (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {instList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-3 text-center text-slate-400 italic">Nenhum pagamento registrado no ano-calendário {calendar}.</td>
                    </tr>
                  ) : (
                    instList.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border border-slate-300 font-bold uppercase">{item.competencia}</td>
                        <td className="p-2 border border-slate-300 font-mono">{item.number}/{item.totalInstallments}</td>
                        <td className="p-2 border border-slate-300 font-mono">{new Date(item.paidDate).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-blue-700">{item.receiptNumber}</td>
                        <td className="p-2 border border-slate-300 text-right font-mono font-extrabold text-emerald-800">R$ {item.value.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td colSpan={4} className="p-2.5 text-right uppercase">Total Anual Pago Quitado em {calendar}:</td>
                    <td className="p-2.5 text-right font-mono text-emerald-400 text-sm">R$ {totalIrpfValue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Por ser verdade, firmamos a presente declaração para que produza os seus regulares efeitos jurídicos e legais.
            </p>
          </div>
        );

      case 'RECIBO_2VIA':
        const rc = data.singleReceipt || (data.receipts && data.receipts[0]);
        if (!rc) return <p className="text-red-500 font-bold">Nenhum recibo selecionado.</p>;

        return (
          <div className="space-y-6 text-xs text-slate-900">
            {/* Official Receipt Box */}
            <div className="border-2 border-slate-900 rounded-2xl p-6 space-y-4 bg-white relative overflow-hidden">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider">COMPROVANTE DE PAGAMENTO</span>
                  <h3 className="text-lg font-black uppercase text-slate-900">2ª VIA - RECIBO OFICIAL</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-black text-blue-700 block">Nº RECIBO: {rc.receiptNumber}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{new Date(rc.date).toLocaleDateString('pt-BR')} {new Date(rc.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Big Value Display */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-800">VALOR TOTAL RECEBIDO:</span>
                <span className="text-xl font-black font-mono text-emerald-700">R$ {rc.totalValue.toFixed(2)}</span>
              </div>

              <div className="space-y-2 text-xs leading-relaxed">
                <p>
                  Recebemos de <strong>{rc.studentName}</strong> (Matrícula: <strong className="font-mono">{rc.enrollment}</strong>), a quantia de <strong>R$ {rc.totalValue.toFixed(2)}</strong>, referente a:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800">
                  {rc.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Forma de Pagamento:</span>
                  <span className="font-extrabold uppercase font-mono">{rc.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Operador / Autenticação:</span>
                  <span className="font-mono text-slate-600">{rc.user} • AUTH-{rc.receiptNumber.replace(/[^0-9]/g, '')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'INADIMPLENCIA':
        const insts = data.installments || [];
        const totalPending = insts.reduce((sum, i) => sum + (i.originalValue || 0), 0);

        return (
          <div className="space-y-4 text-xs text-slate-900">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <span className="font-bold text-amber-900 uppercase">Total Geral em Aberto / Pendente:</span>
              <span className="font-mono font-black text-amber-700 text-sm">R$ {totalPending.toFixed(2)}</span>
            </div>

            <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
              <thead className="bg-slate-100 uppercase text-[9px] font-extrabold text-slate-700">
                <tr>
                  <th className="p-2 border border-slate-300">Aluno</th>
                  <th className="p-2 border border-slate-300">Matrícula</th>
                  <th className="p-2 border border-slate-300">Competência</th>
                  <th className="p-2 border border-slate-300">Vencimento</th>
                  <th className="p-2 border border-slate-300 text-right">Valor R$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {insts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-slate-400 italic">Nenhum débito pendente encontrado.</td>
                  </tr>
                ) : (
                  insts.map((i, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border border-slate-300 font-bold">{i.studentName}</td>
                      <td className="p-2 border border-slate-300 font-mono">{i.enrollment}</td>
                      <td className="p-2 border border-slate-300 font-mono">{i.competencia} ({i.number}/{i.totalInstallments})</td>
                      <td className="p-2 border border-slate-300 font-mono text-rose-600 font-bold">{i.dueDate}</td>
                      <td className="p-2 border border-slate-300 text-right font-mono font-bold text-rose-700">R$ {(i.originalValue || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto no-print-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden border border-slate-300 dark:border-slate-800 transition-all duration-200 ${
          isMaximized 
            ? 'fixed inset-0 w-screen h-screen rounded-none max-h-screen z-50' 
            : 'w-full max-w-5xl rounded-3xl h-[90vh] max-h-[90vh]'
        }`}
      >
        {/* Title Bar (OS Window Controls) */}
        <div className="px-5 py-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 select-none no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 font-mono truncate max-w-xl">
              [Janela de Impressão] {data.title}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restaurar" : "Maximizar"}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              title="Fechar"
              className="p-1.5 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="h-4 w-4" /> Imprimir Documento
            </button>

            <button
              onClick={handleOpenNewPage}
              type="button"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" /> Abrir em Nova Página
            </button>
          </div>

          {/* Zoom Controls & Page Format */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
              <button
                onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
                className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Reduzir Zoom"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-[11px] font-bold px-2">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(prev => Math.min(1.4, prev + 0.1))}
                className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-mono font-bold text-[10px]">
              A4 Retrato
            </span>
          </div>
        </div>

        {/* Scrollable Printable Page Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/70 dark:bg-slate-950 flex justify-center">
          
          <div 
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 w-full max-w-[800px]"
          >
            {/* Printable A4 Document Sheet */}
            <div 
              ref={printableRef}
              id="printable-report-area"
              className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-300 space-y-6 relative print:shadow-none print:border-none print:p-0 print:m-0"
            >
              {/* Official Letterhead Header */}
              <div className="border-b-2 border-slate-900 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={LOGO_COLEGIO_OSWALDO_CRUZ} 
                      alt="Colégio Oswaldo Cruz" 
                      className="h-16 w-auto object-contain"
                    />
                    <div>
                      <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Colégio Oswaldo Cruz</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Educação e Gestão Integrada • LYNX EDU</p>
                      <p className="text-[9px] font-mono text-slate-400">CNPJ: 00.000.000/0001-00 • Secretaria Financeira</p>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono space-y-0.5">
                    <p className="font-black text-blue-900 uppercase">{data.title}</p>
                    <p className="text-slate-500">Emissão: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-slate-400">Operador: {data.user || 'Secretaria'}</p>
                  </div>
                </div>

                {data.subtitle && (
                  <div className="p-2 bg-slate-100 rounded-lg text-center font-extrabold text-xs uppercase text-slate-700">
                    {data.subtitle} {data.dateRange ? `(${data.dateRange})` : ''}
                  </div>
                )}
              </div>

              {/* Main Document Body */}
              {renderDocumentBody()}

              {/* Official Signatures Block */}
              <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-900 border-t border-slate-300">
                <div>
                  <div className="border-b border-slate-900 mx-auto w-48 mb-1"></div>
                  <p className="uppercase">{data.user || 'Operador Responsável'}</p>
                  <p className="text-[9px] font-normal text-slate-500">Tesouraria / Operador de Caixa</p>
                </div>
                <div>
                  <div className="border-b border-slate-900 mx-auto w-48 mb-1"></div>
                  <p className="uppercase">Gerência Financeira</p>
                  <p className="text-[9px] font-normal text-slate-500">Visto de Conferência & Homologação</p>
                </div>
              </div>

              {/* Document Footer Metadata */}
              <div className="pt-4 text-center text-[9px] font-mono text-slate-400 border-t border-slate-100 flex justify-between">
                <span>COLÉGIO OSWALDO CRUZ • DOCUMENTO GERADO VIA PORTAL ACADÊMICO</span>
                <span>AUTENTICIDADE VERIFICADA E AUDITADA NO SISTEMA</span>
              </div>

            </div>
          </div>

        </div>

      </motion.div>
    </div>,
    document.body
  );
};
