import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ScrollText, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { LEGENDA_CONCEITOS } from '../../lib/historicoTextos';
import type { ModeloHistorico } from '../../lib/historicoTextos';
import { cargaDasDisciplinas, percentualFrequencia } from '../../lib/supabaseHistorico';
import type { DadosHistorico, LinhaHistorico } from '../../lib/supabaseHistorico';

// ===========================================================================
//  HISTÓRICO ESCOLAR — completo ou parcial
//
//  O PARCIAL é o que a escola chama de "Modelo de Transferência": mesmo
//  documento, mas as disciplinas ainda não cursadas saem como "À Cursar" e o
//  estágio como "à cursar" em vez de APTO. Por isso é um componente só, com
//  a chave dados.tipo decidindo.
//
//  A coluna CONCEITO imprime LETRA (A, B, C, D), conforme a legenda oficial
//  no rodapé. A conversão da nota do portal está em conceitoDaNota, no
//  historicoTextos.ts.
//
//  IMPRESSÃO: mesmo padrão já testado no contrato, na grade e nas
//  declarações — portal preso ao document.body e @media print escondendo o
//  #root e a janela. Sem isso a pré-visualização sai impressa por cima.
// ===========================================================================

interface Props {
  modelo: ModeloHistorico;
  dados: DadosHistorico;
  linhasPorModulo: { nome: string; anoSemestre?: string; linhas: LinhaHistorico[] }[];
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 portrait; margin: 1cm 1.2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .hist-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important; background: #fff !important;
    }
    .hist-quebra { break-before: page; page-break-before: always; }
    .hist-nao-quebrar { break-inside: avoid; page-break-inside: avoid; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
`;

const cel: React.CSSProperties = {
  border: '0.5pt solid #000',
  padding: '1.5px 4px',
  fontSize: '7.5pt',
  verticalAlign: 'middle',
};
const celCab: React.CSSProperties = {
  ...cel, fontWeight: 'bold', textAlign: 'center',
  background: '#e8e8e8', fontSize: '6.5pt', lineHeight: 1.1,
};
const celC: React.CSSProperties = { ...cel, textAlign: 'center' };

// Cores da planilha original: laranja nos campos de identificação do aluno,
// verde nas colunas de aproveitamento/dependência.
const LARANJA = '#f0a250';
const VERDE = '#c8e6c9';
const celIdent: React.CSSProperties = { ...cel, background: LARANJA, fontSize: '8pt' };
const celDep: React.CSSProperties = { ...celC, background: VERDE };

/** Texto girado 90°, como a coluna "Mod." e o rótulo "DEPENDÊNCIA". */
const girado: React.CSSProperties = {
  writingMode: 'vertical-rl',
  transform: 'rotate(180deg)',
  whiteSpace: 'nowrap',
  margin: '0 auto',
};

export const HistoricoEscolarPrintView: React.FC<Props> = ({
  modelo, dados, linhasPorModulo, onClose,
}) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-hist-print', 'true');
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

  const parcial = dados.tipo === 'PARCIAL';
  const cargaDisc = cargaDasDisciplinas(modelo);
  const dataBr = (iso?: string) =>
    iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  const Documento = (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#000' }}>

      {/* Timbre */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
             referrerPolicy="no-referrer"
             style={{ display: 'block', margin: '0 auto', height: '2.2cm', maxWidth: '80%', objectFit: 'contain' }} />
        <p style={{ fontSize: '8pt', margin: '3px 0 0' }}>
          Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170 &nbsp;"{dados.resolucaoImpressa || modelo.resolucao}"
        </p>
        <p style={{ fontSize: '8pt', margin: 0 }}>
          Fone: (62) 3223.7602 - www.colegiooswaldocruz.com.br
        </p>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '12.5pt', fontWeight: 'bold', margin: '9px 0 8px', letterSpacing: '0.06em' }}>
        {parcial ? modelo.titulo.replace('HISTÓRICO ESCOLAR', 'HISTÓRICO ESCOLAR PARCIAL') : modelo.titulo}
      </h1>

      {/* Identificação */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <tbody>
          <tr>
            <td style={{ ...celIdent, width: '16%', fontWeight: 'bold' }}>Nome do Aluno:</td>
            <td style={celIdent} colSpan={3}>{dados.alunoNome.toUpperCase()}</td>
          </tr>
          <tr>
            <td style={{ ...celIdent, fontWeight: 'bold' }}>Data Nascimento:</td>
            <td style={{ ...celIdent, width: '30%' }}>{dataBr(dados.dataNascimento) || '\u00a0'}</td>
            <td style={{ ...celIdent, width: '14%', fontWeight: 'bold' }}>Naturalidade:</td>
            <td style={celIdent}>{dados.naturalidade || '\u00a0'}</td>
          </tr>
          {modelo.filiacaoSeparada ? (
            <tr>
              <td style={{ ...celIdent, fontWeight: 'bold' }}>Pai:</td>
              <td style={celIdent}>{dados.nomePai || '\u00a0'}</td>
              <td style={{ ...celIdent, fontWeight: 'bold' }}>Mãe:</td>
              <td style={celIdent}>{dados.nomeMae || '\u00a0'}</td>
            </tr>
          ) : (
            <tr>
              <td style={{ ...celIdent, fontWeight: 'bold' }}>Filiação:</td>
              <td style={celIdent} colSpan={3}>
                {[dados.nomePai, dados.nomeMae].filter(Boolean).join(' e ') || '\u00a0'}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Tabela das disciplinas */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...celCab, width: '7%' }}>Mod.</th>
            <th rowSpan={2} style={{ ...celCab, width: '33%' }}>COMPONENTES CURRICULARES</th>
            <th rowSpan={2} style={{ ...celCab, width: '8%' }}>CONCEITO</th>
            <th rowSpan={2} style={{ ...celCab, width: '7%' }}>FALTAS</th>
            <th rowSpan={2} style={{ ...celCab, width: '7%' }}>C.H.</th>
            <th rowSpan={2} style={{ ...celCab, width: '3%', padding: '2px 0' }}>
              <div style={{ ...girado, fontSize: '6pt' }}>DEPENDÊNCIA</div>
            </th>
            <th colSpan={4} style={celCab}>APROVEITAMENTO DE ESTUDOS</th>
          </tr>
          <tr>
            <th style={{ ...celCab, width: '8%' }}>M.F.C.</th>
            <th style={{ ...celCab, width: '8%' }}>Ano/S.</th>
            <th style={{ ...celCab, width: '8%' }}>NOTAS</th>
            <th style={{ ...celCab, width: '8%' }}>FALTAS</th>
          </tr>
        </thead>
        <tbody>
          {linhasPorModulo.map((mod, mi) =>
            mod.linhas.map((l, li) => (
              <tr key={`${mi}-${li}`}>
                {li === 0 && (
                  <td rowSpan={mod.linhas.length}
                      style={{ ...celC, fontWeight: 'bold', padding: '2px 0' }}>
                    {/* Girado, como na planilha: o nome do módulo e, abaixo,
                        o ano/semestre em que a turma cursou. */}
                    <div style={{ ...girado, fontSize: '7pt' }}>
                      {mod.nome}{mod.anoSemestre ? `  ${mod.anoSemestre}` : ''}
                    </div>
                  </td>
                )}
                <td style={cel}>{l.nome}</td>
                <td style={celC}>{l.conceito}</td>
                <td style={celC}>{l.faltas}</td>
                <td style={celC}>{l.ch || '----'}</td>
                {li === 0 && <td rowSpan={mod.linhas.length} style={{ ...celC, background: VERDE }} />}
                <td style={celDep}>{l.apMfc}</td>
                <td style={celDep}>{l.apAnoSemestre}</td>
                <td style={celDep}>{l.apNotas}</td>
                <td style={celDep}>{l.apFaltas}</td>
              </tr>
            ))
          )}

          {/* Estágio supervisionado */}
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>
              Estágio Supervisionado {parcial ? 'à cursar' : 'Concluído em:'}
              {!parcial && dados.estagioConcluidoEm && ` ${dataBr(dados.estagioConcluidoEm)}`}
            </td>
            <td style={{ ...celC, fontWeight: 'bold' }}>{parcial ? '----' : 'APTO (A)'}</td>
            <td style={celC}>----</td>
            <td style={celC}>{modelo.cargaEstagio}</td>
            <td colSpan={5} style={celC}>--------------------</td>
          </tr>

          {/* Totais */}
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>CARGA HORÁRIA TOTAL:</td>
            <td colSpan={2} style={{ ...celC, fontWeight: 'bold' }}>{modelo.cargaTotal}</td>
            <td colSpan={3} style={{ ...cel, fontWeight: 'bold', fontSize: '6.5pt' }}>FREQUÊNCIA OBTIDA:</td>
            <td style={celC}>{dados.frequenciaObtida ?? '----'}</td>
            <td style={{ ...cel, fontWeight: 'bold', fontSize: '6.5pt' }}>% FREQ.:</td>
            <td style={celC}>{percentualFrequencia(dados.frequenciaObtida, modelo.cargaTotal)}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>RESULTADO FINAL:</td>
            <td colSpan={8} style={{ ...cel, fontWeight: 'bold' }}>{dados.resultadoFinal}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>OBSERVAÇÕES:</td>
            <td colSpan={8} style={cel}>{modelo.observacoes || '\u00a0'}</td>
          </tr>
        </tbody>
      </table>

      {/* Legendas */}
      <div style={{ fontSize: '7pt', marginTop: '5px', lineHeight: 1.35 }}>
        <p style={{ margin: 0 }}>
          <strong>LEGENDA</strong> &nbsp; CH - Carga Horária &nbsp;·&nbsp; Dep - Dependência
          &nbsp;·&nbsp; Ret - Retido(a) &nbsp;·&nbsp; Ano/S - Ano e Semestre
          &nbsp;·&nbsp; Ap. Est. - Aproveitamento de Estudos
          &nbsp;·&nbsp; M.F.C. - Média Final do Componente Curricular
        </p>
        <p style={{ margin: 0 }}><strong>CONCEITOS</strong> &nbsp; {LEGENDA_CONCEITOS}</p>
      </div>

      {/* Competências — página nova, porque a lista é longa */}
      <div className="hist-quebra" style={{ marginTop: '12px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', margin: '0 0 10px' }}>
          COMPETÊNCIAS ADQUIRIDAS
        </h2>

        <p style={{ fontSize: '8.5pt', fontWeight: 'bold', margin: '0 0 4px' }}>GERAIS:</p>
        <ul style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '8pt', lineHeight: 1.4 }}>
          {modelo.competenciasGerais.map((c, i) => (
            <li key={i} style={{ marginBottom: '2px', textAlign: 'justify' }}>{c}</li>
          ))}
        </ul>

        <p style={{ fontSize: '8.5pt', fontWeight: 'bold', margin: '0 0 4px' }}>ESPECÍFICAS:</p>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '8pt', lineHeight: 1.4 }}>
          {modelo.competenciasEspecificas.map((c, i) => (
            <li key={i} style={{ marginBottom: '2px', textAlign: 'justify' }}>{c}</li>
          ))}
        </ul>

        {/* Assinaturas */}
        <div className="hist-nao-quebrar" style={{ marginTop: '1.4cm' }}>
          <p style={{ fontSize: '9pt', margin: '0 0 1.4cm' }}>
            Goiânia, GO — {dataBr(dados.dataEmissao)}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '40px' }}>
            {[
              { nome: dados.nomeSecretario, cargo: dados.cargoSecretario },
              { nome: dados.nomeDirecao, cargo: dados.cargoDirecao },
            ].map((a, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ borderTop: '0.5pt solid #000', paddingTop: '3px' }}>
                  <p style={{ fontSize: '9pt', margin: 0, fontWeight: 'bold' }}>{a.nome}</p>
                  <p style={{ fontSize: '8pt', margin: 0 }}>{a.cargo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <ScrollText className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              {parcial ? 'Histórico Parcial' : 'Histórico Escolar'} — {dados.alunoNome}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase flex-shrink-0">
              {modelo.nomeInterno || modelo.cursoNome}
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
            Sai em duas folhas: notas na primeira, competências na segunda.
            Desmarque <strong>Cabeçalhos e rodapés</strong> e marque <strong>Gráficos de fundo</strong>.
            {cargaDisc !== modelo.cargaTotal - modelo.cargaEstagio && (
              <> &nbsp;· A soma das disciplinas ({cargaDisc}h) mais o estágio ({modelo.cargaEstagio}h)
                dá {cargaDisc + modelo.cargaEstagio}h, e a carga total do curso é {modelo.cargaTotal}h.
                A diferença são as atividades extra-curriculares.</>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '860px', padding: '1.2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="hist-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
