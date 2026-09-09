import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Receipt, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ, ASSINATURA_SECRETARIO } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { porExtenso } from '../../lib/supabaseContratos';
import { formatarDinheiro, type ReciboEstagio, type ModeloEstagio, type Supervisor } from '../../lib/supabaseEstagioModulo';

// ===========================================================================
//  RECIBO E DECLARAÇÃO DE ESTÁGIO — impressão
//
//  O texto vem do modelo que a coordenação edita em Pagamentos → Editar
//  Textos. Os campos entre chaves são trocados aqui pelos dados do recibo.
//
//  O RECIBO É ASSINADO PELO SUPERVISOR, e não pela escola: é ele quem declara
//  ter recebido. Por isso a linha de assinatura leva o nome dele e o CPF, e
//  não a assinatura do secretário. A declaração é o contrário — quem declara
//  é a escola, então ali entra a assinatura da secretaria.
// ===========================================================================

interface Props {
  tipo: 'RECIBO' | 'DECLARACAO';
  modelo: ModeloEstagio;
  recibo: ReciboEstagio;
  supervisor?: Supervisor;
  periodo?: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 portrait; margin: 1.5cm 2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .rec-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important;
    }
  }
`;

export const ReciboEstagioPrintView: React.FC<Props> = ({
  tipo, modelo, recibo, supervisor, periodo, onClose,
}) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-rec-print', 'true');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 150);
    const destravar = window.setTimeout(() => setImprimindo(false), 15000);
    return () => {
      window.clearTimeout(t); window.clearTimeout(destravar);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  /** Troca os campos entre chaves pelos dados reais. */
  const preencher = (texto: string): string => {
    const mapa: Record<string, string> = {
      SUPERVISOR: recibo.supervisorNome || '____________________',
      CONSELHO: supervisor?.conselho || '________',
      REGISTRO: supervisor?.registro || '____________',
      COMPONENTE: recibo.componente || '____________________',
      LOCAL: recibo.localNome || '____________________',
      PERIODO: periodo || '____________________',
      QTD_ALUNOS: String(recibo.qtdAlunos),
      VALOR_ALUNO: formatarDinheiro(recibo.valorPorAluno),
      VALOR_TOTAL: formatarDinheiro(recibo.valorTotal),
      VALOR_EXTENSO: porExtenso(recibo.valorTotal),
    };
    return texto.replace(/\{\{(\w+)\}\}/g, (_, c) => mapa[c] ?? `{{${c}}}`);
  };

  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Célula igual à da Relação de Alunos, para o recibo ficar no mesmo molde.
  const cel: React.CSSProperties = { border: '0.4mm solid #000', padding: '2px 6px', fontSize: '9.5pt' };

  /* RECIBO — MESMO MOLDE DA RELAÇÃO DE ALUNOS, COM VALOR NO LUGAR DE
     ASSINATURA. Uma tabela com um aluno por linha e o valor dele, fechando
     com o total em negrito. A Declaração continua com o texto corrido do
     modelo — não faz sentido numa declaração de horas, só no recibo. */
  const DocumentoRecibo = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
      <div style={{ textAlign: 'center', marginBottom: '6mm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
             referrerPolicy="no-referrer"
             style={{ height: '1.8cm', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        <p style={{ fontSize: '8pt', margin: '3px 0 0' }}>Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170</p>
        <p style={{ fontSize: '8pt', margin: 0 }}>Fone: (62) 3223.7602 - www.colegiooswaldocruz.com.br</p>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 'bold', margin: '0 0 5mm' }}>
        RECIBO DE PAGAMENTO — ESTÁGIO CURRICULAR
      </h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm' }}>
        <tbody>
          <tr>
            <td style={{ ...cel, width: '20%', fontWeight: 'bold' }}>COMPONENTE:</td>
            <td style={cel}>{(recibo.componente || '—').toUpperCase()}</td>
            <td style={{ ...cel, width: '16%', fontWeight: 'bold' }}>Nº RECIBO:</td>
            <td style={{ ...cel, width: '18%', fontFamily: 'monospace' }}>{recibo.numero || '—'}</td>
          </tr>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold' }}>SUPERVISOR:</td>
            <td style={cel} colSpan={3}>
              {recibo.supervisorNome || '—'}
              {supervisor?.conselho && supervisor?.registro ? `   ${supervisor.conselho} ${supervisor.registro}` : ''}
              {supervisor?.cpf ? `   CPF ${supervisor.cpf}` : ''}
            </td>
          </tr>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold' }}>LOCAL:</td>
            <td style={cel}>{recibo.localNome || '—'}</td>
            <td style={{ ...cel, fontWeight: 'bold' }}>PERÍODO:</td>
            <td style={cel}>{periodo || '—'}</td>
          </tr>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold' }}>COMPETÊNCIA:</td>
            <td style={cel}>{recibo.competencia || '—'}</td>
            <td style={{ ...cel, fontWeight: 'bold' }}>ALUNOS:</td>
            <td style={cel}>{recibo.qtdAlunos}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...cel, background: '#d9d9d9', width: '7%', textAlign: 'center' }}>Nº</th>
            <th style={{ ...cel, background: '#d9d9d9', textAlign: 'left' }}>NOME DO ALUNO</th>
            <th style={{ ...cel, background: '#d9d9d9', width: '16%', textAlign: 'center' }}>MATRÍCULA</th>
            <th style={{ ...cel, background: '#d9d9d9', width: '22%', textAlign: 'center' }}>VALOR</th>
          </tr>
        </thead>
        <tbody>
          {/* Recibo emitido depois desta lista existir traz nome e matrícula
              juntos (alunosDetalhe). Recibo antigo, de antes, só tinha os
              nomes — continua aparecendo, sem matrícula, em vez de quebrar. */}
          {(recibo.alunosDetalhe && recibo.alunosDetalhe.length > 0
            ? recibo.alunosDetalhe
            : (recibo.alunosNomes || []).map(nome => ({ nome, matricula: undefined as string | undefined }))
          ).map((a, i) => (
            <tr key={i}>
              <td style={{ ...cel, textAlign: 'center' }}>{String(i + 1).padStart(2, '0')}</td>
              <td style={cel}>{a.nome.toUpperCase()}</td>
              <td style={{ ...cel, textAlign: 'center' }}>{a.matricula || '—'}</td>
              <td style={{ ...cel, textAlign: 'right' }}>{formatarDinheiro(recibo.valorPorAluno)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...cel, fontWeight: 'bold', textAlign: 'right' }} colSpan={3}>TOTAL</td>
            <td style={{ ...cel, fontWeight: 'bold', textAlign: 'right', fontSize: '11pt' }}>
              {formatarDinheiro(recibo.valorTotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p style={{ fontSize: '10.5pt', margin: '4mm 0 0' }}>
        Valor por extenso: <strong>{porExtenso(recibo.valorTotal)}</strong>
      </p>

      <p style={{ fontSize: '11pt', lineHeight: 1.7, textAlign: 'justify', margin: '6mm 0 0', textIndent: '2.5em' }}>
        Recebi do Colégio Oswaldo Cruz a quantia total acima discriminada, referente à supervisão
        de estágio curricular dos alunos relacionados nesta folha, no período de {periodo || '____________________'}.
        Para clareza firmo o presente recibo, dando plena e geral quitação do valor acima.
      </p>

      <div style={{ textAlign: 'right', fontSize: '11pt', margin: '8mm 0 0' }}>
        Goiânia, {hoje}
      </div>

      <div style={{ marginTop: '14mm', textAlign: 'center' }}>
        <div style={{ borderTop: '0.4mm solid #000', width: '70%', margin: '0 auto', paddingTop: '2mm' }}>
          <p style={{ fontSize: '11pt', margin: 0, fontWeight: 'bold' }}>{recibo.supervisorNome}</p>
          <p style={{ fontSize: '9.5pt', margin: 0 }}>
            {supervisor?.cpf ? `CPF ${supervisor.cpf}` : 'Supervisor de Estágio'}
          </p>
        </div>
      </div>
    </div>
  );

  const DocumentoDeclaracao = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', minHeight: '23cm', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.4cm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
             referrerPolicy="no-referrer"
             style={{ height: '2.2cm', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 'bold', margin: '0 0 4mm' }}>
        {modelo.titulo}
      </h1>

      <div style={{ flex: 1, fontSize: '12pt', lineHeight: 1.8, textAlign: 'justify' }}>
        {modelo.paragrafos.map((p, i) => (
          <p key={i} style={{ margin: '0 0 5mm', textIndent: '2.5em' }}>{preencher(p)}</p>
        ))}
      </div>

      <div style={{ textAlign: 'right', fontSize: '12pt', margin: '1cm 0 0' }}>
        Goiânia, {hoje}
      </div>

      <div style={{ marginTop: '2.2cm', textAlign: 'center' }}>
        <img src={ASSINATURA_SECRETARIO} alt="Assinatura"
             referrerPolicy="no-referrer"
             style={{ display: 'block', margin: '0 auto -3mm', width: '5cm', height: 'auto' }} />
        <div style={{ borderTop: '0.4mm solid #000', width: '70%', margin: '0 auto', paddingTop: '2mm' }}>
          <p style={{ fontSize: '11.5pt', margin: 0, fontWeight: 'bold' }}>Colégio Oswaldo Cruz</p>
          <p style={{ fontSize: '10pt', margin: 0 }}>Secretaria</p>
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '1.2cm', textAlign: 'center', fontSize: '8.5pt', color: '#444' }}>
        <p style={{ margin: 0 }}>Rua 20, 796 – Centro Goiânia Goiás · CEP 74020-170</p>
        <p style={{ margin: 0 }}>Fone e Whatsapp (62) 3223-7602 · www.colegiooswaldocruz.com.br</p>
      </div>
    </div>
  );

  const Documento = tipo === 'RECIBO' ? DocumentoRecibo : DocumentoDeclaracao;

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Receipt className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              {tipo === 'RECIBO' ? 'Recibo' : 'Declaração'} — {recibo.supervisorNome}
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

        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            Desmarque <strong>Cabeçalhos e rodapés</strong> e marque <strong>Gráficos de fundo</strong>.
            {tipo === 'RECIBO' && ' Imprima duas vias: uma fica com a escola e outra com o supervisor.'}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '1.5cm 2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="rec-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
