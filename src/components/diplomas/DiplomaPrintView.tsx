import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Award, AlertTriangle } from 'lucide-react';
import { FUNDO_DIPLOMA_FRENTE, FUNDO_DIPLOMA_VERSO } from '../../lib/diplomaAssets';
import type { ModeloDiploma, VersoDiploma } from '../../lib/diplomaTextos';

// ===========================================================================
//  DIPLOMA / CERTIFICADO — documento para impressão
//
//  COMO É MONTADO:
//  O fundo é a digitalização do papel oficial (moldura, logos, brasão), a
//  mesma imagem que os arquivos do Word usam. O texto vai POR CIMA, em
//  posições absolutas medidas em porcentagem da folha — assim o documento
//  continua alinhado em qualquer tamanho de tela ou de papel.
//
//  Porcentagem, e não centímetros, é o que garante que a pré-visualização na
//  tela e a folha impressa fiquem iguais. Com medida fixa, o texto sairia no
//  lugar certo num e errado no outro.
//
//  FRENTE em paisagem, VERSO em retrato — como nos arquivos originais.
//  São duas folhas: o navegador imprime a frente, quebra, imprime o verso.
// ===========================================================================

interface Props {
  modelo: ModeloDiploma;
  dados: {
    alunoNome: string;
    filiacao: string;
    natural: string;
    uf: string;
    nascimento: string;
    conclusao: string;
    cursoNome: string;
    resolucao: string;
    cidadeData: string;
    nomeSecretario: string;
    nomeDirecao: string;
    textoLegal: string;
    linhaConclusao: string;
    textoFecho: string;
  };
  verso: VersoDiploma;
  imprimirVerso: boolean;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 landscape; margin: 0; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .dip-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important;
    }
    .dip-folha {
      width: 297mm; height: 210mm;
      position: relative; overflow: hidden;
      break-after: page; page-break-after: always;
    }
    /* O verso é retrato: gira a folha para caber na mesma impressão. */
    .dip-folha-verso { width: 210mm; height: 297mm; }
    .dip-folha:last-child { break-after: auto; page-break-after: auto; }
  }
`;

/** Substitui os campos do texto legal e da linha de conclusão. */
function preencher(texto: string, d: Props['dados']): string {
  return texto
    .replace(/\{\{RESOLUCAO\}\}/g, d.resolucao)
    .replace(/\{\{NATURAL\}\}/g, d.natural || '____________')
    .replace(/\{\{UF\}\}/g, d.uf || '__')
    .replace(/\{\{NASCIMENTO\}\}/g, d.nascimento || '____________')
    .replace(/\{\{CONCLUSAO\}\}/g, d.conclusao || '________')
    .replace(/\{\{CURSO\}\}/g, d.cursoNome || '____________');
}

export const DiplomaPrintView: React.FC<Props> = ({
  modelo, dados, verso, imprimirVerso, onClose,
}) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-dip-print', 'true');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 200);
    const destravar = window.setTimeout(() => setImprimindo(false), 15000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(destravar);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  const serif = '"Times New Roman", Times, serif';

  /* FRENTE — as posições em % vieram da medição do arquivo do Word. */
  const Frente = (
    <div
      className="dip-folha"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '297 / 210',
        backgroundImage: `url(${FUNDO_DIPLOMA_FRENTE})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        fontFamily: serif,
        color: '#000',
      }}
    >
      {/* Parágrafo legal */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '22%',
        fontSize: '1.05em', lineHeight: 1.35, textAlign: 'justify',
      }}>
        {preencher(dados.textoLegal, dados)}
      </div>

      {/* Nome do aluno */}
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: '38.5%',
        textAlign: 'center', fontSize: '1.7em', fontWeight: 'bold',
        letterSpacing: '0.02em',
      }}>
        {dados.alunoNome.toUpperCase()}
      </div>

      {/* Filiação */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '46%',
        textAlign: 'center', fontSize: '1.05em',
      }}>
        Filho(a) de {dados.filiacao}
      </div>

      {/* Naturalidade, nascimento e conclusão */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '51.5%',
        fontSize: '1.05em', lineHeight: 1.35, textAlign: 'justify',
      }}>
        {preencher(dados.linhaConclusao, dados)}
      </div>

      {/* Curso */}
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: '60%',
        textAlign: 'center', fontSize: '1.6em', fontWeight: 'bold',
        letterSpacing: '0.03em',
      }}>
        {dados.cursoNome.toUpperCase()}
      </div>

      {/* Fecho */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '67.5%',
        fontSize: '1.05em', lineHeight: 1.35, textAlign: 'justify',
      }}>
        {dados.textoFecho}
      </div>

      {/* Cidade e data */}
      <div style={{
        position: 'absolute', right: '10%', top: '75%',
        fontSize: '1.05em', textAlign: 'right',
      }}>
        {dados.cidadeData}
      </div>

      {/* Assinaturas */}
      <div style={{
        position: 'absolute', left: '9%', right: '9%', top: '86%',
        display: 'flex', justifyContent: 'space-between', fontSize: '0.9em',
      }}>
        {[
          { nome: dados.nomeSecretario, cargo: 'Secretário' },
          { nome: '', cargo: 'Concluinte' },
          { nome: dados.nomeDirecao, cargo: 'Diretora' },
        ].map((a, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', margin: '0 1.5%' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '2px' }}>
              {a.nome && <div style={{ fontWeight: 'bold' }}>{a.nome}</div>}
              <div>{a.cargo}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* VERSO — os quatro campos e os três números de registro. */
  const Verso = (
    <div
      className="dip-folha dip-folha-verso"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '210 / 297',
        backgroundImage: `url(${FUNDO_DIPLOMA_VERSO})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        fontFamily: serif,
        color: '#000',
        fontSize: '0.95em',
      }}
    >
      <div style={{ position: 'absolute', left: '19%', top: '4.3%' }}>{verso.cursoAnterior}</div>
      <div style={{ position: 'absolute', left: '21%', top: '7.9%' }}>{verso.unidadeEscolar}</div>
      <div style={{ position: 'absolute', left: '30%', top: '11.5%' }}>{verso.localDataConclusao}</div>
      <div style={{
        position: 'absolute', left: '6%', right: '6%', top: '19.5%',
        textAlign: 'justify', lineHeight: 1.4, fontSize: '0.9em',
      }}>
        {verso.observacoes}
      </div>
      <div style={{
        position: 'absolute', left: '6%', right: '6%', top: '70%',
        display: 'flex', justifyContent: 'space-around', fontSize: '0.95em',
      }}>
        {verso.registro && <span>Registro nº {verso.registro}</span>}
        {verso.livro && <span>Livro {verso.livro}</span>}
        {verso.folha && <span>Folha {verso.folha}</span>}
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              {modelo.nome} — {dados.alunoNome}
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
            Marque <strong>Gráficos de fundo</strong> e desmarque <strong>Cabeçalhos e rodapés</strong>,
            senão a moldura não sai. Coloque as margens em <strong>Nenhuma</strong>.
            A frente é <strong>paisagem</strong> e o verso é <strong>retrato</strong> — imprima
            separadamente se a impressora não virar sozinha.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-200 space-y-6">
          <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '1000px' }}>{Frente}</div>
          {imprimirVerso && (
            <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '700px' }}>{Verso}</div>
          )}
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="dip-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '297mm' }}>
          {Frente}
          {imprimirVerso && Verso}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
