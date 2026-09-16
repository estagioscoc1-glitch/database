import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, CalendarDays } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { type CalendarioEscolarRegistro, NOMES_MESES, totalDiasLetivos } from '../../lib/calendarioEscolar';
import { CalendarioGradeVisual } from './CalendarioGradeVisual';

// ===========================================================================
//  CALENDÁRIO ESCOLAR — documento para impressão / PDF
//
//  Mesmo padrão de impressão já testado na Declaração e na Grade Curricular:
//  a folha limpa vai para um portal preso ao document.body e o @media print
//  esconde o #root, senão a janela de pré-visualização sai impressa por cima.
//
//  Diferente da Declaração, este documento pode ocupar mais de uma página
//  (o semestre tem vários meses) — então aqui não há o truque de empurrar
//  nada para o rodapé, o conteúdo simplesmente flui e quebra de página
//  normalmente.
// ===========================================================================

interface Props {
  registro: CalendarioEscolarRegistro;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.2cm 1.5cm;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .cal-portal {
      position: static !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .cal-mes { break-inside: avoid; }
  }
`;

export const CalendarioEscolarPrintView: React.FC<Props> = ({ registro, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-cal-print', 'true');
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

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
      {/* Cabeçalho */}
      <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.25cm', marginBottom: '0.35cm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          referrerPolicy="no-referrer"
          style={{ maxHeight: '1.3cm', objectFit: 'contain' }}
        />
        <h1 style={{ fontSize: '13pt', fontWeight: 'bold', margin: 0, textAlign: 'right' }}>
          Calendário Escolar {registro.ano}/{registro.semestre}
        </h1>
      </div>

      {/* Meses + Anotações/Dias letivos lado a lado */}
      <div style={{ display: 'flex', gap: '0.5cm' }}>
        <div
          style={{
            flex: '1.5',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            columnGap: '0.3cm',
            rowGap: '0.25cm',
            alignContent: 'start',
          }}
        >
          {registro.dados.meses.map(m => (
            <div key={m.mes} className="cal-mes" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.2cm' }}>
              <CalendarioGradeVisual ano={m.ano} mes={m.mes} diasMarcados={m.diasMarcados} compacto />
            </div>
          ))}
        </div>

        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.3cm' }}>
          {registro.dados.anotacoes.length > 0 && (
            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.3cm' }}>
              <h4 style={{ fontSize: '9pt', fontWeight: 'bold', margin: '0 0 0.15cm', textTransform: 'uppercase', color: '#1e3a8a' }}>
                Anotações
              </h4>
              <div style={{ margin: 0, fontSize: '7.8pt', lineHeight: 1.35 }}>
                {registro.dados.anotacoes.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.12cm 0',
                      borderBottom: i < registro.dados.anotacoes.length - 1 ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    {a.texto}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ border: '1px solid #0f172a', borderRadius: '8px', overflow: 'hidden', fontSize: '8.5pt' }}>
            <div style={{ background: '#0f172a', color: '#fff', padding: '0.15cm 0.3cm', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '8pt' }}>
              Orientações e dias letivos
            </div>
            {registro.dados.meses.map(m => (
              <div
                key={m.mes}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '0.1cm 0.3cm', borderBottom: '1px solid #e2e8f0' }}
              >
                <span style={{ fontWeight: 'bold' }}>{NOMES_MESES[m.mes]}</span>
                <span>{m.diasLetivos} Dias</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15cm 0.3cm', background: '#f1f5f9', fontWeight: 'bold' }}>
              <span>Total</span>
              <span>{totalDiasLetivos(registro.dados)} Dias</span>
            </div>
          </div>

          {registro.dados.fraseRodape && (
            <p style={{ fontSize: '8pt', fontStyle: 'italic', color: '#475569', textAlign: 'center', margin: 0 }}>
              {registro.dados.fraseRodape}
            </p>
          )}
        </div>
      </div>

      {/* Rodapé institucional — mesmo texto usado nas declarações */}
      <div style={{ marginTop: '0.4cm', paddingTop: '0.2cm', borderTop: '1px solid #cbd5e1', textAlign: 'center', fontSize: '7pt', color: '#444', lineHeight: 1.4 }}>
        <p style={{ margin: 0 }}>Rua 20, 796 – Centro Goiânia Goiás</p>
        <p style={{ margin: 0 }}>CEP – 74020-170 – Fone e Whatsapp (62) 3223-7602</p>
        <p style={{ margin: 0 }}>www.colegiooswaldocruz.com.br / E-mail: cocruz@terra.com.br</p>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Calendário Escolar {registro.ano}/{registro.semestre}
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
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            Na caixa do navegador, desmarque <strong>Cabeçalhos e rodapés</strong> e marque{' '}
            <strong>Gráficos de fundo</strong>, senão o timbre e as cores dos dias saem sem cor.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '900px', padding: '1.2cm 1.5cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="cal-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
