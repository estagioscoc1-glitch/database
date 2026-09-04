import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ, ASSINATURA_SECRETARIO } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { preencherDeclaracao, dataPorExtenso } from '../../lib/supabaseDeclaracoes';
import type { DadosDeclaracao } from '../../lib/supabaseDeclaracoes';
import type { ModeloDeclaracao } from '../../lib/declaracaoTextos';

// ===========================================================================
//  DECLARAÇÃO — documento para impressão
//
//  Layout copiado das declarações que a escola já usa: timbre no alto,
//  título centralizado, um ou dois parágrafos justificados com recuo de
//  primeira linha, a data à direita, a assinatura do secretário e o rodapé
//  com endereço e telefone.
//
//  IMPRESSÃO — mesmo padrão testado no contrato e na grade curricular:
//  a folha limpa vai para um portal preso ao document.body e o @media print
//  esconde o #root e a janela. Sem isso a janela de pré-visualização sai
//  impressa por cima do documento (foi exatamente o que aconteceu na
//  primeira versão do contrato).
//
//  Declaração é documento de uma folha só, então aqui não existe repetição
//  de cabeçalho nem rodapé por página — diferente do contrato.
// ===========================================================================

interface Props {
  modelo: ModeloDeclaracao;
  dados: DadosDeclaracao;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.5cm 2cm;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .decl-portal {
      position: static !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .decl-folha { min-height: auto !important; }
  }
`;

export const DeclaracaoPrintView: React.FC<Props> = ({ modelo, dados, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-decl-print', 'true');
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
    <div
      className="decl-folha"
      style={{
        fontFamily: FONTE_DOCUMENTOS,
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '24cm',
      }}
    >
      {/* Timbre */}
      <div style={{ textAlign: 'center', marginBottom: '1.6cm' }}>
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          referrerPolicy="no-referrer"
          style={{ display: 'block', margin: '0 auto', maxHeight: '2.2cm', maxWidth: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Título */}
      <h1
        style={{
          textAlign: 'center',
          fontSize: '17pt',
          fontWeight: 'bold',
          margin: '0 0 1.4cm',
        }}
      >
        {modelo.titulo}
      </h1>

      {/* Corpo */}
      <div style={{ flex: 1, fontSize: '11.5pt', lineHeight: 1.75, textAlign: 'justify' }}>
        {modelo.paragrafos.map((par, i) => (
          <p key={i} style={{ margin: '0 0 14px', textIndent: '2.5em' }}>
            {preencherDeclaracao(par, dados)}
          </p>
        ))}
      </div>

      {/* Data */}
      <div style={{ textAlign: 'right', margin: '1.4cm 1cm 0 0', fontSize: '11.5pt' }}>
        Goiânia, {dataPorExtenso(dados.dataEmissao)}
      </div>

      {/* Assinatura */}
      {modelo.mostrarAssinatura && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.8cm' }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src={ASSINATURA_SECRETARIO}
              alt="Assinatura do Secretário"
              referrerPolicy="no-referrer"
              style={{ display: 'block', margin: '0 auto', width: '5.5cm', height: 'auto', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* Rodapé institucional */}
      {modelo.mostrarRodape && (
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '1.2cm',
            textAlign: 'center',
            fontSize: '8.5pt',
            color: '#444',
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: 0 }}>Rua 20, 796 – Centro Goiânia Goiás</p>
          <p style={{ margin: 0 }}>CEP – 74020-170 – Fone e Whatsapp (62) 3223-7602</p>
          <p style={{ margin: 0 }}>www.colegiooswaldocruz.com.br / E-mail: cocruz@terra.com.br</p>
        </div>
      )}
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              {modelo.nome} — {dados.alunoNome}
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
            {' '}<strong>Gráficos de fundo</strong>, senão o timbre e a assinatura saem sem cor.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '1.5cm 2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {/* Folha limpa, fora do #root, só durante a impressão */}
      {imprimindo && createPortal(
        <div className="decl-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
