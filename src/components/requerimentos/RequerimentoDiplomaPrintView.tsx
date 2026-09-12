import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import type { Requerimento } from '../../lib/supabaseRequerimentos';

// ===========================================================================
//  FICHA DO REQUERIMENTO DE DIPLOMA — cópia do papel que a secretaria já usa
//
//  Mesmo padrão de prévia-depois-imprime dos outros documentos: mostra a
//  folha na tela primeiro, e só cria a cópia limpa para o papel quando a
//  pessoa clica em Imprimir.
//
//  A opção "Diploma A4" é nova — não existia no papel original. As outras
//  quatro são exatamente as do modelo físico.
// ===========================================================================

const OPCOES = [
  'Declaração de conclusão',
  '2ª Via do Diploma e Histórico',
  'Comprovante de Estudos para mudança de Colégio',
  'Diploma e histórico',
  'Diploma A4',
] as const;

interface Props {
  requerimento: Requerimento;
  estadoCivil?: string;
  telefone?: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: 210mm 297mm; margin: 1.8cm 2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .req-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important; background: #fff !important;
    }
  }
`;

function dataPorExtenso(iso: string): string {
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${meses[d.getMonth()].toUpperCase()} de ${d.getFullYear()}`;
}

export const RequerimentoDiplomaPrintView: React.FC<Props> = ({ requerimento, estadoCivil, telefone, onClose }) => {
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
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', fontSize: '11.5pt', lineHeight: 1.6 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.4mm solid #000', marginBottom: '6mm' }}>
        <tbody>
          <tr>
            <td style={{ padding: '2mm 3mm', fontSize: '9pt', textAlign: 'center' }}>
              Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170 "Resolução CEE/GO nº 018/2022"<br />
              Fone: (62) 3223.7602 www.colegiooswaldocruz.com.br
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontWeight: 'bold', margin: '0 0 5mm' }}>
        DOCUMENTO DE Nº {requerimento.protocolo}
      </p>

      <p style={{ textAlign: 'justify', margin: '0 0 6mm' }}>
        Eu, <strong>{requerimento.alunoNome.toUpperCase()}</strong>, aluno(a) do curso{' '}
        <strong>{(requerimento.cursoNome || '_____________________').toUpperCase()}</strong>{' '}
        com o estado civil de <strong>{(estadoCivil || '____________').toUpperCase()}</strong>, portador(a) do
        telefone para contato <strong>{telefone || '(__) _________'}</strong> estou requerendo:
      </p>

      <div style={{ margin: '0 0 8mm' }}>
        {OPCOES.map(op => (
          <p key={op} style={{ margin: '0 0 2mm', fontStyle: 'italic' }}>
            ( {op === requerimento.tipoNome ? 'X' : '\u00a0\u00a0'} ) {op}
          </p>
        ))}
      </div>

      <p style={{ fontWeight: 'bold', margin: '0 0 10mm' }}>
        Obs.: O prazo para a entrega é de 60 dias úteis.
      </p>

      <p style={{ margin: '0 0 16mm' }}>
        Goiânia, {dataPorExtenso(requerimento.solicitadoEm)}.
      </p>

      <div style={{ textAlign: 'center' }}>
        <div style={{ borderTop: '0.4mm solid #000', width: '75%', margin: '0 auto', paddingTop: '2mm' }}>
          Assinatura do Aluno ou Responsável
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Requerimento de Diploma — {requerimento.alunoNome}
            </span>
          </div>
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
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '1.8cm 2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="req-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
