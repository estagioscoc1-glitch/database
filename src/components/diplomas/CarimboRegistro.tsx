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
  registro, livro, folha, localData, nomeSecretario, largura = '82mm',
}) => (
  <div style={{ width: largura, fontFamily: serif, color: '#000' }}>

    {/* A caixa */}
    <div style={{ border: '0.5mm solid #000', padding: '2mm 2.5mm' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2mm' }}>
        <img src={BRASAO_GOIAS} alt="Brasão de Goiás"
             style={{ width: '11mm', height: 'auto', flexShrink: 0, marginTop: '0.5mm' }} />
        <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.15 }}>
          <div style={{ fontSize: '12.5pt', fontWeight: 'bold', letterSpacing: '0.02em' }}>
            ESTADO DE GOIÁS
          </div>
          <div style={{ fontSize: '12.5pt', fontWeight: 'bold', letterSpacing: '0.02em' }}>
            COLÉGIO OSWALDO CRUZ
          </div>
        </div>
      </div>

      <div style={{ fontSize: '9.5pt', lineHeight: 1.3, textAlign: 'center', margin: '1.5mm 0 1mm' }}>
        Conforme Lei nº. 9394 de 20/12/1996 e resolução<br />
        CEE nº. 258 de 28 de maio de 1998, declaramos<br />
        a autenticidade e regularidade do presente documento.
      </div>

      <div style={{ fontSize: '9.5pt', display: 'flex', justifyContent: 'space-between', gap: '1mm' }}>
        <Campo rotulo="Registro nº." valor={registro} min="13mm" />
        <Campo rotulo="Livro nº." valor={livro} min="11mm" />
        <Campo rotulo="Fls.nº" valor={folha} min="11mm" />
      </div>
    </div>

    {/* Local e data — fora da caixa, com a legenda embaixo */}
    <div style={{ textAlign: 'center', marginTop: '1.5mm' }}>
      <div style={{ fontSize: '11pt' }}>{localData}</div>
      <div style={{ fontSize: '8pt', borderTop: '0.3mm solid #000', paddingTop: '0.5mm' }}>
        Local e Data
      </div>
    </div>

    {/* Assinatura do secretário.
        O espaço acima é generoso de propósito: no primeiro teste o nome do
        Yan ficou colado na linha de "Local e Data" logo acima, e o conjunto
        ficou apertado. */}
    <div style={{ textAlign: 'center', marginTop: '16mm' }}>
      <div style={{ fontSize: '12pt', fontStyle: 'italic' }}>{nomeSecretario}</div>
      <div style={{ fontSize: '9.5pt' }}>Secretário</div>
    </div>
  </div>
);
