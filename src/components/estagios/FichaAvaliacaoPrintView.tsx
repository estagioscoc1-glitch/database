import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { mediaDoAluno, type AlunoNaVaga, type VagaEstagio, type EstagioCatalogo } from '../../lib/supabaseEstagioModulo';

// ===========================================================================
//  FICHA DE AVALIAÇÃO DE ESTÁGIO CURRICULAR — duas folhas
//
//  Folha 1: a ficha do modelo da escola. Cabeçalho com o timbre à esquerda e
//  o título em caixa à direita, identificação do aluno, os quatro elementos
//  de competência com seus itens e a nota de cada bloco, o resultado com a
//  média e as três assinaturas.
//
//  Folha 2: o controle de frequência — data, assinatura do aluno e visto do
//  supervisor, com as assinaturas do professor e da coordenação no pé.
//
//  As notas vêm do que o supervisor lançou pelo sistema. A média é calculada,
//  nunca digitada, para a ficha e o resumo não divergirem.
// ===========================================================================

interface Props {
  vaga: VagaEstagio;
  aluno: AlunoNaVaga;
  catalogo?: EstagioCatalogo;
  supervisorRegistro?: string;
  /** CPF do aluno. Vem do cadastro dele, não da vaga — por isso é opcional. */
  alunoCpf?: string;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 landscape; margin: 0.8cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .fav-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important;
    }
    .fav-folha { break-after: page; page-break-after: always; }
    .fav-folha:last-child { break-after: auto; page-break-after: auto; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
`;

const cel: React.CSSProperties = {
  border: '0.4mm solid #000', padding: '2px 5px', fontSize: '12pt', verticalAlign: 'top',
};

export const FichaAvaliacaoPrintView: React.FC<Props> = ({
  vaga, aluno, catalogo, supervisorRegistro, alunoCpf, onClose,
}) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-fav-print', 'true');
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

  const media = mediaDoAluno(aluno);
  const dataBr = (iso?: string) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  const periodo = vaga.dataInicio || vaga.dataFim
    ? `${dataBr(vaga.dataInicio)} A ${dataBr(vaga.dataFim)}` : '';

  const blocos = [
    { titulo: 'CONHECIMENTO TÉCNICO PROFISSIONAL:', itens: catalogo?.compConhecimento ?? [], nota: aluno.notaConhecimento },
    { titulo: 'HABILIDADE TÉCNICA:',                itens: catalogo?.compHabilidade ?? [],   nota: aluno.notaHabilidade },
    { titulo: 'ATITUDES PESSOAIS:',                 itens: catalogo?.compAtitudes ?? [],     nota: aluno.notaAtitudes },
    { titulo: 'VALORES ÉTICOS:',                    itens: catalogo?.compValores ?? [],      nota: aluno.notaValores },
  ];

  /*
     FONTE DA LISTA DE ITENS CALCULADA PELO TAMANHO REAL DO TEXTO, NÃO FIXA.
     A ficha é a mesma para os 16 componentes de estágio, mas o tanto de
     texto varia muito — "Conhecer a anatomia humana." é uma linha; a
     Segurança do Trabalho tem blocos com several itens compridos. Uma fonte
     fixa que coubesse no componente mais enxuto estourava a folha (que é
     paisagem — só 210mm de altura, bem menos espaço vertical que uma folha
     em pé) nos componentes mais extensos. Por isso o tamanho é calculado a
     partir da soma de caracteres de todos os itens, toda vez que a ficha é
     montada — sempre cabe em 1 folha, seja qual for o componente. */
  const caracteresTotais = blocos.reduce(
    (soma, b) => soma + b.itens.reduce((s, t) => s + t.length, 0), 0
  );
  const fonteItens =
    caracteresTotais <= 260 ? 12 :
    caracteresTotais <= 420 ? 10.5 :
    caracteresTotais <= 600 ? 9.5 : 8.5;
  const celItens: React.CSSProperties = { ...cel, fontSize: `${fonteItens}pt` };

  const Cabecalho = (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '8mm', marginBottom: '3mm' }}>
      <div style={{ flex: 1 }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
             referrerPolicy="no-referrer"
             style={{ height: '1.5cm', width: 'auto', objectFit: 'contain' }} />
        <p style={{ fontSize: '6.5pt', margin: '2px 0 0' }}>
          Rua 20 nº 796 - Centro - Goiânia-GO CEP 74.030-110 "Resolução CEE 18/2006"
        </p>
        <p style={{ fontSize: '6.5pt', margin: 0 }}>
          FoneFax: (0xx62)3229-3622 Fone:(0XX62) 32237602 www.colegiooswaldocruz.com.br
        </p>
      </div>
      <div style={{
        border: '0.5mm solid #000', padding: '4mm 8mm', textAlign: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ fontSize: '13pt' }}>FICHA DE AVALIAÇÃO</div>
        <div style={{ fontSize: '13pt' }}>DE ESTÁGIO CURRICULAR</div>
      </div>
    </div>
  );

  /* FOLHA 1 — a ficha */
  const Folha1 = (
    <div className="fav-folha" style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', padding: '4mm' }}>
      {Cabecalho}

      <p style={{ fontSize: '9.5pt', fontWeight: 'bold', margin: '0 0 1mm' }}>
        TÉCNICO EM {(vaga.curso ?? '').toUpperCase()}
      </p>

      {/* GRADE IDÊNTICA À FICHA EM PAPEL.
          Duas linhas de identificação: a primeira com Aluno(a), Comp.
          Curricular e Período; a segunda com os cinco campos pequenos —
          SGE, VAGA, SALA, TURNO e EMPRESA/SUPERVISOR/CPF — na mesma ordem
          do modelo da escola. SGE, VAGA e SALA não têm dado digital por
          trás: a secretaria digita direto no campo, e ficam em branco
          quando ninguém preenche. */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={cel}>
              <strong>Aluno(a)</strong> {aluno.alunoMatricula ? `${aluno.alunoMatricula} - ` : ''}{aluno.alunoNome.toUpperCase()}
            </td>
          </tr>
          <tr>
            <td style={cel}>
              <strong>COMP. CURRICULAR</strong> {vaga.componente.toUpperCase()}
            </td>
          </tr>
          <tr>
            <td style={cel}>
              <strong>PERÍODO DE ESTÁGIO:</strong> {periodo}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
        <tbody>
          <tr>
            <td style={{ ...cel, width: '14%' }}><strong>SGE</strong> {aluno.sgeManual ?? ''}</td>
            <td style={{ ...cel, width: '14%' }}><strong>VAGA</strong> {aluno.vagaManual ?? ''}</td>
            <td style={{ ...cel, width: '14%' }}><strong>SALA</strong> {aluno.salaManual ?? ''}</td>
            <td style={{ ...cel, width: '14%' }}><strong>TURNO</strong> {vaga.turno ?? ''}</td>
            <td style={cel}><strong>CPF</strong> {alunoCpf ?? ''}</td>
          </tr>
          <tr>
            <td style={cel} colSpan={2}><strong>SUPERVISOR</strong> {vaga.supervisorNome ?? ''}{supervisorRegistro ? ` - ${supervisorRegistro}` : ''}</td>
            <td style={cel} colSpan={3}><strong>EMPRESA</strong> {vaga.localNome ?? ''}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: 'none' }}>
        <thead>
          <tr>
            <th style={{ ...cel, background: '#d9d9d9', textAlign: 'center', fontSize: '12pt' }}>
              ELEMENTOS DE COMPETÊNCIA
            </th>
            <th style={{ ...cel, background: '#d9d9d9', textAlign: 'center', width: '16%', fontSize: '12pt' }}>
              NOTAS
            </th>
          </tr>
        </thead>
        <tbody>
          {blocos.map((b, i) => (
            <tr key={i}>
              <td style={celItens}>
                <div style={{ fontWeight: 'bold' }}>{b.titulo}</div>
                {b.itens.length > 0 ? (
                  <ul style={{ margin: '1mm 0 0', paddingLeft: '7mm' }}>
                    {b.itens.map((t, j) => (
                      <li key={j} style={{ marginBottom: '0.5mm' }}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  // Espaço reservado para os itens que a escola vai importar.
                  <div style={{ minHeight: '11mm' }} />
                )}
              </td>
              <td style={{ ...cel, textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', fontSize: '13pt' }}>
                {b.nota === null || b.nota === undefined ? '' : b.nota.toFixed(1).replace('.', ',')}
              </td>
            </tr>
          ))}
          {/* No papel é uma linha só, "RESULTADO FINAL", com o número na
              coluna da nota — não duas caixas separadas de resultado e
              média. */}
          <tr>
            <td style={{ ...cel, background: '#d9d9d9', fontWeight: 'bold', fontSize: '12pt' }}>
              RESULTADO FINAL {aluno.resultado === 'PENDENTE' ? '' : `— ${aluno.resultado}`}
            </td>
            <td style={{ ...cel, background: '#d9d9d9', textAlign: 'center', fontWeight: 'bold', fontSize: '11pt' }}>
              {media === null ? '' : media.toFixed(1).replace('.', ',')}
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2mm' }}>
        <tbody>
          <tr>
            {['ASSINATURA DO ALUNO:', 'ASSINATURA DO SUPERVISOR:', 'ASSINATURA DA GERÊNCIA DE ESTÁGIO:'].map(t => (
              <td key={t} style={{ ...cel, height: '22mm', fontWeight: 'bold', width: '33.33%' }}>{t}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  /* FOLHA 2 — controle de frequência */
  const Folha2 = (
    <div className="fav-folha" style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', padding: '4mm' }}>
      <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz"
             referrerPolicy="no-referrer"
             style={{ height: '1.7cm', width: 'auto', objectFit: 'contain' }} />
        <p style={{ fontSize: '7.5pt', margin: '2px 0 0' }}>
          Rua 20 n° 796 - Centro - Goiânia-GO CEP 74.030-110 "Resolução CEE 18/2006"
        </p>
        <p style={{ fontSize: '7.5pt', margin: 0 }}>
          FoneFax: (0xx62)3229-3622 Fone:(0XX62) 32237602 www.colegiooswaldocruz.com.br
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...cel, background: '#d9d9d9', width: '8%', textAlign: 'center' }}>DATA</th>
            <th style={{ ...cel, background: '#d9d9d9', textAlign: 'center' }}>ASSINATURA DO ALUNO</th>
            <th style={{ ...cel, background: '#d9d9d9', width: '30%', textAlign: 'center' }}>VISTO DO SUPERVISOR</th>
          </tr>
        </thead>
        <tbody>
          {/* 24 linhas em branco, como no modelo da escola. */}
          {Array.from({ length: 24 }).map((_, i) => (
            <tr key={i}>
              <td style={{ ...cel, height: '6.5mm' }} />
              <td style={cel} />
              <td style={cel} />
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-around', gap: '20mm', marginTop: '14mm' }}>
        {['PROFESSOR / SUPERVISOR', 'COORDENAÇÃO DE CURSO'].map(t => (
          <div key={t} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '0.5mm solid #000', paddingTop: '1mm', fontSize: '11pt', fontWeight: 'bold' }}>
              {t}
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
            <ClipboardCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Ficha de Avaliação — {aluno.alunoNome}
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
            Imprima em <strong>paisagem</strong>. São duas folhas: a ficha e o controle de frequência.
            Desmarque <strong>Cabeçalhos e rodapés</strong> e marque <strong>Gráficos de fundo</strong>.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100 space-y-6">
          <div className="bg-white shadow-sm mx-auto" style={{ minWidth: '900px', padding: '8mm' }}>{Folha1}</div>
          <div className="bg-white shadow-sm mx-auto" style={{ minWidth: '900px', padding: '8mm' }}>{Folha2}</div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="fav-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '297mm' }}>
          {Folha1}
          {Folha2}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
