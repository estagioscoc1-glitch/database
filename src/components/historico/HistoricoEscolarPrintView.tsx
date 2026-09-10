import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ScrollText, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ, LOGO_COLEGIO_OSWALDO_CRUZ_SIMPLES } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
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
    /* Medida exata em milímetros, não a palavra "A4" — a diferença de
       arredondamento entre as duas é o que fazia o Chrome encolher a folha
       sozinho, obrigando a digitar 100% na mão toda vez. */
    @page { size: 210mm 297mm; margin: 1cm 1.2cm; }
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

/* ACABAMENTO IGUAL AO MODELO DIGITADO PELA SECRETARIA.
   Três diferenças foram acertadas aqui:

   SEM COR. A tela vinha da planilha de origem, que tinha laranja nos campos
   do aluno e verde nas colunas de aproveitamento. O documento oficial é preto
   sobre branco — em impressora comum aquelas tarjas saíam como manchas
   cinzentas por trás do texto.

   FONTE MAIOR. Estava em 7,5pt no corpo e 6,5pt no cabeçalho, tamanho de
   rodapé. O modelo digitado usa um corpo legível a olho nu.

   NEGRITO ONDE O MODELO TEM. Conceito, faltas e carga horária saem em
   negrito; o nome do componente, não. É o contraste que faz a coluna de
   conceitos ser lida de relance. */
const cel: React.CSSProperties = {
  border: '0.5pt solid #000',
  padding: '1.5px 4px',
  fontSize: '9pt',
  verticalAlign: 'middle',
};
const celCab: React.CSSProperties = {
  ...cel, fontWeight: 'bold', textAlign: 'center',
  fontSize: '9pt', lineHeight: 1.1,
};
const celC: React.CSSProperties = { ...cel, textAlign: 'center' };
/** Conceito, faltas e C.H. — os números que a secretaria confere primeiro. */
const celNum: React.CSSProperties = { ...celC, fontWeight: 'bold' };
const celIdent: React.CSSProperties = { ...cel, fontSize: '9.5pt' };
/** Valor preenchido na faixa de identificação: nome, nascimento, filiação. */
const celIdentValor: React.CSSProperties = { ...celIdent, fontWeight: 'bold' };
const celDep: React.CSSProperties = { ...celC };

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
  const totalLinhas = linhasPorModulo.reduce((t, m) => t + m.linhas.length, 0);

  /* FREQUÊNCIA OBTIDA — CALCULADA, NÃO DIGITADA.
     No modelo da secretaria ela é a carga horária total menos a soma das
     faltas de todas as disciplinas. No exemplo: 1800 de carga, 33 faltas
     somadas, 1767 de frequência, 98%.

     Antes esse número vinha de um campo digitado à mão, que ficava em branco
     quando ninguém lembrava de preencher — e o documento saía sem a
     frequência, que é justamente o que o conselho confere.

     O digitado continua valendo quando existe: às vezes a secretaria precisa
     ajustar por abono ou por transferência, e nenhum cálculo prevê isso. */
  const somaFaltas = linhasPorModulo.reduce(
    (t, m) => t + m.linhas.reduce((s, l) => s + (parseInt(l.faltas, 10) || 0), 0), 0);
  const frequenciaCalculada = modelo.cargaTotal
    ? Math.max(0, modelo.cargaTotal - somaFaltas)
    : undefined;
  const frequenciaFinal = dados.frequenciaObtida ?? frequenciaCalculada;
  const cargaDisc = cargaDasDisciplinas(modelo);
  const dataBr = (iso?: string) =>
    iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>

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

      {/* IDENTIFICAÇÃO — RÓTULO E VALOR NA MESMA CÉLULA.
          Antes cada rótulo tinha a sua coluna e o valor a dele, e o quadro
          ficava picotado por linhas verticais que o modelo da secretaria não
          tem. Pior: com a coluna estreita, "Estágio Supervisionado Concluído
          em:" quebrava em três linhas.

          Agora é uma célula por informação, com o rótulo em negrito e o valor
          logo em seguida — do jeito que sai no Word. */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <tbody>
          <tr>
            <td style={celIdent} colSpan={2}>
              <strong>Nome do Aluno:</strong> <strong>{dados.alunoNome.toUpperCase()}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ ...celIdent, width: '46%' }}>
              <strong>Data Nascimento:</strong> <strong>{dataBr(dados.dataNascimento) || '\u00a0'}</strong>
            </td>
            <td style={celIdent}>
              <strong>Naturalidade:</strong> <strong>{dados.naturalidade || '\u00a0'}</strong>
            </td>
          </tr>
          {modelo.filiacaoSeparada ? (
            <tr>
              <td style={{ ...celIdent, width: '46%' }}>
                <strong>Pai:</strong> <strong>{dados.nomePai || '\u00a0'}</strong>
              </td>
              <td style={celIdent}>
                <strong>Mãe:</strong> <strong>{dados.nomeMae || '\u00a0'}</strong>
              </td>
            </tr>
          ) : (
            <tr>
              <td style={celIdent} colSpan={2}>
                <strong>Filiação:</strong>{' '}
                <strong>{[dados.nomePai, dados.nomeMae].filter(Boolean).join(' e ') || '\u00a0'}</strong>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Tabela das disciplinas */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...celCab, width: '7%' }}>Mod.</th>
            <th style={{ ...celCab, width: '35%' }}>COMPONENTES CURRICULARES</th>
            <th style={{ ...celCab, width: '9%' }}>CONCEITO</th>
            <th style={{ ...celCab, width: '8%' }}>FALTAS</th>
            <th style={{ ...celCab, width: '8%' }}>C.H.</th>
            <th style={{ ...celCab, width: '4%' }} />
            <th style={{ ...celCab, width: '10%' }}>M.F.C.</th>
            <th style={{ ...celCab, width: '10%' }}>Ano/S.</th>
          </tr>
        </thead>
        <tbody>
          {linhasPorModulo.map((mod, mi) =>
            mod.linhas.map((l, li) => (
              <tr key={`${mi}-${li}`}>
                {li === 0 && (
                  <td rowSpan={mod.linhas.length}
                      style={{ ...celC, fontWeight: 'bold', padding: '2px 0' }}>
                    {/* Girado, como na planilha. O nome do módulo e o
                        ano/semestre são DUAS LINHAS separadas, não uma frase
                        só: com writing-mode vertical, dois blocos empilham
                        lado a lado e viram duas linhas paralelas depois da
                        rotação — exatamente como na planilha, onde "MÓDULO I"
                        e "2025/2" aparecem um ao lado do outro. */}
                    <div style={{ ...girado, fontSize: '7pt', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>{mod.nome}</div>
                      {mod.anoSemestre && <div>{mod.anoSemestre}</div>}
                    </div>
                  </td>
                )}
                <td style={cel}>{l.nome}</td>
                <td style={celNum}>{l.conceito}</td>
                <td style={celNum}>{l.faltas}</td>
                <td style={celNum}>{l.ch || '----'}</td>
                {/* Coluna estreita com o texto girado. Só a PRIMEIRA linha da
                    tabela inteira abre a célula, que se estende por todas as
                    demais — é assim que o texto atravessa o corpo, como no
                    modelo impresso da escola. */}
                {mi === 0 && li === 0 && (
                  <td rowSpan={totalLinhas} style={{ ...celC, padding: '2px 0' }}>
                    <div style={{ ...girado, fontSize: '7.5pt', fontWeight: 'bold' }}>
                      APROVEITAMENTO DE ESTUDOS E/OU DEPENDÊNCIA&nbsp;&nbsp;M.F.C
                    </div>
                  </td>
                )}
                <td style={celDep}>{l.apMfc}</td>
                <td style={celDep}>{l.apAnoSemestre}</td>
              </tr>
            ))
          )}

          {/* ESTÁGIO SUPERVISIONADO.
              O rótulo e a data ficam na mesma célula, correndo pela largura
              das duas primeiras colunas. Separados, a coluna estreita da
              esquerda quebrava "Estágio Supervisionado Concluído em:" em três
              linhas empilhadas. */}
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>
              Estágio Supervisionado {parcial ? 'à cursar' : 'Concluído em:'}
              {!parcial && ` ${dataBr(dados.estagioConcluidoEm) || ''}`}
            </td>
            <td style={{ ...celC, fontWeight: 'bold' }}>{parcial ? '----' : 'APTO (A)'}</td>
            <td style={celC}>----</td>
            <td style={celC}>{modelo.cargaEstagio}</td>
            <td colSpan={3} style={celC}>--------------------</td>
          </tr>

          {/* TOTAIS — três informações, três células, cada uma numa linha só.
              Antes eram seis células: rótulo e número separados, e cada par
              espremido numa coluna estreita, o que fazia "FREQUENCIA OBTIDA"
              e "% DE FREQUENCIA" quebrarem no meio. */}
          <tr>
            {/* As colunas acompanham a linha do estágio: a frequência começa
                onde começa o APTO (A), e a porcentagem onde começa o M.F.C.
                Com 3/3/2 a carga horária invadia a coluna do conceito e
                empurrava tudo uma coluna para a direita. */}
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>
              CARGA HORÁRIA TOTAL: {modelo.cargaTotal}
            </td>
            <td colSpan={3} style={{ ...cel, fontWeight: 'bold' }}>
              FREQUENCIA OBTIDA: {frequenciaFinal ?? '----'}
            </td>
            <td colSpan={3} style={{ ...cel, fontWeight: 'bold' }}>
              % DE FREQUENCIA: {percentualFrequencia(frequenciaFinal, modelo.cargaTotal)}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>RESULTADO FINAL:</td>
            <td colSpan={6} style={{ ...cel, fontWeight: 'bold', textAlign: 'right' }}>
              {dados.resultadoFinal}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...cel, fontWeight: 'bold' }}>OBSERVAÇÕES:</td>
            <td colSpan={6} style={cel}>{modelo.observacoes || '\u00a0'}</td>
          </tr>
        </tbody>
      </table>

      {/* LEGENDAS DENTRO DO QUADRO.
          No modelo digitado elas são linhas da própria tabela, com moldura,
          e os quatro conceitos ficam em colunas separadas. Solto embaixo, em
          7pt, parecia rodapé de página — e não é: faz parte do documento. */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...cel, width: '14%', fontWeight: 'bold' }}>LEGENDA</td>
            <td style={cel}>CH - Carga Horária</td>
            <td style={cel}>Dep - Dependência</td>
            <td style={cel}>Ret – Retido (a)</td>
          </tr>
          <tr>
            <td style={cel} />
            <td style={cel}>Ano/S - Ano e Semestre</td>
            <td style={cel} colSpan={2}>Ap. Est. - Aproveitamento de Estudos.</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...cel, width: '14%', fontWeight: 'bold', textAlign: 'center' }}>CONCEITOS</td>
            {/* A legenda vem numa linha só, com as faixas separadas por
                espaços largos. Aqui ela é repartida nas quatro colunas do
                modelo. */}
            {LEGENDA_CONCEITOS.split(/\s{2,}/).filter(Boolean).map((faixa, i) => (
              <td key={i} style={{ ...celC, fontWeight: 'bold' }}>{faixa.trim()}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* OBSERVAÇÃO DA SECRETARIA — pé da primeira folha.
          Só aparece quando alguém escreve alguma coisa. É onde entra
          "SEGUNDA VIA" e afins. Em branco, nem a moldura é desenhada: quem
          não usa não vê diferença no documento. */}
      {dados.observacaoRodape?.trim() && (
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
          <tbody>
            <tr>
              <td style={{ ...celC, fontWeight: 'bold', letterSpacing: '0.04em', padding: '3px 4px' }}>
                {dados.observacaoRodape.trim().toUpperCase()}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* VERSO — DEPENDE DO TIPO.
          No histórico COMPLETO, o verso traz as competências adquiridas.
          No PARCIAL, que é o da transferência, não: ele leva a folha de
          entrega, com a data e a assinatura de quem recebeu. São documentos
          com finalidades diferentes — um atesta o que o aluno concluiu, o
          outro comprova que o documento foi entregue em mãos. */}
      {parcial ? (
        <div className="hist-quebra" style={{
          position: 'relative', height: '25.5cm',
          border: '0.4mm solid #000', boxSizing: 'border-box',
          padding: '1.5cm', marginTop: '12px',
        }}>
          {/* Timbre em cinza claro, como no modelo */}
          <div style={{ textAlign: 'center' }}>
            <img
              src={LOGO_COLEGIO_OSWALDO_CRUZ_SIMPLES}
              alt="Colégio Oswaldo Cruz"
              referrerPolicy="no-referrer"
              style={{
                height: '2cm', width: 'auto', objectFit: 'contain',
                filter: 'grayscale(100%)', opacity: 0.55,
              }}
            />
          </div>

          {/* Data de entrega, em branco para preencher à mão */}
          <div style={{
            marginTop: '9cm', textAlign: 'center',
            fontSize: '15pt', fontWeight: 'bold', letterSpacing: '0.03em',
          }}>
            ENTREGUE EM: &nbsp;____/____/________
          </div>

          {/* Linha de assinatura de quem recebeu */}
          <div style={{ marginTop: '3.2cm', textAlign: 'center' }}>
            <div style={{
              borderTop: '0.3mm solid #000', width: '78%', margin: '0 auto',
              paddingTop: '2mm', fontSize: '10.5pt',
            }}>
              ASSINATURA
            </div>
          </div>
        </div>
      ) : (
      <div className="hist-quebra" style={{ marginTop: '12px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '10pt', fontWeight: 'bold', margin: '0 0 10px' }}>
          COMPETÊNCIAS ADQUIRIDAS
        </h2>

        <p style={{ fontSize: '8.5pt', fontWeight: 'bold', margin: '0 0 4px' }}>GERAIS:</p>
        <ul style={{ margin: '0 0 12px', paddingLeft: '18px', fontSize: '8.8pt', lineHeight: 1.5 }}>
          {modelo.competenciasGerais.map((c, i) => (
            <li key={i} style={{ marginBottom: '2px', textAlign: 'justify' }}>{c}</li>
          ))}
        </ul>

        <p style={{ fontSize: '8.5pt', fontWeight: 'bold', margin: '0 0 4px' }}>ESPECÍFICAS:</p>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '8.8pt', lineHeight: 1.5 }}>
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
      )}
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
            Sai em duas folhas: notas na primeira, e na segunda
            {parcial ? ' a folha de entrega, para assinatura de quem receber' : ' as competências adquiridas'}.
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
