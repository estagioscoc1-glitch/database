import React from 'react';
import { Printer, Download, X, FileText, CheckCircle2 } from 'lucide-react';
import { escapeHtml } from '../../utils/security';

interface RelatoriosDocumentPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  contentHtml: string;
  onPrint?: () => void;
  onDownloadTxt?: () => void;
  txtData?: string;
  txtFilename?: string;
}

export const RelatoriosDocumentPrintModal: React.FC<RelatoriosDocumentPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  contentHtml,
  onPrint,
  onDownloadTxt,
  txtData,
  txtFilename = 'relatorio_oficial.txt'
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    if (onPrint) onPrint();
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir o documento oficial.');
      return;
    }

    // `title` normalmente inclui o nome do aluno (ex.: "Dossiê Completo -
    // {nome}"). Isto vira uma janela nova via document.write — fora do
    // alcance do escape automático do React — então precisa ser escapado
    // aqui, na única porta de saída, e não em cada tela que chama este
    // componente (protege mesmo quem esquecer de escapar na origem).
    const tituloSeguro = escapeHtml(title);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${tituloSeguro}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #fff;
              font-size: 12pt;
              line-height: 1.6;
            }
            .document-header {
              text-align: center;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .document-header h1 {
              font-size: 16pt;
              margin: 0;
              color: #1e3a8a;
              font-weight: bold;
              text-transform: uppercase;
            }
            .document-header p {
              font-size: 9pt;
              margin: 4px 0 0 0;
              color: #475569;
            }
            .document-footer {
              margin-top: 40px;
              font-size: 8pt;
              color: #64748b;
              text-align: center;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="document-header">
            <h1>INSTITUIÇÃO DE ENSINO OSWALDO CRUZ</h1>
            <p>SECRETARIA DE REGISTRO ACADÊMICO & DEPARTAMENTO DE DOCUMENTAÇÃO OFICIAL</p>
          </div>
          
          <div>${contentHtml}</div>

          <div class="document-footer">
            Documento emitido digitalmente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}. Autenticidade garantida pelo sistema acadêmico.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadTxtFile = () => {
    if (!txtData) return;
    const blob = new Blob([txtData], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = txtFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">{title}</h3>
              {subtitle && <p className="text-xs text-blue-200">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {txtData && (
              <button
                onClick={handleDownloadTxtFile}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="h-4 w-4" /> Baixar Arquivo TXT
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="h-4 w-4" /> Imprimir Documento
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Paper Content View (styled like bulletins / official documents) */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div className="w-full max-w-3xl bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 font-sans min-h-[600px] space-y-6">
            
            {/* Institution Letterhead */}
            <div className="text-center border-b-2 border-blue-900 pb-4 mb-6 space-y-1">
              <h2 className="text-lg font-black tracking-wider text-blue-950 uppercase">INSTITUIÇÃO DE ENSINO OSWALDO CRUZ</h2>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Secretaria de Registro Acadêmico & Documentação Oficial</p>
              <p className="text-[10px] text-slate-400">Reconhecida pelo MEC / CEE - Credenciamento nº 4028/2024</p>
            </div>

            {/* Document Dynamic HTML Content */}
            <div 
              className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Official Digital Signature Footer */}
            <div className="pt-8 border-t border-slate-200 text-center space-y-2 text-[10px] text-slate-500">
              <div className="flex justify-around items-center pt-6">
                <div className="text-center w-52 border-t border-slate-800 pt-1 font-bold text-slate-800">
                  Secretaria Acadêmica
                </div>
                <div className="text-center w-52 border-t border-slate-800 pt-1 font-bold text-slate-800">
                  Direção Geral / Coordenação
                </div>
              </div>
              <p className="text-[9px] pt-4 text-slate-400">
                Documento emitido digitalmente via Sistema de Gestão Escolar Integrado. Data: {new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
