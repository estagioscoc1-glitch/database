import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileCheck2, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';

// ===========================================================================
//  AUTORIZAÇÃO AFC — impressão
//
//  Mesmo padrão de impressão já testado em Declarações e Calendário: a
//  folha limpa vai para um portal preso ao document.body, e o @media print
//  esconde o #root, senão a pré-visualização sai impressa por cima.
//
//  Duas partes:
//  1) Cartõezinhos de autorização, 12 por folha (grade 3×4), um por aluno.
//  2) Depois dos cartões, a lista de assinatura — uma tabela simples com
//     todo mundo, pra assinar confirmando presença.
// ===========================================================================

interface AlunoAutorizado {
  studentId: string;
  studentName: string;
  enrollment: string;
  courseName: string;
  className: string;
  paidAt: string;
}

interface Props {
  alunos: AlunoAutorizado[];
  tituloAutorizacao: string;
  nomeCobranca: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.2cm;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .afc-portal {
      position: static !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .afc-pagina {
      break-after: page;
      page-break-after: always;
    }
    .afc-pagina:last-child {
      break-after: auto;
      page-break-after: auto;
    }
  }
`;

function agruparEmPaginas<T>(lista: T[], porPagina: number): T[][] {
  const paginas: T[][] = [];
  for (let i = 0; i < lista.length; i += porPagina) {
    paginas.push(lista.slice(i, i + porPagina));
  }
  return paginas.length > 0 ? paginas : [[]];
}

export const AutorizacaoAFCPrintView: React.FC<Props> = ({ alunos, tituloAutorizacao, nomeCobranca, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-afc-print', 'true');
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

  const paginasDeCartoes = agruparEmPaginas(alunos, 12);

  const Cartao: React.FC<{ aluno: AlunoAutorizado }> = ({ aluno }) => (
    <div style={{
      border: '1px dashed #94a3b8',
      borderRadius: '8px',
      padding: '0.35cm',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: '4.3cm',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2cm', marginBottom: '0.15cm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="COC" style={{ height: '0.7cm', objectFit: 'contain' }} />
        <span style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#1e293b' }}>COLÉGIO OSWALDO CRUZ</span>
      </div>
      <p style={{ fontSize: '7.5pt', fontWeight: 'bold', margin: '0 0 0.2cm', color: '#334155' }}>
        {tituloAutorizacao}
      </p>
      <div style={{ fontSize: '8pt', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}><strong>{aluno.studentName}</strong></p>
        <p style={{ margin: 0 }}>Matrícula: {aluno.enrollment}</p>
        <p style={{ margin: 0 }}>{aluno.courseName} — {aluno.className}</p>
      </div>
      <p style={{ fontSize: '6.5pt', color: '#64748b', margin: '0.2cm 0 0', textAlign: 'right' }}>
        Ref.: {nomeCobranca}
      </p>
    </div>
  );

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
      {paginasDeCartoes.map((pagina, pIdx) => (
        <div
          key={pIdx}
          className="afc-pagina"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(4, auto)',
            gap: '0.3cm',
          }}
        >
          {pagina.map((aluno, i) => (
            <Cartao key={i} aluno={aluno} />
          ))}
        </div>
      ))}

      {/* Lista de assinatura, depois de todos os cartões */}
      <div className="afc-pagina">
        <div style={{ textAlign: 'center', marginBottom: '0.8cm' }}>
          <img
            src={LOGO_COLEGIO_OSWALDO_CRUZ}
            alt="Colégio Oswaldo Cruz"
            style={{ display: 'block', margin: '0 auto', maxHeight: '1.8cm', objectFit: 'contain' }}
          />
        </div>
        <h1 style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', margin: '0 0 0.3cm' }}>
          Lista de Assinatura — {nomeCobranca}
        </h1>
        <p style={{ textAlign: 'center', fontSize: '9pt', color: '#475569', margin: '0 0 0.8cm' }}>
          {tituloAutorizacao}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '0.2cm 0.3cm', textAlign: 'left', width: '5%' }}>Nº</th>
              <th style={{ padding: '0.2cm 0.3cm', textAlign: 'left', width: '35%' }}>Aluno</th>
              <th style={{ padding: '0.2cm 0.3cm', textAlign: 'left', width: '15%' }}>Matrícula</th>
              <th style={{ padding: '0.2cm 0.3cm', textAlign: 'left', width: '20%' }}>Turma</th>
              <th style={{ padding: '0.2cm 0.3cm', textAlign: 'left', width: '25%' }}>Assinatura</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.35cm 0.3cm' }}>{i + 1}</td>
                <td style={{ padding: '0.35cm 0.3cm', fontWeight: 'bold' }}>{a.studentName}</td>
                <td style={{ padding: '0.35cm 0.3cm' }}>{a.enrollment}</td>
                <td style={{ padding: '0.35cm 0.3cm' }}>{a.className}</td>
                <td style={{ padding: '0.35cm 0.3cm' }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileCheck2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Autorizações AFC — {alunos.length} aluno(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImprimindo(true)}
              disabled={imprimindo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            Na caixa do navegador, desmarque <strong>Cabeçalhos e rodapés</strong> e marque
            {' '}<strong>Gráficos de fundo</strong>, senão o timbre sai sem cor.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100 space-y-4">
          <div className="bg-white shadow-sm mx-auto p-4" style={{ maxWidth: '740px' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="afc-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
