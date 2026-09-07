import React from 'react';
import { BRASAO_REPUBLICA } from '../../lib/brasaoAsset';
import { REGISTRO_CABECALHO } from '../../lib/diplomaTextos';

// ===========================================================================
//  DIPLOMA DE CURSO TÉCNICO — VERSÃO A4 EM PRETO E BRANCO
//
//  POR QUE ESTE ARQUIVO EXISTE.
//
//  O diploma normal é impresso sobre o papel de segurança, e a arte desse
//  papel é uma DIGITALIZAÇÃO usada como fundo. Brasão, nome do colégio, CNPJ,
//  endereço e moldura estão todos dentro da imagem — o código só posiciona o
//  texto por cima, em porcentagens medidas naquela foto.
//
//  Por isso não bastava "tirar a cor": sem a imagem, sobrava texto solto numa
//  folha em branco. Esta versão redesenha o que a imagem trazia, com traço
//  preto, para sair em qualquer impressora e em papel comum.
//
//  O CONTEÚDO É O MESMO. Mesmos textos legais, mesmos dados do aluno, mesmas
//  assinaturas. Muda só a arte. Quem editar o texto na tela vê a mudança nas
//  duas versões, porque as duas leem os mesmos campos.
//
//  Aqui o texto flui de cima para baixo, em vez de ficar em posições fixas:
//  não há mais uma foto embaixo para servir de referência, e texto que flui
//  não corre o risco de um bloco imprimir por cima do outro.
// ===========================================================================

interface Props {
  dados: {
    alunoNome: string;
    filiacao: string;
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

export const DiplomaA4PretoBranco: React.FC<Props> = ({ dados, preencher }) => (
  <div
    className="dip-folha"
    style={{
      position: 'relative', width: '297mm', height: '210mm',
      background: '#fff', fontFamily: serif, color: '#000',
      padding: '6mm', boxSizing: 'border-box',
    }}
  >
    {/* Moldura desenhada. Só preto: nada de faixa vermelha, que em impressora
        monocromática viraria uma tarja cinza suja. */}
    <div style={{ position: 'absolute', inset: '5mm', border: '1.2mm solid #000' }} />
    <div style={{ position: 'absolute', inset: '7mm', border: '0.3mm solid #000' }} />

    <div style={{
      position: 'relative', height: '100%', padding: '9mm 14mm',
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
    }}>

      {/* Cabeçalho: brasão à esquerda, instituição ao centro */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6mm' }}>
        <img src={BRASAO_REPUBLICA} alt="Brasão da República"
             style={{ width: '22mm', height: 'auto', flexShrink: 0 }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          {REGISTRO_CABECALHO.map((l, i) => (
            <div key={i} style={{ fontSize: '12pt', fontWeight: 'bold', letterSpacing: '0.04em' }}>{l}</div>
          ))}
          <div style={{ fontSize: '18pt', fontWeight: 'bold', marginTop: '1.5mm' }}>
            C<span style={{ fontSize: '14pt' }}>OLÉGIO</span> O<span style={{ fontSize: '14pt' }}>SWALDO</span> C<span style={{ fontSize: '14pt' }}>RUZ</span>
          </div>
          <div style={{ fontSize: '10.5pt' }}>Entidade Mantenedora - Colégio Oswaldo Cruz Ltda.</div>
          <div style={{ fontSize: '10.5pt', fontWeight: 'bold' }}>CNPJ - Nº 37.653.128/0001-64</div>
          <div style={{ fontSize: '10.5pt' }}>Rua 20, nº 796, Centro - Goiânia - Goiás</div>
        </div>
        {/* Espaço à direita do mesmo tamanho do brasão, para o bloco do meio
            ficar centrado de verdade na folha. */}
        <div style={{ width: '22mm', flexShrink: 0 }} />
      </div>

      {/* A palavra grande */}
      <div style={{
        textAlign: 'center', fontSize: '30pt', fontStyle: 'italic',
        margin: '3mm 0 2mm', letterSpacing: '0.03em',
      }}>
        Diploma
      </div>

      {/* Parágrafo legal */}
      <p style={{ fontSize: '11.5pt', lineHeight: 1.45, textAlign: 'justify', textIndent: '2.5em', margin: 0 }}>
        {preencher(dados.textoLegal)}
      </p>

      {/* Nome do concluinte. Diminui sozinho quando é comprido, para não
          quebrar em duas linhas e empurrar o resto da folha. */}
      <div style={{
        textAlign: 'center', fontWeight: 'bold', margin: '4mm 0 2mm',
        letterSpacing: '0.02em', lineHeight: 1.1,
        fontSize: dados.alunoNome.length > 42 ? '16pt' : '19pt',
      }}>
        {dados.alunoNome.toUpperCase()}
      </div>

      {/* Filiação. Vazia, vira linha para preencher — nunca "Filho(a) de"
          sozinho, que parece defeito do sistema. */}
      <div style={{ fontSize: '11.5pt', textAlign: 'center' }}>
        Filho(a) de{' '}
        {dados.filiacao || (
          <span style={{
            display: 'inline-block', borderBottom: '0.3mm solid #000',
            width: '45%', verticalAlign: 'baseline',
          }} />
        )}
      </div>

      {/* Naturalidade, nascimento e conclusão */}
      <p style={{ fontSize: '11.5pt', lineHeight: 1.45, textAlign: 'justify', margin: '2mm 0 0' }}>
        {preencher(dados.linhaConclusao)}
      </p>

      {/* Curso */}
      <div style={{
        textAlign: 'center', fontSize: '17pt', fontWeight: 'bold',
        margin: '2.5mm 0', letterSpacing: '0.03em',
      }}>
        {dados.cursoNome.toUpperCase()}
      </div>

      {/* Fecho */}
      <p style={{ fontSize: '11.5pt', lineHeight: 1.45, textAlign: 'justify', margin: 0 }}>
        {dados.textoFecho}
      </p>

      {/* A folga que sobrar fica aqui, e o rodapé nunca sai da moldura. */}
      <div style={{ flex: 1, minHeight: '4mm' }} />

      <div style={{ textAlign: 'right', fontSize: '11.5pt' }}>
        {dados.cidadeData}
      </div>

      {/* Assinaturas: as mesmas três do diploma original. */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        gap: '10mm', margin: '13mm 0 0', fontSize: '10.5pt',
      }}>
        {[
          { nome: dados.nomeSecretario, cargo: 'Secretário' },
          { nome: '', cargo: 'Concluinte' },
          { nome: dados.nomeDirecao, cargo: 'Diretora' },
        ].map((a, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '1mm' }}>
              {a.nome && <div style={{ fontWeight: 'bold' }}>{a.nome}</div>}
              <div>{a.cargo}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
