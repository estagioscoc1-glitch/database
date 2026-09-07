import React from 'react';
import { BRASAO_REPUBLICA } from '../../lib/brasaoAsset';
import { LOGO_COLEGIO_OSWALDO_CRUZ_SIMPLES } from '../../lib/imageAssets';
import { REGISTRO_CABECALHO } from '../../lib/diplomaTextos';

// ===========================================================================
//  CERTIFICADO — Qualificação Técnica (Auxiliar) e Especialização (Instrumentação)
//
//  ESTES DOIS NÃO SÃO IGUAIS AO DIPLOMA DOS CURSOS TÉCNICOS.
//
//  O diploma técnico é PAISAGEM e usa a digitalização do papel de segurança
//  como fundo. Estes dois são RETRATO e a moldura é DESENHADA: uma borda
//  preta grossa com uma faixa vermelha por fora, feita no próprio Word.
//
//  Por isso aqui a moldura é redesenhada com CSS em vez de ser uma imagem.
//  Sai mais nítida que a digitalização, e o alinhamento não depende de foto.
//
//  Também trazem, no alto, o brasão da República à esquerda e o cabeçalho
//  institucional à direita, a palavra "Certificado" grande em itálico, e a
//  marca d'água do colégio no meio da folha.
// ===========================================================================

interface Props {
  /** 'AUXILIAR' muda só o texto; a arte é a mesma nos dois. */
  dados: {
    alunoNome: string;
    filiacao: string;
    natural: string;
    uf: string;
    nascimento: string;
    conclusao: string;
    cursoNome: string;
    cidadeData: string;
    nomeSecretario: string;
    nomeDirecao: string;
    textoLegal: string;
    linhaConclusao: string;
    textoFecho: string;
  };
  preencher: (t: string) => string;
}

const serif = '"Times New Roman", Times, serif';

export const CertificadoFrente: React.FC<Props> = ({ dados, preencher }) => (
  <div
    className="dip-folha dip-folha-retrato"
    style={{
      position: 'relative', width: '210mm', height: '297mm',
      background: '#fff', fontFamily: serif, color: '#000',
      padding: '8mm', boxSizing: 'border-box',
    }}
  >
    {/* Faixa vermelha externa e moldura preta — desenhadas, como no Word */}
    <div style={{ position: 'absolute', inset: '6mm', border: '1.2mm solid #e11d1d' }} />
    <div style={{
      position: 'absolute', inset: '7.5mm', border: '1mm solid #000',
      background: '#fff',
    }} />

    {/* Marca d'água */}
    <img
      src={LOGO_COLEGIO_OSWALDO_CRUZ_SIMPLES}
      alt=""
      aria-hidden
      style={{
        /* CENTRALIZADA E MAIS CLARA.
           Antes ficava em top 44% com opacidade 0.16 e caía exatamente em
           cima da linha "Filho(a) de:", embaralhando o texto na impressão.
           Agora é centrada de verdade na folha e clara o bastante para não
           disputar com nada escrito por cima. */
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '74%', opacity: 0.08, pointerEvents: 'none',
      }}
    />

    {/* CORPO EM COLUNA, COM FOLGA ELÁSTICA ANTES DO RODAPÉ.
        Antes as distâncias do fim eram fixas (12mm da data, 18mm das
        assinaturas, 14mm do concluinte). Com nome comprido, que ocupa duas
        linhas, a soma passava da altura da folha e o "CONCLUINTE" saía
        impresso FORA da moldura preta. Agora o miolo cresce e a folga se
        ajusta sozinha: o rodapé fica sempre colado embaixo, dentro da borda. */}
    <div style={{
      position: 'relative', padding: '6mm 8mm', height: '100%',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    }}>

      {/* Cabeçalho: brasão à esquerda, instituição à direita */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6mm' }}>
        <img src={BRASAO_REPUBLICA} alt="Brasão da República"
             style={{ width: '30mm', height: 'auto', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          {REGISTRO_CABECALHO.map((l, i) => (
            <div key={i} style={{ fontSize: '15pt', fontWeight: 'bold', letterSpacing: '0.04em' }}>{l}</div>
          ))}
          <div style={{ fontSize: '22pt', fontWeight: 'bold', marginTop: '3mm', letterSpacing: '0.01em' }}>
            C<span style={{ fontSize: '17pt' }}>OLÉGIO</span> O<span style={{ fontSize: '17pt' }}>SWALDO</span> C<span style={{ fontSize: '17pt' }}>RUZ</span>
          </div>
          <div style={{ fontSize: '12.5pt' }}>Entidade Mantenedora - Colégio Oswaldo Cruz Ltda.</div>
          <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>CNPJ - Nº 37.653.128/0001-64</div>
          <div style={{ fontSize: '12pt' }}>Rua 20, nº 796, Centro - Goiânia - Goiás</div>
        </div>
      </div>

      {/* Palavra "Certificado" */}
      <div style={{
        textAlign: 'center', fontSize: '40pt', fontStyle: 'italic',
        margin: '6mm 0 4mm', letterSpacing: '0.03em',
      }}>
        Certificado
      </div>

      {/* Texto legal */}
      <p style={{ fontSize: '12pt', lineHeight: 1.9, textAlign: 'justify', textIndent: '2.5em', margin: 0 }}>
        {preencher(dados.textoLegal)}
      </p>

      {/* NOME.
          Nome muito comprido quebrava em duas linhas de 22pt e roubava a
          altura do resto da folha. Passando de 38 letras, o corpo diminui —
          continua sendo o maior texto da página, mas cabe. */}
      <div style={{
        textAlign: 'center', fontWeight: 'bold', margin: '7mm 0 4mm',
        lineHeight: 1.15,
        fontSize: dados.alunoNome.length > 38 ? '18pt' : '22pt',
      }}>
        {dados.alunoNome.toUpperCase()}
      </div>

      {/* FILIAÇÃO.
          O normal é vir preenchida do cadastro completo do aluno. A linha em
          branco abaixo é só a rede de proteção para ficha incompleta: melhor
          uma lacuna visível do que "Filho(a) de:" solto, que parecia defeito
          do sistema. Com os dois nomes, o segundo desce alinhado ao primeiro. */}
      <div style={{ fontSize: '12pt', lineHeight: 1.6 }}>
        <span>Filho(a) de: </span>
        {dados.filiacao ? (
          <>
            <strong>{dados.filiacao.split(' e ')[0]}</strong>
            {dados.filiacao.includes(' e ') && (
              <div style={{ paddingLeft: '6.2em' }}>
                <strong>{dados.filiacao.split(' e ').slice(1).join(' e ')}</strong>
              </div>
            )}
          </>
        ) : (
          <span style={{
            display: 'inline-block', borderBottom: '0.3mm solid #000',
            width: '60%', verticalAlign: 'baseline',
          }} />
        )}
      </div>

      {/* Naturalidade e conclusão */}
      <p style={{ fontSize: '12pt', lineHeight: 1.9, textAlign: 'justify', margin: '2mm 0 0' }}>
        {preencher(dados.linhaConclusao)}
      </p>

      {/* Curso */}
      <div style={{ textAlign: 'center', fontSize: '19pt', fontWeight: 'bold', margin: '3mm 0' }}>
        {dados.cursoNome.toUpperCase()}
      </div>

      {/* Fecho */}
      <p style={{ fontSize: '12pt', lineHeight: 1.9, textAlign: 'justify', margin: 0 }}>
        {dados.textoFecho}
      </p>

      {/* A folga que sobra fica aqui, entre o texto e o rodapé. */}
      <div style={{ flex: 1, minHeight: '8mm' }} />

      {/* Data */}
      <div style={{ textAlign: 'center', fontSize: '12pt' }}>
        {dados.cidadeData}
      </div>

      {/* Assinaturas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14mm', margin: '16mm 0 0' }}>
        {[
          { nome: dados.nomeSecretario, cargo: 'Secretário' },
          { nome: dados.nomeDirecao, cargo: 'Diretora' },
        ].map((a, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '1mm', fontSize: '12pt' }}>
              <div>{a.nome}</div>
              <div>{a.cargo}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Concluinte */}
      <div style={{ margin: '10mm auto 0', width: '72%', textAlign: 'center' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '1mm', fontSize: '12pt', fontWeight: 'bold' }}>
          CONCLUINTE
        </div>
      </div>
    </div>
  </div>
);

interface PropsVerso {
  verso: {
    cursoAnterior: string;
    unidadeEscolar: string;
    localDataConclusao: string;
    observacoes: string;
  };
}

export const CertificadoVerso: React.FC<PropsVerso> = ({ verso }) => {
  const caixa: React.CSSProperties = {
    border: '0.4mm solid #000', padding: '2.5mm 3mm', fontSize: '12pt',
  };
  return (
    <div
      className="dip-folha dip-folha-retrato"
      style={{
        position: 'relative', width: '210mm', height: '297mm',
        background: '#fff', fontFamily: serif, color: '#000',
        padding: '12mm', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: '0',
      }}
    >
      <div style={caixa}>
        CURSO ANTERIOR: <strong>{verso.cursoAnterior}</strong>
      </div>
      <div style={{ ...caixa, borderTop: 'none' }}>
        UNIDADE ESCOLAR: <strong>{verso.unidadeEscolar}</strong>
      </div>
      <div style={{ ...caixa, borderTop: 'none' }}>
        LOCAL E DATA DE CONCLUSÃO: <strong>{verso.localDataConclusao}</strong>
      </div>

      <div style={{ ...caixa, borderTop: 'none', flex: 1, textAlign: 'justify', lineHeight: 1.45 }}>
        <strong>OBSERVAÇÕES:</strong> {verso.observacoes}
      </div>

      {/* O QUADRADO DO PÉ DA FOLHA: uma caixa dividida em duas colunas,
          "REGISTRO" à esquerda e a da direita em branco, para o carimbo. */}
      <div style={{ display: 'flex', height: '32%' }}>
        <div style={{ ...caixa, borderTop: 'none', flex: 1, fontWeight: 'bold' }}>REGISTRO</div>
        <div style={{ ...caixa, borderTop: 'none', borderLeft: 'none', flex: 1 }} />
      </div>
    </div>
  );
};
