import React from 'react';
import { Printer, Download, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface MovimentacaoDocumentPrintModalProps {
  title: string;
  subtitle?: string;
  contentHtml: string;
  onClose: () => void;
}

export const MovimentacaoDocumentPrintModal: React.FC<MovimentacaoDocumentPrintModalProps> = ({
  title,
  subtitle,
  contentHtml,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-fadeIn">
        
        {/* Header - Screen Only */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-snug">{title}</h3>
              {subtitle && <p className="text-xs text-blue-200 font-medium">{subtitle}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950 print:p-0 print:bg-white print:text-black">
          <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-xl rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 text-slate-900">
            
            {/* Institution Letterhead Header for Print */}
            <div className="text-center pb-6 border-b-2 border-slate-900 mb-8 space-y-1">
              <h1 className="text-lg font-black uppercase tracking-wider text-blue-950">
                COLÉGIO E INSTITUTO TÉCNICO OSWALDO CRUZ
              </h1>
              <p className="text-xs text-slate-600 font-bold">
                Educação Profissional de Excelência • Secretaria Acadêmica e Tesouraria
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Sistemas de Gestão Acadêmica Integrada • Documento Oficial
              </p>
            </div>

            {/* Rendered HTML content with variables replaced */}
            <div 
              className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between items-center print:mt-8">
              <span>Autenticidade Verificada via Sistema Acadêmico OC</span>
              <span>Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

          </div>
        </div>

        {/* Screen Action Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer transition-all"
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer className="h-4 w-4" /> Imprimir Documento
          </button>
        </div>

      </div>
    </div>
  );
};
