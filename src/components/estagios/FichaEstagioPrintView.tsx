import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ClipboardList, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { cursoParaDocumento } from '../../lib/supabaseDeclaracoes';
import {
  mediaGeral, formatarNota, nivelDaMedia,
  type ComponenteEstagio, type ConfigFicha,
} from '../../lib/supabaseFichaEstagio';

// ===========================================================================
//  FICHA GERAL DE ESTÁGIO — "Resumo das Avaliações dos Estágios Curriculares"
//
//  É a aba RES das planilhas da escola: o documento que vai assinado pela
//  secretaria, pela coordenação de estágio e pela direção.
//
//  AS CINCO COLUNAS DE NOTA REPETEM O MESMO NÚMERO. Não é engano: é como a
//  escola preenche. A nota lançada no módulo de Estágios aparece igual em
//  conhecimento técnico, habilidade técnica, atitudes pessoais, valores
//  éticos e média final. A única conta feita pelo sistema é a média geral,
//  no pé da ficha.
//
//  Deitada (paisagem), porque a tabela tem muitas colunas — igual à planilha.
// ===========================================================================

interface Props {
  alunoNome: string;
  cursoNome: string;
  componentes: ComponenteEstagio[];
  config: ConfigFicha;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 landscape; margin: 1cm 1.2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .ficha-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important; background: #fff !important;
    }
    .ficha-nao-quebrar { break-inside: avoid; page-break-inside: avoid; }
  }
`;

const celula: React.CSSProperties = {
  border: '0.5pt solid #000',
  padding: '3px 5px',
  fontSize: '8pt',
  verticalAlign: 'middle',
};
const cabecalhoCel: React.CSSProperties = {
  ...celula,
  fontWeight: 'bold',
  textAlign: 'center',
  background: '#e8e8e8',
  fontSize: '7pt',
  lineHeight: 1.15,
};
const notaCel: React.CSSProperties = { ...celula, textAlign: 'center', fontFamily: 'monospace' };

export const FichaEstagioPrintView: React.FC<Props> = ({
  alunoNome, cursoNome, componentes, config, onClose,
}) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-ficha-print', 'true');
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

  const media = mediaGeral(componentes);
  const apto = media !== null && media >= config.mediaParaAprovar;
  const semNota = componentes.filter(c => c.nota === null).length;

  const Documento = (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#000' }}>

      {/* Timbre */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          referrerPolicy="no-referrer"
          style={{ display: 'block', margin: '0 auto', height: '3.4cm', maxWidth: '85%', objectFit: 'contain' }}
        />
        <p style={{ fontSize: '8.5pt', margin: '4px 0 0' }}>
          Rua 20 nº 796 - Centro - Goiânia - GO CEP 74020-170 &nbsp;"{config.resolucao}"
        </p>
        <p style={{ fontSize: '8.5pt', margin: 0 }}>
          Fone (0xx62) 3223-7602 &nbsp;•&nbsp; www.colegiooswaldocruz.com.br
        </p>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '11pt', fontWeight: 'bold', margin: '10px 0 8px' }}>
        RESUMO DAS AVALIAÇÕES DOS ESTÁGIOS CURRICULARES
      </h1>

      {/* Identificação */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <tbody>
          <tr>
            <td style={{ ...celula, width: '9%', fontWeight: 'bold' }}>ALUNO:</td>
            <td style={celula}>{alunoNome.toUpperCase()}</td>
          </tr>
          <tr>
            <td style={{ ...celula, fontWeight: 'bold' }}>CURSO:</td>
            <td style={celula}>{cursoParaDocumento(cursoNome).toUpperCase()}</td>
          </tr>
        </tbody>
      </table>

      {/* Tabela dos componentes */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...cabecalhoCel, width: '22%' }}>COMPONENTES CURRICULARES</th>
            <th rowSpan={2} style={{ ...cabecalhoCel, width: '6%' }}>CARGA HORÁRIA</th>
            <th rowSpan={2} style={{ ...cabecalhoCel, width: '20%' }}>UNIDADE MÉDICA</th>
            <th colSpan={5} style={cabecalhoCel}>ELEMENTOS DA COMPETÊNCIA</th>
            <th colSpan={2} style={cabecalhoCel}>SUPERVISOR DE ESTÁGIO</th>
          </tr>
          <tr>
            <th style={{ ...cabecalhoCel, width: '6%' }}>CONHECIMENTO TÉCNICO PROFISSIONAL</th>
            <th style={{ ...cabecalhoCel, width: '6%' }}>HABILIDADE TÉCNICA</th>
            <th style={{ ...cabecalhoCel, width: '6%' }}>ATITUDES PESSOAIS</th>
            <th style={{ ...cabecalhoCel, width: '6%' }}>VALORES ÉTICOS</th>
            <th style={{ ...cabecalhoCel, width: '6%' }}>MÉDIA FINAL</th>
            <th style={{ ...cabecalhoCel, width: '17%' }}>PROFESSOR</th>
            <th style={{ ...cabecalhoCel, width: '9%' }}>REGISTRO</th>
          </tr>
        </thead>
        <tbody>
          {componentes.map((c, i) => {
            // A MESMA nota nas cinco colunas — ver o comentário no topo.
            const n = formatarNota(c.nota);
            return (
              <tr key={i}>
                <td style={celula}>{c.componente.toUpperCase()}</td>
                <td style={{ ...celula, textAlign: 'center' }}>{c.cargaHoraria || '—'}</td>
                <td style={celula}>{c.local || '—'}</td>
                <td style={notaCel}>{n}</td>
                <td style={notaCel}>{n}</td>
                <td style={notaCel}>{n}</td>
                <td style={notaCel}>{n}</td>
                <td style={{ ...notaCel, fontWeight: 'bold' }}>{n}</td>
                <td style={celula}>{c.supervisor || '—'}</td>
                <td style={{ ...celula, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {c.supervisorRegistro || '—'}
                </td>
              </tr>
            );
          })}

          {/* Média geral — a única conta que o sistema faz */}
          <tr>
            <td colSpan={7} style={{ ...celula, textAlign: 'right', fontWeight: 'bold', background: '#f2f2f2' }}>
              MÉDIA GERAL DAS AVALIAÇÕES DE ESTÁGIO
            </td>
            <td style={{ ...notaCel, fontWeight: 'bold', fontSize: '10pt', background: '#f2f2f2' }}>
              {formatarNota(media)}
            </td>
            <td style={{ ...celula, textAlign: 'right', fontWeight: 'bold', background: '#f2f2f2' }}>
              RESULTADO FINAL
            </td>
            <td style={{ ...celula, textAlign: 'center', fontWeight: 'bold', background: '#f2f2f2' }}>
              {media === null ? '—' : apto ? 'APTO' : 'NÃO APTO'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Legenda dos níveis */}
      <div style={{ fontSize: '8pt', margin: '6px 0 0', lineHeight: 1.4 }}>
        <p style={{ margin: 0 }}>NÍVEL I (0,0 - 3,9) / NÍVEL II (4,0 - 5,9) / NÍVEL III (6,0 - 7,9)</p>
        <p style={{ margin: 0 }}>
          NÍVEL IV (8,0 - 8,9) / NÍVEL V (9,0 - 10,0)
          {media !== null && <strong> &nbsp;—&nbsp; Resultado: {nivelDaMedia(media)}</strong>}
        </p>
      </div>

      {/* Vistos */}
      <div className="ficha-nao-quebrar" style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginTop: '1.6cm' }}>
        {[
          { rotulo: 'VISTO DA SECRETARIA:', nome: config.nomeSecretario, cargo: config.cargoSecretario },
          { rotulo: 'VISTO DA COORDENAÇÃO DE ESTÁGIO:', nome: config.nomeCoordenacao, cargo: config.cargoCoordenacao },
          { rotulo: 'VISTO DA DIREÇÃO:', nome: config.nomeDirecao, cargo: config.cargoDirecao },
        ].map((v, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: '8.5pt', fontWeight: 'bold', textAlign: 'center', margin: '0 0 1.6cm' }}>{v.rotulo}</p>
            <div style={{ borderTop: '0.5pt solid #000', paddingTop: '3px' }}>
              <p style={{ fontSize: '8.5pt', margin: 0, fontWeight: 'bold' }}>{v.nome}</p>
              <p style={{ fontSize: '7.5pt', margin: 0 }}>{v.cargo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Ficha de Estágio — {alunoNome}
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
            Imprima em <strong>paisagem</strong> (deitado), desmarque <strong>Cabeçalhos e rodapés</strong> e
            marque <strong>Gráficos de fundo</strong>.
            {semNota > 0 && (
              <> &nbsp;· <strong>{semNota} componente{semNota > 1 ? 's' : ''} sem nota lançada</strong> — sai com traço,
                e não entra{semNota > 1 ? 'm' : ''} no cálculo da média geral.</>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ minWidth: '1000px', padding: '1.2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="ficha-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '297mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
