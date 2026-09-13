import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import type { Aditivo } from '../../lib/supabaseAditivos';

// ===========================================================================
//  ADITIVO DE CONTRATO — impressão, para o admin conferir ou levar ao aluno
//  em papel. Mesmo padrão de prévia-depois-imprime dos outros documentos.
// ===========================================================================

interface Props {
  aditivo: Aditivo;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: 210mm 297mm; margin: 2cm; }
    #root, .no-print { display: none !important; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .adt-portal { position: static !important; display: block !important; width: 100% !important; }
  }
`;

export const AditivoPrintView: React.FC<Props> = ({ aditivo, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.2cm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz" referrerPolicy="no-referrer"
             style={{ height: '2cm', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 'bold', margin: '0 0 4mm' }}>
        {aditivo.titulo.toUpperCase()}
      </h1>

      {aditivo.destinatarioAlunoNome && (
        <p style={{ textAlign: 'center', fontSize: '10.5pt', margin: '0 0 8mm', color: '#444' }}>
          Referente ao aluno(a): <strong>{aditivo.destinatarioAlunoNome}</strong>
        </p>
      )}

      <div style={{ fontSize: '12pt', lineHeight: 1.75, textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
        {aditivo.texto}
      </div>

      <div style={{ textAlign: 'right', fontSize: '11pt', margin: '1.4cm 0 0' }}>
        Goiânia, {new Date().toLocaleDateString('pt-BR')}
      </div>

      <div style={{ marginTop: '2.2cm', textAlign: 'center' }}>
        <div style={{ borderTop: '0.4mm solid #000', width: '70%', margin: '0 auto', paddingTop: '2mm' }}>
          <p style={{ fontSize: '11pt', margin: 0 }}>
            {aditivo.destinatarioAlunoNome || 'Assinatura do Aluno ou Responsável'}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Imprimir Aditivo</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setImprimindo(true)} disabled={imprimindo}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs">
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '2cm' }}>
            {Documento}
          </div>
        </div>
      </div>
      {imprimindo && createPortal(
        <div className="adt-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
