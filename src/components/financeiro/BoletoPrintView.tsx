import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Landmark, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { ConvenioBancario, Installment } from '../../types/financeiro';
import { gerarDadosBoleto } from '../../services/boletoStorage';

// ===========================================================================
//  BOLETO — impressão
//
//  Layout padrão de mercado: recibo do pagador (canhoto) em cima, linha
//  picotada, ficha de compensação embaixo — igual todo boleto de banco.
//
//  O código de barras é desenhado de verdade a partir dos 44 dígitos
//  (padrão Intercalado 2 de 5 — é o único tipo de código de barras que se
//  usa em boleto). Essa parte não muda não importa o banco.
// ===========================================================================

interface Props {
  installment: Installment;
  convenio: ConvenioBancario;
  nossoNumero: number;
  sacadoNome: string;
  sacadoCpf?: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 portrait; margin: 1cm; }
    #root, .no-print { display: none !important; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .boleto-portal { position: static !important; display: block !important; width: 100% !important; }
  }
`;

/** Padrões Intercalado 2 de 5 — N = barra/espaço estreito, W = largo. */
const PADROES_ITF: Record<string, string> = {
  '0': 'NNWWN', '1': 'WNNNW', '2': 'NWNNW', '3': 'WWNNN', '4': 'NNWNW',
  '5': 'WNWNN', '6': 'NWWNN', '7': 'NNNWW', '8': 'WNNWN', '9': 'NWNWN',
};

const CodigoBarrasITF: React.FC<{ codigo: string }> = ({ codigo }) => {
  const N = 1.6; // largura da barra/espaço estreito, em px
  const W = N * 2.7;
  const alturaBarras = 45;
  const elementos: { x: number; largura: number; preto: boolean }[] = [];
  let x = 0;

  const add = (largura: number, preto: boolean) => {
    elementos.push({ x, largura, preto });
    x += largura;
  };

  // início: bar,space,bar,space, todos estreitos
  add(N, true); add(N, false); add(N, true); add(N, false);

  const digitos = codigo.length % 2 === 0 ? codigo : '0' + codigo;
  for (let i = 0; i < digitos.length; i += 2) {
    const padraoBarra = PADROES_ITF[digitos[i]];
    const padraoEspaco = PADROES_ITF[digitos[i + 1]];
    for (let p = 0; p < 5; p++) {
      add(padraoBarra[p] === 'W' ? W : N, true);
      add(padraoEspaco[p] === 'W' ? W : N, false);
    }
  }

  // fim: bar largo, space estreito, bar estreito
  add(W, true); add(N, false); add(N, true);

  const larguraTotal = x;

  return (
    <svg width="100%" height={alturaBarras} viewBox={`0 0 ${larguraTotal} ${alturaBarras}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <rect x={0} y={0} width={larguraTotal} height={alturaBarras} fill="#fff" />
      {elementos.filter(e => e.preto).map((e, i) => (
        <rect key={i} x={e.x} y={0} width={e.largura} height={alturaBarras} fill="#000" />
      ))}
    </svg>
  );
};

export const BoletoPrintView: React.FC<Props> = ({ installment, convenio, nossoNumero, sacadoNome, sacadoCpf, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);
  const dados = gerarDadosBoleto(installment, convenio, nossoNumero);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-boleto-print', 'true');
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

  const valorPagar = (installment.originalValue - installment.discountValue).toFixed(2);
  const vencimentoBr = new Date(installment.dueDate + 'T12:00:00').toLocaleDateString('pt-BR');

  const FichaCampo: React.FC<{ label: string; children: React.ReactNode; grow?: boolean }> = ({ label, children, grow }) => (
    <div style={{ border: '1px solid #000', borderTop: 'none', padding: '2px 5px', flex: grow ? 1 : undefined }}>
      <div style={{ fontSize: '6pt', color: '#333' }}>{label}</div>
      <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>{children}</div>
    </div>
  );

  const Recibo = (
    <div style={{ border: '1px solid #000', padding: '0.3cm', fontFamily: FONTE_DOCUMENTOS, fontSize: '8pt' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '0.15cm', marginBottom: '0.15cm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="COC" style={{ height: '0.7cm', objectFit: 'contain' }} />
        <span style={{ fontWeight: 'bold', fontSize: '10pt' }}>{convenio.bancoCodigo}-{convenio.bancoNome}</span>
      </div>
      <div style={{ display: 'flex', gap: '0.3cm' }}>
        <div style={{ flex: 2 }}><strong>Cedente:</strong> {convenio.cedenteNome}</div>
        <div style={{ flex: 1 }}><strong>Vencimento:</strong> {vencimentoBr}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.3cm', marginTop: '0.1cm' }}>
        <div style={{ flex: 2 }}><strong>Sacado:</strong> {sacadoNome} {sacadoCpf ? `— CPF ${sacadoCpf}` : ''}</div>
        <div style={{ flex: 1 }}><strong>Nº Documento:</strong> {installment.number}/{installment.totalInstallments}</div>
      </div>
      <div style={{ display: 'flex', gap: '0.3cm', marginTop: '0.1cm', justifyContent: 'space-between' }}>
        <div><strong>Nosso Número:</strong> {nossoNumero}</div>
        <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>Valor: R$ {valorPagar}</div>
      </div>
      <p style={{ textAlign: 'right', fontSize: '7pt', marginTop: '0.2cm', marginBottom: 0 }}>Recibo do Pagador</p>
    </div>
  );

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', maxWidth: '740px', margin: '0 auto' }}>
      {!dados.valido && (
        <div className="no-print" style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '0.3cm', marginBottom: '0.4cm', fontSize: '8pt', color: '#92400e' }}>
          <strong>Atenção:</strong> {dados.avisoValidade}
        </div>
      )}
      {!convenio.ativo && (
        <div style={{ textAlign: 'center', background: '#fee2e2', border: '2px dashed #dc2626', color: '#991b1b', fontWeight: 'bold', padding: '0.2cm', marginBottom: '0.3cm', fontSize: '10pt' }}>
          RASCUNHO — CONVÊNIO BANCÁRIO AINDA NÃO ATIVO — NÃO USAR PARA COBRANÇA REAL
        </div>
      )}

      {Recibo}

      <div style={{ borderTop: '2px dashed #000', margin: '0.4cm 0' }} />

      <div style={{ border: '2px solid #000', fontSize: '8pt' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
          <div style={{ flex: '0 0 22%', padding: '4px 8px', borderRight: '2px solid #000', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="COC" style={{ height: '0.6cm', objectFit: 'contain' }} />
            <span style={{ fontWeight: 'bold' }}>{convenio.bancoCodigo}-9</span>
          </div>
          <div style={{ flex: 1, padding: '4px 8px', fontWeight: 'bold', fontSize: '11pt', display: 'flex', alignItems: 'center' }}>
            {dados.linhaDigitavel}
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          <FichaCampo label="Local de Pagamento" grow>{convenio.localPagamento}</FichaCampo>
          <FichaCampo label="Vencimento">{vencimentoBr}</FichaCampo>
        </div>
        <div style={{ display: 'flex' }}>
          <FichaCampo label="Cedente" grow>{convenio.cedenteNome} — CNPJ {convenio.cedenteCnpj}</FichaCampo>
        </div>
        <div style={{ display: 'flex' }}>
          <FichaCampo label="Agência/Código Cedente">{convenio.agencia} / {convenio.codigoCedente}</FichaCampo>
          <FichaCampo label="Espécie Doc.">{convenio.especieDocumento}</FichaCampo>
          <FichaCampo label="Aceite">{convenio.aceite}</FichaCampo>
          <FichaCampo label="Nosso Número">{nossoNumero}</FichaCampo>
        </div>
        <div style={{ display: 'flex' }}>
          <FichaCampo label="Nº Doc.">{installment.number}/{installment.totalInstallments}</FichaCampo>
          <FichaCampo label="Carteira">{convenio.carteira}</FichaCampo>
          <FichaCampo label="Espécie Moeda">R$</FichaCampo>
          <FichaCampo label="Quantidade">—</FichaCampo>
          <FichaCampo label="(=) Valor do Documento" grow>R$ {valorPagar}</FichaCampo>
        </div>
        <div style={{ display: 'flex' }}>
          <FichaCampo label="Instruções (texto de responsabilidade do cedente)" grow>
            {convenio.instrucoes.map((linha, i) => <div key={i}>{linha}</div>)}
          </FichaCampo>
        </div>
        <div style={{ display: 'flex' }}>
          <FichaCampo label="Sacado" grow>
            {sacadoNome} {sacadoCpf ? `— CPF ${sacadoCpf}` : ''}<br />
            Referente à parcela {installment.number}/{installment.totalInstallments} — {installment.competencia} — {installment.courseName || ''} {installment.className || ''}
          </FichaCampo>
        </div>

        <div style={{ padding: '0.25cm 0.3cm' }}>
          <CodigoBarrasITF codigo={dados.codigoBarras44} />
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Landmark className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Boleto — {sacadoNome}
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

        {!dados.valido && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">{dados.avisoValidade}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto p-4" style={{ maxWidth: '740px' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="boleto-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
