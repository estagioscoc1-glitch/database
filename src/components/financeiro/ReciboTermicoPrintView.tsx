import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Receipt } from 'lucide-react';
import { FinancialReceipt } from '../../types/financeiro';

// ===========================================================================
//  CUPOM TÉRMICO (Bematech MP-4000 TH e compatíveis)
//
//  A Bematech MP-4000 TH, com o driver instalado no Windows, aparece como
//  uma impressora comum — não precisa de nada especial (ESC/POS, WebUSB
//  etc.), só imprimir uma página estreita nela pelo navegador, igual
//  imprimir num papel A4 só que de 80mm de largura. Por isso o mecanismo é
//  o mesmo já usado nos outros documentos (janela de impressão do
//  navegador), só muda o tamanho da folha.
//
//  Layout copiado do cupom que a escola já usa (sistema antigo, impresso
//  na mesma impressora) — mesma ordem de campos, fonte monoespaçada
//  parecida com a impressão térmica.
// ===========================================================================

interface Props {
  receipt: FinancialReceipt;
  turma?: string;
  quemPagou?: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: 80mm 200mm;
      margin: 2mm;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .cupom-portal {
      position: static !important;
      display: block !important;
      width: 76mm !important;
    }
  }
`;

export const ReciboTermicoPrintView: React.FC<Props> = ({ receipt, turma, quemPagou, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-cupom-print', 'true');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 150);
    const destravar = window.setTimeout(() => setImprimindo(false), 15000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(destravar);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  const dataObj = new Date(receipt.date);
  const dataBr = dataObj.toLocaleDateString('pt-BR');
  const horaBr = dataObj.toLocaleTimeString('pt-BR');
  const linhaDivisoria = '-'.repeat(32);
  const proveniente = receipt.items?.[0]?.title || receipt.description;

  const Documento = (
    <div style={{
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '10.5px',
      lineHeight: 1.35,
      color: '#000',
      width: '76mm',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
        COLÉGIO OSWALDO CRUZ{'\n'}
        QUALIDADE DE ENSINO RECONHECIDA{'\n'}
        INTERNACIONALMENTE
      </div>
      <div style={{ textAlign: 'center' }}>
        Rua 20 Nº 796-Centro-Goiânia-GO{'\n'}
        (entre a Anhanguera e Araguaia){'\n'}
        Fone: (62)3223-7602{'\n'}
        www.colegiooswaldocruz.com.br
      </div>

      <div>{linhaDivisoria}</div>

      <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
        SEM VALOR FISCAL{'\n'}
        COMPROVANTE DE PAGAMENTO{'\n'}
        Recibo Nº: {receipt.receiptNumber}{'\n'}
        VALOR: R$ {receipt.totalValue.toFixed(2)}
      </div>

      <div>{linhaDivisoria}</div>

      <div>
        Proveniente de: {proveniente}{'\n'}
        Aluno: {receipt.enrollment}-{receipt.studentName.toUpperCase()}{'\n'}
        {receipt.courseName ? <>Curso: {receipt.courseName.toUpperCase()}{'\n'}</> : null}
        Data: {dataBr}{turma ? `      Turma: ${turma}` : ''}{'\n'}
        Quem Pagou: {(quemPagou || receipt.studentName).toUpperCase()}{'\n'}
        Operador: {receipt.user.toUpperCase()}{'\n'}
        Forma de Pagamento: {receipt.paymentMethod.toUpperCase()}
      </div>

      <div>{linhaDivisoria}</div>

      <div style={{ textAlign: 'center' }}>
        Sistema de Gerenciamento Escolar{'\n'}
        Portal Acadêmico LYnx EDU{'\n'}
        {dataBr} {horaBr}   Recibo {receipt.receiptNumber}
        {receipt.cashRegisterSeq ? `   Caixa ${receipt.cashRegisterSeq}` : ''}
      </div>

      <div style={{ textAlign: 'center', letterSpacing: '2px' }}>
        {'*.'.repeat(16)}*
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Cupom (Bematech) — {receipt.receiptNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setImprimindo(true)} disabled={imprimindo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs">
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir no Cupom'}
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200">
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            No diálogo de impressão do navegador, escolha a impressora <strong>Bematech MP-4000 TH</strong>
            {' '}(ou o nome que aparecer no Windows) e o tamanho de papel de <strong>80mm</strong>.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center">
          <div className="bg-white shadow-sm p-3">
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="cupom-portal" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
