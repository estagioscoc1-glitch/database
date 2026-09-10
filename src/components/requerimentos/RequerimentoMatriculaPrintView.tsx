import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileText, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';

// ===========================================================================
//  REQUERIMENTO DE MATRÍCULA — documento para impressão
//
//  MESMO PADRÃO DA DECLARAÇÃO E DO CONTRATO — E A PARTE QUE FALTAVA AQUI.
//  A primeira versão deste arquivo mandava imprimir assim que abria, sem
//  mostrar nada na tela antes. O documento vivia dentro da mesma janela
//  marcada "no-print" — e na hora de imprimir o navegador esconde tudo que
//  tem essa marca, folha incluída. Resultado: página em branco na
//  pré-visualização, exatamente o que apareceu.
//
//  Agora são duas cópias do documento, como nos outros três:
//  1) uma dentro do modal, em tamanho reduzido, só para você conferir na
//     tela antes de mandar para o papel;
//  2) uma segunda, limpa, fora da tela (position fixed, bem à esquerda),
//     que só existe no instante de imprimir — é essa que o navegador
//     realmente manda para a impressora ou para o PDF.
//
//  Idade atual é CALCULADA a partir da data de nascimento, não digitada —
//  ela muda todo ano, e um campo digitado ficaria errado no aniversário
//  seguinte sem ninguém perceber.
// ===========================================================================

export interface DadosRequerimentoMatricula {
  alunoNome: string;
  matricula: string;
  nomePai: string;
  nomeMae: string;
  naturalidade: string;
  nacionalidade: string;
  dataNascimento: string;
  endereco: string;
  estadoCivil: string;
  telefone: string;
  celular: string;
  rg: string;
  cpf: string;
  cursoNome: string;
  modulo: string;
  turno: string;
  turma: string;
  dataEmissao: string;
}

interface Props {
  dados: DadosRequerimentoMatricula;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page { size: 210mm 297mm; margin: 2cm 2.2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .rm-portal {
      position: static !important; display: block !important;
      width: 100% !important; margin: 0 !important; padding: 0 !important;
      overflow: visible !important; background: #fff !important;
    }
  }
`;

function idadeAtual(nascimento) {
  if (!nascimento) return '';
  const nasc = new Date(nascimento + 'T00:00:00');
  if (isNaN(nasc.getTime())) return '';
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return String(idade);
}

function dataPorExtenso(iso) {
  if (!iso) return '';
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

const rotuloEstilo = { fontWeight: 'bold', fontSize: '11pt' };
const linhaEstilo = { padding: '3px 0', fontSize: '11pt', display: 'flex', gap: '6px', flexWrap: 'wrap' };

export const RequerimentoMatriculaPrintView = ({ dados, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-rm-print', 'true');
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

  const Campo = ({ rotulo, valor }) => (
    <div style={linhaEstilo}>
      <span style={rotuloEstilo}>{rotulo}:</span>
      <span>{valor || '\u00a0'}</span>
    </div>
  );

  const cel = { border: '1px solid #000', borderRadius: 2 };

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1.5px solid #000', paddingBottom: '10px', marginBottom: '6mm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="Colégio Oswaldo Cruz" referrerPolicy="no-referrer"
             style={{ height: '16mm', width: 'auto', objectFit: 'contain' }} />
        <div style={{ fontSize: '9pt', lineHeight: 1.3 }}>
          <p style={{ margin: 0 }}>Rua 20 nº 796 - Centro - Goiânia-GO CEP 74.030-110</p>
          <p style={{ margin: 0 }}>Fone/Fax: (62) 3223-7602 · www.colegiooswaldocruz.com.br</p>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', margin: '0 0 7mm' }}>
        REQUERIMENTO DE MATRICULA
      </h1>

      <div style={cel}>
        <div style={{ ...linhaEstilo, justifyContent: 'space-between', padding: '5px 8px', borderBottom: '1px solid #000' }}>
          <span><span style={rotuloEstilo}>ALUNO (A):</span> {dados.alunoNome.toUpperCase()}</span>
          <span style={rotuloEstilo}>Nº Matrícula: {dados.matricula}</span>
        </div>
        <div style={{ padding: '2px 8px' }}>
          <Campo rotulo="PAI" valor={dados.nomePai} />
          <Campo rotulo="MÃE" valor={dados.nomeMae} />
          <div style={linhaEstilo}>
            <span style={rotuloEstilo}>NATURALIDADE:</span><span>{dados.naturalidade || '\u00a0'}</span>
            <span style={{ ...rotuloEstilo, marginLeft: '10mm' }}>NACIONALIDADE:</span><span>{dados.nacionalidade || 'BRASILEIRA'}</span>
          </div>
          <div style={linhaEstilo}>
            <span style={rotuloEstilo}>DATA DE NASCIMENTO:</span><span>{dados.dataNascimento ? new Date(dados.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '\u00a0'}</span>
            <span style={{ ...rotuloEstilo, marginLeft: '10mm' }}>IDADE ATUAL:</span><span>{idadeAtual(dados.dataNascimento)}</span>
          </div>
          <Campo rotulo="ENDEREÇO" valor={dados.endereco} />
          <Campo rotulo="ESTADO CIVIL" valor={dados.estadoCivil} />
          <div style={linhaEstilo}>
            <span style={rotuloEstilo}>FONE:</span><span>{dados.telefone || '\u00a0'}</span>
            <span style={{ ...rotuloEstilo, marginLeft: '10mm' }}>CELULAR:</span><span>{dados.celular || '\u00a0'}</span>
          </div>
          <div style={linhaEstilo}>
            <span style={rotuloEstilo}>R.G.:</span><span>{dados.rg || '\u00a0'}</span>
            <span style={{ ...rotuloEstilo, marginLeft: '10mm' }}>C.P.F:</span><span>{dados.cpf || '\u00a0'}</span>
          </div>
          <div style={linhaEstilo}>
            <span style={rotuloEstilo}>CURSO:</span><span>{dados.cursoNome.toUpperCase() || '\u00a0'}</span>
            <span style={{ ...rotuloEstilo, marginLeft: '10mm' }}>MÓDULO:</span><span>{dados.modulo || '\u00a0'}</span>
          </div>
          <div style={{ ...linhaEstilo, paddingBottom: '8px' }}>
            <span style={rotuloEstilo}>TURNO:</span><span>{dados.turno || '\u00a0'}</span>
            <span style={{ ...rotuloEstilo, marginLeft: '10mm' }}>TURMA:</span><span>{dados.turma || '\u00a0'}</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: '11pt', margin: '12mm 0 0' }}>
        Goiânia, {dataPorExtenso(dados.dataEmissao)}
      </div>

      <div style={{ marginTop: '26mm', textAlign: 'center' }}>
        <div style={{ borderTop: '1px solid #000', width: '65%', margin: '0 auto', paddingTop: '2mm' }}>
          <p style={{ fontSize: '11pt', margin: 0, fontWeight: 'bold' }}>{dados.alunoNome.toUpperCase()}</p>
          <p style={{ fontSize: '10pt', margin: 0 }}>Aluno</p>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Requerimento de Matrícula — {dados.alunoNome}
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
            Na caixa do navegador, desmarque <strong>Cabeçalhos e rodapés</strong> — o resto pode ficar como está.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '740px', padding: '2cm 2.2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {imprimindo && createPortal(
        <div className="rm-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
