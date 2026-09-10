import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';

// ===========================================================================
//  REQUERIMENTO DE MATRÍCULA — documento para impressão
//
//  Cópia fiel do modelo em papel: cabeçalho com o timbre da escola, um bloco
//  de campos rotulados (não uma tabela com linhas visíveis — o papel também
//  não tem), data por extenso e uma linha de assinatura só com o nome do
//  aluno embaixo, rotulada "Aluno".
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
    /* Medida exata em milímetros, não a palavra "A4" — evita o
       arredondamento que faz o Chrome encolher a folha sozinho e obrigar a
       digitar 100% de escala na mão toda vez. */
    @page { size: 210mm 297mm; margin: 2cm 2.2cm; }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important; margin: 0 !important; padding: 0 !important;
    }
    .rm-portal {
      position: static !important; display: block !important;
      width: 100% !important; overflow: visible !important;
    }
  }
`;

function idadeAtual(nascimento?: string): string {
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

function dataPorExtenso(iso?: string): string {
  if (!iso) return '';
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

const rotuloEstilo: React.CSSProperties = { fontWeight: 'bold', fontSize: '11pt' };
const linhaEstilo: React.CSSProperties = { padding: '3px 0', fontSize: '11pt', display: 'flex', gap: '6px', flexWrap: 'wrap' };

export const RequerimentoMatriculaPrintView: React.FC<Props> = ({ dados, onClose }) => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const t = window.setTimeout(() => window.print(), 150);
    const aoTerminar = () => onClose();
    window.addEventListener('afterprint', aoTerminar);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', aoTerminar);
      document.head.removeChild(style);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Campo: React.FC<{ rotulo: string; valor?: string }> = ({ rotulo, valor }) => (
    <div style={linhaEstilo}>
      <span style={rotuloEstilo}>{rotulo}:</span>
      <span>{valor || '\u00a0'}</span>
    </div>
  );

  const Documento = (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000' }}>
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

      <div style={{ border: '1px solid #000', borderRadius: '2px' }}>
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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
          <span className="font-black text-sm text-slate-800">Requerimento de Matrícula</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs">
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="rm-portal p-8">{Documento}</div>
      </div>
    </div>,
    document.body
  );
};
