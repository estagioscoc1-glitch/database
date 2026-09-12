import React from 'react';
import { BRASAO_GOIAS } from '../../lib/brasaoGoiasAsset';

// ===========================================================================
//  CARIMBO DE REGISTRO — o quadro do verso dos diplomas e certificados
//
//  Transcrito do carimbo oficial da escola. É o bloco que declara a
//  autenticidade do documento, com o número de registro, o livro e a folha.
//
//  ATENÇÃO À ORDEM DOS CAMPOS: é Registro, depois LIVRO, depois FOLHA.
//  Na primeira versão eu tinha invertido livro e folha — no carimbo real,
//  6611 é o registro, 027 é o livro e 074 é a folha.
//
//  A linha "Local e Data" fica FORA da caixa, logo abaixo, com a legenda
//  centralizada embaixo. A assinatura do secretário vem depois, também fora.
// ===========================================================================

interface Props {
  registro: string;
  livro: string;
  folha: string;
  localData: string;
  nomeSecretario: string;
  /** Largura do bloco. O carimbo real ocupa cerca de um terço da folha. */
  largura?: string;
  /** Versão reduzida — para quando o carimbo entra dentro de uma caixa de
      rodapé que já tem outro conteúdo do lado (Auxiliar e Instrumentação),
      em vez do espaço vazio inteiro que o verso do diploma comum reserva
      para ele. Sem isso, o carimbo em tamanho normal nessas duas páginas
      cresce mais do que a folha tinha reservado, e o navegador espreme os
      textos vizinhos um em cima do outro para caber. */
  compacto?: boolean;
}

const serif = '"Times New Roman", Times, serif';

/** Linha com o valor sublinhado, como no carimbo. */
const Campo: React.FC<{ rotulo: string; valor: string; min: string }> = ({ rotulo, valor, min }) => (
  <span style={{ whiteSpace: 'nowrap' }}>
    {rotulo}
    <span style={{
      borderBottom: '0.35mm solid #000', display: 'inline-block',
      minWidth: min, textAlign: 'center', padding: '0 1mm', fontWeight: 'bold',
    }}>
      {valor || '\u00a0'}
    </span>
  </span>
);

export const CarimboRegistro: React.FC<Props> = ({
  registro, livro, folha, localData, nomeSecretario, largura = '82mm', compacto = false,
}) => {
  // Escala única: todo tamanho do carimbo normal, multiplicado por ~0,68 no
  // modo compacto. Só um número para ajustar, em vez de dois jogos de
  // valores para manter em sincronia.
  const e = compacto ? 0.68 : 1;
  const pt = (n: number) => `${(n * e).toFixed(1)}pt`;
  const mm = (n: number) => `${(n * e).toFixed(1)}mm`;

  return (
  <div style={{ width: largura, fontFamily: serif, color: '#000' }}>

    {/* A caixa */}
    <div style={{ border: '0.5mm solid #000', padding: `${mm(2)} ${mm(2.5)}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: mm(2) }}>
        <img src={BRASAO_GOIAS} alt="Brasão de Goiás"
             style={{ width: mm(11), height: 'auto', flexShrink: 0, marginTop: mm(0.5) }} />
        <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.15 }}>
          <div style={{ fontSize: pt(12.5), fontWeight: 'bold', letterSpacing: '0.02em' }}>
            ESTADO DE GOIÁS
          </div>
          <div style={{ fontSize: pt(12.5), fontWeight: 'bold', letterSpacing: '0.02em' }}>
            COLÉGIO OSWALDO CRUZ
          </div>
        </div>
      </div>

      <div style={{ fontSize: pt(9.5), lineHeight: 1.3, textAlign: 'center', margin: `${mm(1.5)} 0 ${mm(1)}` }}>
        Conforme Lei nº. 9394 de 20/12/1996 e resolução<br />
        CEE nº. 258 de 28 de maio de 1998, declaramos<br />
        a autenticidade e regularidade do presente documento.
      </div>

      <div style={{ fontSize: pt(9.5), display: 'flex', justifyContent: 'space-between', gap: '1mm' }}>
        <Campo rotulo="Registro nº." valor={registro} min={mm(13)} />
        <Campo rotulo="Livro nº." valor={livro} min={mm(11)} />
        <Campo rotulo="Fls.nº" valor={folha} min={mm(11)} />
      </div>
    </div>

    {/* Local e data — fora da caixa, com a legenda embaixo */}
    <div style={{ textAlign: 'center', marginTop: mm(1.5) }}>
      <div style={{ fontSize: pt(11) }}>{localData}</div>
      <div style={{ fontSize: pt(8), borderTop: '0.3mm solid #000', paddingTop: mm(0.5) }}>
        Local e Data
      </div>
    </div>

    {/* Assinatura do secretário, logo abaixo de "Local e Data". */}
    <div style={{ textAlign: 'center', marginTop: mm(compacto ? 3 : 6) }}>
      <div style={{ fontSize: pt(12), fontStyle: 'italic' }}>{nomeSecretario}</div>
      <div style={{ fontSize: pt(9.5) }}>Secretário</div>
    </div>
  </div>
  );
};
