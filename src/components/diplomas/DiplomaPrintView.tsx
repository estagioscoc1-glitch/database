import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Award, AlertTriangle } from 'lucide-react';
import { FUNDO_DIPLOMA_FRENTE, FUNDO_DIPLOMA_VERSO } from '../../lib/diplomaAssets';
import type { ModeloDiploma, VersoDiploma } from '../../lib/diplomaTextos';
import { CertificadoFrente, CertificadoVerso } from './CertificadoRetrato';
import { CarimboRegistro } from './CarimboRegistro';
import {
  REGISTRO_CABECALHO, REGISTRO_RODAPE, COMPONENTES_INSTRUMENTACAO,
  COMPETENCIAS_INSTRUMENTACAO, CONCEITOS_INSTRUMENTACAO,
} from '../../lib/diplomaTextos';

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
  /**
   * Diploma técnico impresso em papel comum, sem a arte do papel de
   * segurança: tudo em preto e branco. Mesmo conteúdo, outra folha.
   */
  versaoA4PB?: boolean;
  /** Notas do histórico do verso, só na Especialização. */
  notasInstrumentacao?: Record<string, string>;
  frequenciaInstrumentacao?: string;
  faltasInstrumentacao?: Record<string, string>;
  onClose: () => void;
}

const CSS_IMPRESSAO = (ORIENTACAO: string) => `
  @media print {
    @page { size: A4 ${ORIENTACAO}; margin: 0; }
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
    .dip-folha-verso, .dip-folha-retrato { width: 210mm; height: 297mm; }
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
  modelo, dados, verso, imprimirVerso, notasInstrumentacao = {},
  frequenciaInstrumentacao = '', faltasInstrumentacao = {},
  versaoA4PB = false, onClose,
}) => {
  const [imprimindo, setImprimindo] = useState(false);
  // QUAL LADO ESTÁ ABERTO.
  // Frente e verso são impressos separadamente porque cada um precisa ocupar
  // uma folha inteira, e porque a orientação pode diferir. Imprimir os dois
  // de uma vez fazia o navegador espremer os dois na mesma página.
  const [lado, setLado] = useState<'frente' | 'verso'>('frente');

  // PRECISA FICAR AQUI, antes do useEffect de impressão, que a usa para
  // escolher a orientação da folha. Declarada mais abaixo, o JavaScript
  // recusa lê-la e derruba a tela — foi o mesmo erro que quebrou o Histórico.
  const ehCertificadoRetrato = modelo.tipo !== 'DIPLOMA';


  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-dip-print', 'true');
    // O verso é sempre retrato; a frente depende do documento.
    const orientacao = lado === 'verso' ? 'portrait'
      : ehCertificadoRetrato ? 'portrait' : 'landscape';
    style.innerHTML = CSS_IMPRESSAO(orientacao);
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
  }, [imprimindo, lado, ehCertificadoRetrato]);

  const serif = '"Times New Roman", Times, serif';

  /* FRENTE — as posições em % vieram da medição do arquivo do Word. */
  /* PRETO E BRANCO SEM PERDER A ARTE.
     O fundo saiu de dentro do estilo da folha e virou uma camada só dele.
     Precisou ser assim porque o filtro que tira a cor vale para o elemento
     inteiro: aplicado na folha, apagaria também o texto por cima. Numa camada
     separada, ele descolore só a arte — a faixa vermelha vira preta, a
     logomarca vira cinza, e o texto continua preto cheio.
     `contrast` fecha um pouco o traço, senão o vermelho vira um cinza claro
     de aparência lavada na impressão. */
  const fundoSemCor = versaoA4PB ? 'grayscale(1) contrast(1.25)' : 'none';

  const Frente = (
    <div
      className="dip-folha"
      style={{
        position: 'relative',
        width: '297mm',
        height: '210mm',
        background: '#fff',
        fontFamily: serif,
        color: '#000',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${FUNDO_DIPLOMA_FRENTE})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        filter: fundoSemCor,
      }} />
      {/* Parágrafo legal */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '22%',
        fontSize: '13pt', lineHeight: 1.35, textAlign: 'justify',
      }}>
        {preencher(dados.textoLegal, dados)}
      </div>

      {/* NOME DO ALUNO.
          A faixa entre o nome (38,5%) e a filiação (46%) tem só 15mm. Uma
          linha de 21pt ocupa uns 7,5mm; nome que quebra em duas encosta na
          filiação e imprime um por cima do outro. Passando de 42 letras o
          corpo diminui, e o nome volta a caber numa linha só. */}
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: '38.5%',
        textAlign: 'center', fontWeight: 'bold',
        letterSpacing: '0.02em', lineHeight: 1.1,
        fontSize: dados.alunoNome.length > 42 ? '17pt' : '21pt',
      }}>
        {dados.alunoNome.toUpperCase()}
      </div>

      {/* FILIAÇÃO.
          Sem pai e mãe no cadastro, saía "Filho(a) de" e mais nada, como se
          o documento estivesse defeituoso. Agora sai uma linha para preencher
          à mão, igual aos outros campos em branco desta folha. */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '46%',
        textAlign: 'center', fontSize: '13pt',
      }}>
        Filho(a) de{' '}
        {dados.filiacao || (
          <span style={{
            display: 'inline-block', borderBottom: '0.3mm solid #000',
            width: '55%', verticalAlign: 'baseline',
          }} />
        )}
      </div>

      {/* Naturalidade, nascimento e conclusão */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '51.5%',
        fontSize: '13pt', lineHeight: 1.35, textAlign: 'justify',
      }}>
        {preencher(dados.linhaConclusao, dados)}
      </div>

      {/* Curso */}
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: '60%',
        textAlign: 'center', fontSize: '20pt', fontWeight: 'bold',
        letterSpacing: '0.03em',
      }}>
        {dados.cursoNome.toUpperCase()}
      </div>

      {/* Fecho */}
      <div style={{
        position: 'absolute', left: '10%', right: '10%', top: '67.5%',
        fontSize: '13pt', lineHeight: 1.35, textAlign: 'justify',
      }}>
        {dados.textoFecho}
      </div>

      {/* Cidade e data */}
      <div style={{
        position: 'absolute', right: '10%', top: '75%',
        fontSize: '13pt', textAlign: 'right',
      }}>
        {dados.cidadeData}
      </div>

      {/* Assinaturas */}
      <div style={{
        position: 'absolute', left: '9%', right: '9%', top: '86%',
        display: 'flex', justifyContent: 'space-between', fontSize: '11pt',
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
        width: '210mm',
        height: '297mm',
        background: '#fff',
        fontFamily: serif,
        color: '#000',
        fontSize: '12pt',
      }}
    >
      {/* Mesma camada da frente: a arte perde a cor, o texto não. */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${FUNDO_DIPLOMA_VERSO})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        filter: fundoSemCor,
      }} />
      <div style={{ position: 'absolute', left: '19%', top: '4.3%' }}>{verso.cursoAnterior}</div>
      <div style={{ position: 'absolute', left: '21%', top: '7.9%' }}>{verso.unidadeEscolar}</div>
      <div style={{ position: 'absolute', left: '30%', top: '11.5%' }}>{verso.localDataConclusao}</div>
      <div style={{
        position: 'absolute', left: '6%', right: '6%', top: '19.5%',
        textAlign: 'justify', lineHeight: 1.4, fontSize: '11pt',
      }}>
        {verso.observacoes}
      </div>
      {/* CARIMBO DE REGISTRO, com a caixinha do SISTEC/MEC do lado direito.
          O carimbo grande já existia; o código do SISTEC é novo — muda de
          aluno para aluno, por isso vem do formulário (verso.codigoAutenticacao),
          nunca escrito fixo aqui. */}
      <div style={{ position: 'absolute', left: '7%', top: '71%', display: 'flex', alignItems: 'flex-start', gap: '4mm' }}>
        <CarimboRegistro
          registro={verso.registro}
          livro={verso.livro}
          folha={verso.folha}
          localData={dados.cidadeData}
          nomeSecretario={dados.nomeSecretario}
        />
        <div style={{
          width: '38mm', border: '0.4mm solid #000', padding: '2mm',
          textAlign: 'center', fontFamily: serif, fontSize: '8.5pt', lineHeight: 1.3,
        }}>
          <div style={{ fontWeight: 'bold' }}>SISTEC - MEC</div>
          <div style={{ fontWeight: 'bold' }}>CÓDIGO DE AUTENTICAÇÃO</div>
          <div style={{ color: '#000', fontWeight: 'bold', fontSize: '9.5pt', marginTop: '1mm' }}>
            {verso.codigoAutenticacao || '\u00a0'}
          </div>
        </div>
      </div>
    </div>
  );

  /* VERSO DA ESPECIALIZAÇÃO — histórico no próprio verso.
     Copiado do arquivo oficial: caixas encadeadas com CURSO ANTERIOR,
     UNIDADE ESCOLAR e LOCAL E DATA DE CONCLUSÃO, depois o HISTÓRICO ESCOLAR
     com conceito, falta e carga horária, depois as COMPETÊNCIAS, e no pé a
     caixa dividida em REGISTRO e OBS. — a mesma divisão em duas colunas do
     verso do Certificado de Auxiliar. */
  const cargaTotalInstr = COMPONENTES_INSTRUMENTACAO.reduce((t, c) => t + c.ch, 0);
  const caixaI: React.CSSProperties = {
    border: '0.4mm solid #000', borderBottom: 'none', padding: '2mm 3mm', fontSize: '11.5pt',
  };

  const VersoInstrumentacao = (
    <div
      className="dip-folha dip-folha-retrato"
      style={{
        /* minHeight, não height: com o carimbo grande dentro do rodapé, se o
           conteúdo precisar de mais espaço a folha cresce (e imprime uma
           página a mais), em vez de o navegador espremer tudo para caber e
           os textos passarem um por cima do outro. */
        position: 'relative', width: '210mm', minHeight: '297mm',
        background: '#fff', fontFamily: serif, color: '#000',
        padding: '12mm', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={caixaI}>CURSO ANTERIOR: <strong>{verso.cursoAnterior}</strong></div>
      <div style={caixaI}>UNIDADE ESCOLAR: <strong>{verso.unidadeEscolar}</strong></div>
      <div style={caixaI}>LOCAL E DATA DE CONCLUSÃO: <strong>{verso.localDataConclusao}</strong></div>

      {/* Histórico */}
      <div style={{ ...caixaI, paddingBottom: '3mm' }}>
        <div style={{ marginBottom: '1.5mm' }}>HISTÓRICO ESCOLAR:</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5pt' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: '2mm' }}>COMPONENTES CURRICULARES</th>
              <th style={{ textAlign: 'center', width: '20mm' }}>CONCEITO</th>
              <th style={{ textAlign: 'center', width: '16mm' }}>FALTA</th>
              <th style={{ textAlign: 'right', width: '16mm' }}>C.H.</th>
            </tr>
          </thead>
          <tbody>
            {COMPONENTES_INSTRUMENTACAO.map(c => (
              <tr key={c.nome}>
                <td style={{ paddingLeft: '2mm' }}>{c.nome}</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  {notasInstrumentacao[c.nome] || '-'}
                </td>
                <td style={{ textAlign: 'center' }}>{faltasInstrumentacao[c.nome] || '-'}</td>
                <td style={{ textAlign: 'right' }}>{c.ch} h</td>
              </tr>
            ))}
            <tr>
              <td style={{ paddingLeft: '2mm', fontWeight: 'bold' }}>
                FREQUÊNCIA: {frequenciaInstrumentacao || '----'}
              </td>
              <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>CARGA HORÁRIA TOTAL:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{cargaTotalInstr} h</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '2mm', fontWeight: 'bold' }}>CONCEITOS</td>
              <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'center' }}>
                {CONCEITOS_INSTRUMENTACAO}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Competências */}
      <div style={{ ...caixaI, flex: 1 }}>
        <div style={{ marginBottom: '1.5mm' }}>COMPETÊNCIAS:</div>
        <div style={{ fontSize: '10.5pt', lineHeight: 1.35, paddingLeft: '2mm' }}>
          {COMPETENCIAS_INSTRUMENTACAO.map((c, i) => (
            <div key={i} style={{ textAlign: 'justify' }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Caixa do pé, dividida em REGISTRO e OBS.
          O lado do REGISTRO agora leva o carimbo grande de verdade — antes
          ficava em branco, esperando carimbo físico de borracha; agora sai
          já pronto, igual ao verso do diploma dos cursos técnicos. */}
      <div style={{ display: 'flex', minHeight: '52mm' }}>
        <div style={{ ...caixaI, borderBottom: '0.4mm solid #000', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CarimboRegistro
            registro={verso.registro}
            livro={verso.livro}
            folha={verso.folha}
            localData={dados.cidadeData}
            nomeSecretario={dados.nomeSecretario}
            largura="80mm"
            compacto
          />
        </div>
        <div style={{ ...caixaI, borderBottom: '0.4mm solid #000', borderLeft: 'none', flex: 1 }}>
          <div>OBS.:</div>
          <div style={{ fontSize: '10.5pt', marginTop: '2mm', textAlign: 'justify' }}>
            {verso.observacoes}
          </div>
        </div>
      </div>
    </div>
  );

  /* QUAL ARTE CADA DOCUMENTO USA.
     O Diploma dos cursos técnicos é paisagem, sobre a digitalização do papel
     de segurança. Os dois certificados são retrato, com moldura desenhada. */
  const FrenteEscolhida = ehCertificadoRetrato
    ? <CertificadoFrente dados={dados} preencher={(t: string) => preencher(t, dados)} />
    : Frente;

  const VersoEscolhido = modelo.tipo === 'CERTIFICADO_ESPECIALIZACAO'
    ? VersoInstrumentacao
    : ehCertificadoRetrato
      ? <CertificadoVerso verso={verso} cidadeData={dados.cidadeData} nomeSecretario={dados.nomeSecretario} />
      : Verso;

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
            <div className="flex rounded-xl overflow-hidden border border-slate-300">
              {(['frente', 'verso'] as const).map(l => (
                <button key={l} type="button" onClick={() => setLado(l)}
                        className={`px-3 py-2 text-[11px] font-black transition-all ${
                          lado === l ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {l === 'frente' ? 'Frente' : 'Verso'}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setImprimindo(true)} disabled={imprimindo}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs">
              <Printer className="h-3.5 w-3.5" />
              {imprimindo ? 'Preparando…' : `Imprimir ${lado === 'frente' ? 'a frente' : 'o verso'}`}
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

        {/* PRÉ-VISUALIZAÇÃO
            A folha é construída no tamanho real (297mm x 210mm) e reduzida
            aqui por transform: scale. Isso encolhe a folha e o texto juntos,
            na mesma proporção — por isso a tela mostra exatamente o que sai
            impresso. Antes o texto era medido em "em", que não acompanha a
            redução da folha: na tela saía gigante e no PDF saía certo. */}
        <div className="flex-1 overflow-auto p-6 bg-slate-200 space-y-6">
          {lado === 'frente' ? (
            <div className="mx-auto" style={{
              width: ehCertificadoRetrato ? '210mm' : '297mm',
              height: ehCertificadoRetrato ? '185mm' : '130mm',
              transform: 'scale(0.62)', transformOrigin: 'top center',
            }}>
              <div className="bg-white shadow-lg">{FrenteEscolhida}</div>
            </div>
          ) : (
            <div className="mx-auto" style={{ width: '210mm', height: '185mm', transform: 'scale(0.62)', transformOrigin: 'top center' }}>
              <div className="bg-white shadow-lg">{VersoEscolhido}</div>
            </div>
          )}


        </div>
      </div>

      {imprimindo && createPortal(
        <div className="dip-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: (lado === 'verso' || ehCertificadoRetrato) ? '210mm' : '297mm' }}>
          {lado === 'frente' ? FrenteEscolhida : VersoEscolhido}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
