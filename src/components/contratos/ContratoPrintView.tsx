import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileSignature, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import type { DadosContrato } from '../../lib/supabaseContratos';
import { formatarDinheiro, porExtenso } from '../../lib/supabaseContratos';
import type { ClausulaContrato } from '../../lib/contratoTextos';

// ===========================================================================
//  CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS — documento para impressão
//
//  ASSINATURA EM TODAS AS FOLHAS — como isso funciona:
//  A escola exige que o aluno viste cada página. Não dá pra saber de antemão
//  onde o navegador vai quebrar as páginas (depende do tamanho do nome, do
//  endereço, da fonte instalada). A solução é um rodapé com
//  "position: fixed" dentro do @media print: o navegador REPETE elementos
//  fixos em todas as folhas impressas. Assim a linha de visto aparece no pé
//  de cada página, quantas forem. O padding-bottom do corpo reserva o espaço
//  pra ele não cobrir o texto.
//
//  IMPRESSÃO — mesmo padrão já testado no ProvaPrintView e no
//  GradeCurricularModule: portal preso ao document.body + @media print que
//  esconde o #root. Chamar window.print() direto imprimiria o portal inteiro.
// ===========================================================================

interface Props {
  dados: DadosContrato;
  /** Texto do contrato. Vem do modelo salvo no banco, ou do padrão de fábrica
   *  se ninguém nunca editou. Quem resolve isso é o ContratosModule. */
  clausulas: ClausulaContrato[];
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.2cm 1.6cm 2.2cm 1.6cm;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .contrato-portal {
      position: static !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .contrato-corpo {
      font-size: 10pt;
      line-height: 1.35;
      text-align: justify;
      color: #000;
      /* espaço reservado pro timbre (topo) e pro visto (rodapé) que se repetem */
      padding-top: 2.1cm;
      padding-bottom: 1.4cm;
    }
    /* O NAVEGADOR REPETE ISTO EM TODAS AS FOLHAS. É o timbre por página. */
    .contrato-logo-topo {
      position: fixed !important;
      top: 0;
      left: 0;
      right: 0;
      display: block !important;
      text-align: center;
      background: #fff;
      padding-bottom: 4px;
      border-bottom: 1px solid #000;
    }
    .contrato-logo-topo img {
      width: 100%;
      max-height: 1.7cm;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .contrato-logo-tela { display: none !important; }
    /* O NAVEGADOR REPETE ISTO EM TODAS AS FOLHAS. É o visto por página. */
    .contrato-visto-rodape {
      position: fixed !important;
      bottom: 0;
      left: 0;
      right: 0;
      display: block !important;
      font-size: 8pt;
      color: #000;
      border-top: 1px solid #000;
      padding-top: 3px;
      background: #fff;
    }
    .contrato-clausula { break-inside: auto; }
    .contrato-nao-quebrar { break-inside: avoid; page-break-inside: avoid; }
    .contrato-assinaturas { break-inside: avoid; page-break-inside: avoid; }
  }
  @media screen {
    .contrato-visto-rodape { display: none; }
    .contrato-logo-topo { display: none; }
  }
`;

/** Substitui {{CAMPO}} pelos valores reais. */
function preencher(texto: string, d: DadosContrato): string {
  const mapa: Record<string, string> = {
    NOME: d.contratanteNome || '____________________________',
    ESTADO_CIVIL: d.estadoCivil || '____________',
    CPF: d.cpf || '______________',
    RG: d.rg || '____________',
    RG_ORGAO: d.rgOrgao || '________',
    NACIONALIDADE: d.nacionalidade || 'BRASILEIRA',
    ENDERECO: d.endereco || '________________________________',
    BAIRRO: d.bairro || '______________',
    CIDADE: d.cidade || 'GOIÂNIA-GO',
    ALUNO: d.alunoNome || d.contratanteNome || '____________________________',
    ANO: d.ano || String(new Date().getFullYear()),
    MODULO: d.modulo || '1',
    CURSO: (d.cursoNome || '____________________').toUpperCase(),
    VALOR_TOTAL: formatarDinheiro(d.valorTotal),
    VALOR_TOTAL_EXT: porExtenso(d.valorTotal),
    ENTRADA: formatarDinheiro(d.entrada),
    ENTRADA_EXT: porExtenso(d.entrada),
    NUM_PARCELAS: String(d.numParcelas).padStart(2, '0'),
    VALOR_PARCELA: formatarDinheiro(d.valorParcela),
    VALOR_PARCELA_EXT: porExtenso(d.valorParcela),
    DESC_MAT: formatarDinheiro(d.descontoMatutino),
    DESC_VESP: formatarDinheiro(d.descontoVespertino),
    DESC_NOT: formatarDinheiro(d.descontoNoturno),
    DESC_EAD: `${d.descontoEadPercentual ?? 37.5}%`.replace('.', ','),
    VALOR_BIOSSEGURANCA: formatarDinheiro(d.valorBiosseguranca),
    VALOR_BIOSSEGURANCA_EXT: porExtenso(d.valorBiosseguranca),
    VALOR_MATERIAL: formatarDinheiro(d.valorMaterialEstagio),
    VALOR_MATERIAL_EXT: porExtenso(d.valorMaterialEstagio),
    DATA: d.dataContrato
      ? new Date(d.dataContrato + 'T12:00:00').toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR'),
  };
  return texto.replace(/\{\{(\w+)\}\}/g, (_, chave) => mapa[chave] ?? `{{${chave}}}`);
}

export const ContratoPrintView: React.FC<Props> = ({ dados, clausulas, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);
  const ead = dados.modalidade === 'EAD';
  const resolucao = ead
    ? 'Resolução CEE/CEP nº 059/2023'
    : 'Resolução CEE/GO nº 092/2018';

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-contrato-print', 'true');
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

  const p = (t: string) => preencher(t, dados);

  const Documento = (
    <div className="contrato-corpo" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* TIMBRE QUE SE REPETE EM TODAS AS FOLHAS (só na impressão) */}
      <div className="contrato-logo-topo">
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Na tela o timbre aparece uma vez só, no fluxo normal */}
      <div className="contrato-logo-tela contrato-nao-quebrar" style={{ textAlign: 'center', marginBottom: '8px' }}>
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          style={{ width: '100%', maxWidth: '640px', maxHeight: '70px', objectFit: 'contain' }}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Identificação da escola e título — uma vez só, na primeira folha */}
      <div className="contrato-nao-quebrar" style={{ textAlign: 'center', marginBottom: '10px' }}>
        <p style={{ fontSize: '8.5pt', margin: '4px 0 0' }}>
          Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170 — "{resolucao}"
        </p>
        <p style={{ fontSize: '8.5pt', margin: 0 }}>
          Fone: (62) 3223.7602 &nbsp;•&nbsp; www.colegiooswaldocruz.com.br
        </p>
        <h1 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '10px 0 8px' }}>
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS
        </h1>
      </div>

      {/* Qualificação do contratante */}
      <div className="contrato-nao-quebrar" style={{ marginBottom: '10px', fontSize: '9.5pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Contratante:</strong> {p('{{NOME}}')}</span>
          <span><strong>Estado Civil:</strong> {p('{{ESTADO_CIVIL}}')}</span>
        </div>
        <div>
          <strong>CPF:</strong> {p('{{CPF}}')} &nbsp;&nbsp;
          <strong>RG.:</strong> {p('{{RG}}')} {p('{{RG_ORGAO}}')} &nbsp;&nbsp;
          <strong>Nacionalidade:</strong> {p('{{NACIONALIDADE}}')}
        </div>
        <div>
          <strong>Endereço:</strong> {p('{{ENDERECO}}')} &nbsp;&nbsp;
          <strong>Bairro:</strong> {p('{{BAIRRO}}')} &nbsp;&nbsp;
          <strong>Cidade:</strong> {p('{{CIDADE}}')}
        </div>
      </div>

      <p style={{ textIndent: '2em', margin: '0 0 8px' }}>
        {p('Como primeiro acordante ou contratante que indica como beneficiário (a) deste contrato e de sua inteira responsabilidade, o (a) estudante {{ALUNO}}. Como segundo acordante ou contratado, o Colégio Oswaldo Cruz Ltda, situado à Rua 20 nº 796 Centro, Goiânia - Goiás, inscrita no CNPJ sob o nº 37.653.128/0001-64 mediante as cláusulas e condições a seguir.')}
      </p>

      {/* Cláusulas */}
      {clausulas.map((c, i) => (
        <div key={i} className="contrato-clausula" style={{ marginBottom: '7px' }}>
          {c.paragrafos.map((par, j) => (
            <p key={j} style={{ margin: '0 0 4px', textIndent: j === 0 ? 0 : '2em' }}>
              {j === 0 && <strong>{c.titulo} - </strong>}
              {p(par)}
            </p>
          ))}
        </div>
      ))}

      {/* Fecho e assinaturas */}
      <div className="contrato-assinaturas" style={{ marginTop: '14px' }}>
        <p style={{ textIndent: '2em', margin: '0 0 14px' }}>
          E, por estarem as partes justas e contratadas, assinam o presente instrumento em duas vias
          de igual teor e forma, na presença das testemunhas abaixo, para que produzam os efeitos legais.
        </p>
        <p style={{ margin: '0 0 22px' }}>Goiânia, {p('{{DATA}}')}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '22px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              Contratante
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              Colégio Oswaldo Cruz Ltda
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: '9.5pt' }}><strong>Testemunhas:</strong></p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              1º — Nome / CPF
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              2º — Nome / CPF
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ QUE SE REPETE EM TODAS AS FOLHAS — o visto por página */}
      <div className="contrato-visto-rodape">
        <table style={{ width: '100%', fontSize: '8pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '52%' }}>
                Visto do(a) contratante: ______________________________
              </td>
              <td style={{ width: '48%', textAlign: 'right' }}>
                {dados.alunoNome} — {dados.cursoNome} — {p('{{DATA}}')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileSignature className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Contrato — {dados.alunoNome}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase flex-shrink-0">
              {ead ? 'EAD' : 'Presencial'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImprimindo(true)}
              disabled={imprimindo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="no-print px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            Na caixa do navegador, desmarque <strong>Cabeçalhos e rodapés</strong> — senão a URL e a data
            do navegador saem por cima da linha de visto. Marque <strong>Gráficos de fundo</strong> para o
            timbre sair com cor.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '820px', padding: '2.5cm 2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {/* Cópia limpa, fora do #root, só durante a impressão */}
      {imprimindo && createPortal(
        <div className="contrato-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
