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
//  TIMBRE NA PRIMEIRA FOLHA, VISTO EM TODAS — como isso funciona:
//  O timbre fica dentro do <tbody> da tabela, então sai uma vez só, no alto
//  da primeira página. A linha de visto fica no <tfoot>: o navegador repete
//  o rodapé de uma tabela longa em cada folha impressa e reserva a altura
//  dele em todas, sem o texto passar por cima.
//  A escola exige que o aluno viste cada página, e não dá pra saber de
//  antemão onde o navegador vai quebrar as folhas (depende do tamanho do
//  nome, do endereço, da fonte instalada). Por isso o visto é <tfoot>.
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
      margin: 1.1cm 1.6cm;
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
    .contrato-doc { font-size: 10pt; }
    .contrato-cab-cel img { max-height: 1.6cm; }
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
    /* POR QUE UMA TABELA, E NÃO DIVS:
       A linha de visto precisa sair no pé de TODAS as folhas. A primeira
       tentativa usou "position: fixed", que até repetia — mas só reservava
       espaço na primeira folha, então da segunda em diante o texto subia e
       passava por baixo. Com tabela isso não acontece: o navegador repete o
       <tfoot> no pé de cada folha impressa E reserva a altura dele em todas,
       porque faz parte do jeito que ele monta tabelas longas.
       O timbre NÃO está no <thead> de propósito — se estivesse, repetiria
       junto. Ele fica dentro do <tbody>, e por isso sai só na primeira. */
    <table
      className="contrato-doc"
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Georgia, "Times New Roman", serif',
        lineHeight: 1.35,
        textAlign: 'justify',
        color: '#000',
      }}
    >
      {/* VISTO — repete no pé de todas as folhas */}
      <tfoot>
        <tr>
          <td className="contrato-rod-cel" style={{ padding: '5px 0 0', borderTop: '0.5pt solid #000', fontSize: '8pt' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span>Visto do(a) contratante: ______________________________</span>
              <span style={{ textAlign: 'right' }}>
                {dados.alunoNome} — {dados.cursoNome} — {p('{{DATA}}')}
              </span>
            </div>
          </td>
        </tr>
      </tfoot>

      <tbody>
        <tr>
          <td style={{ padding: '10px 0 12px', verticalAlign: 'top' }}>

            {/* TIMBRE — só na primeira folha.
                Está aqui dentro do <tbody> de propósito. Se voltasse para o
                <thead>, o navegador repetiria em todas as folhas. */}
            <div className="contrato-cab-cel contrato-nao-quebrar"
                 style={{ paddingBottom: '5px', borderBottom: '0.5pt solid #000', marginBottom: '9px' }}>
              <img
                src={LOGO_COLEGIO_OSWALDO_CRUZ}
                alt="Colégio Oswaldo Cruz"
                referrerPolicy="no-referrer"
                style={{ display: 'block', margin: '0 auto', maxHeight: '2cm', maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>

            {/* Identificação e título — só na primeira folha, pois está no corpo */}
            <div className="contrato-nao-quebrar" style={{ textAlign: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '8.5pt', margin: 0 }}>
                Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170 — "{resolucao}"
              </p>
              <p style={{ fontSize: '8.5pt', margin: 0 }}>
                Fone: (62) 3223.7602 &nbsp;•&nbsp; www.colegiooswaldocruz.com.br
              </p>
              <h1 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '9px 0 8px' }}>
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
                  <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>Contratante</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>Colégio Oswaldo Cruz Ltda</div>
                </div>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: '9.5pt' }}><strong>Testemunhas:</strong></p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>1º — Nome / CPF</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>2º — Nome / CPF</div>
                </div>
              </div>
            </div>

          </td>
        </tr>
      </tbody>
    </table>
  );
  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
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
