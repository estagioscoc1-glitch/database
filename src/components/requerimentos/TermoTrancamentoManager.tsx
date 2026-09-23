import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getEnrollments } from '../../services/movimentacaoStorage';
import type { StudentEnrollment } from '../../types/movimentacao';
import { createPortal } from 'react-dom';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { Search, Printer, X, FileWarning } from 'lucide-react';

// ===========================================================================
//  TERMO DE TRANCAMENTO E/OU DESISTÊNCIA DE CURSO
//
//  Modelo em papel que a escola já usa — só reproduzido aqui pra sair
//  preenchido automaticamente com os dados do aluno (nome, curso, período,
//  sala), em vez de digitar tudo à mão toda vez.
//
//  Isso é só o DOCUMENTO PRA ASSINAR — não mexe na matrícula do aluno no
//  sistema. Pra cancelar/trancar de verdade a matrícula (bloquear diário,
//  parcelas futuras etc.), o caminho continua sendo Movimentação →
//  Cancelamentos, como já era.
// ===========================================================================

interface Props {
  currentUser?: string;
}

export const TermoTrancamentoManager: React.FC<Props> = ({ currentUser = 'Secretaria' }) => {
  const { users } = useApp();
  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [motivo, setMotivo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [mostrarImpressao, setMostrarImpressao] = useState(false);

  const alunos = users.filter((u: any) => u.role === 'STUDENT');
  const alunosFiltrados = busca.trim().length >= 2
    ? alunos.filter((a: any) => a.name?.toLowerCase().includes(busca.toLowerCase()) || a.enrollment?.includes(busca)).slice(0, 8)
    : [];

  const handleSelecionar = (a: any) => {
    setAluno(a);
    setBusca('');
    const matriculas = getEnrollments().filter(e => e.studentId === a.id);
    setEnrollment(matriculas[matriculas.length - 1] || null);
  };

  const podeGerar = !!aluno && !!enrollment && motivo.trim().length > 0 && !!dataInicio;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-rose-600" /> Termo de Trancamento / Desistência de Curso
        </h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar aluno por nome ou matrícula..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
          {alunosFiltrados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
              {alunosFiltrados.map((a: any) => (
                <button key={a.id} onClick={() => handleSelecionar(a)} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 flex justify-between">
                  <span className="font-bold">{a.name}</span><span className="text-slate-400">{a.enrollment}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {aluno && (
          <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300">
            ✓ {aluno.name} (Matrícula: {aluno.enrollment})
            {!enrollment && <p className="text-rose-600 font-normal mt-1">Nenhuma matrícula encontrada pra esse aluno — confira em Movimentação.</p>}
          </div>
        )}

        {aluno && enrollment && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Motivo do trancamento/desistência</label>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
                placeholder="Ex.: motivos pessoais, mudança de cidade, dificuldade financeira..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">A partir de quando deixa de frequentar</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono" />
            </div>
          </div>
        )}

        <button type="button" disabled={!podeGerar} onClick={() => setMostrarImpressao(true)}
          className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl shadow-lg uppercase tracking-wide">
          <Printer className="h-4 w-4" /> Gerar Termo
        </button>
      </div>

      {mostrarImpressao && aluno && enrollment && (
        <TermoTrancamentoPrintView
          aluno={aluno} enrollment={enrollment} motivo={motivo} dataInicio={dataInicio}
          onClose={() => setMostrarImpressao(false)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
const CSS_IMPRESSAO = `
  @media print {
    @page { size: A4 portrait; margin: 2cm; }
    #root, .no-print { display: none !important; }
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
    .termo-portal { position: static !important; display: block !important; width: 100% !important; }
  }
`;

const TermoTrancamentoPrintView: React.FC<{
  aluno: any; enrollment: StudentEnrollment; motivo: string; dataInicio: string; onClose: () => void;
}> = ({ aluno, enrollment, motivo, dataInicio, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);

  React.useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);
    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 150);
    return () => { window.clearTimeout(t); window.removeEventListener('afterprint', encerrar); document.head.removeChild(style); };
  }, [imprimindo]);

  const hoje = new Date();
  const dataInicioBr = dataInicio ? new Date(dataInicio + 'T12:00:00') : null;

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', maxWidth: '700px', margin: '0 auto', fontSize: '11.5pt', lineHeight: 1.6 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '0.3cm', marginBottom: '0.6cm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="COC" style={{ height: '1.6cm', margin: '0 auto 0.2cm', display: 'block', objectFit: 'contain' }} />
        <p style={{ fontSize: '8.5pt', margin: 0 }}>
          Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170 "Resolução CEE/GO nº 018/2022"<br />
          Fone/Fax: (62) 3229.3622 - Fone: (62) 3223.7602 — www.colegiooswaldocruz.com.br
        </p>
      </div>

      <p style={{ textAlign: 'right' }}>Goiânia, {hoje.getDate()} de {hoje.toLocaleDateString('pt-BR', { month: 'long' })} de {hoje.getFullYear()}.</p>
      <p>Dossiê: {enrollment.enrollmentNumber}.</p>

      <h2 style={{ textAlign: 'center', fontSize: '13pt', margin: '0.5cm 0' }}>Termo de Trancamento e / ou Desistência de Curso.</h2>

      <p style={{ textAlign: 'justify' }}>
        Eu <strong>{aluno.name}</strong> devidamente matriculado(a) no Curso Técnico em <strong>{enrollment.courseName}</strong> do
        período <strong>{enrollment.semester}</strong> na Sala <strong>{enrollment.className}</strong>, declaro perante a Direção do
        Colégio Oswaldo Cruz que estarei a partir de {dataInicioBr ? dataInicioBr.toLocaleDateString('pt-BR') : '____/____/______'} deixando
        de frequentar as atividades escolares devido: {motivo}.
      </p>

      <p style={{ textAlign: 'justify' }}>
        Sendo assim declaro que estou ciente do prazo de 05 (cinco) anos transcorridos entre minha matrícula inicial e a conclusão
        total do curso para obtenção do título de Técnico em nível Médio, conforme a Resolução CNE/CEB Nº 1, de 21 de janeiro de
        2004; Artigo 2º inciso 4º; e Parecer CNE/CEB Nº 16/99 item 7 no 5º parágrafo (3º do artigo 8º).
      </p>

      <p>Dessa forma dou fé deste e subscrevo-me.</p>

      <div style={{ marginTop: '1.2cm' }}>
        <div style={{ borderTop: '1px solid #000', width: '9cm', margin: '0 auto', textAlign: 'center', paddingTop: '0.1cm' }}>
          Assinatura por Extenso e CPF / RG.
        </div>
      </div>
      <div style={{ marginTop: '1cm' }}>
        <div style={{ borderTop: '1px solid #000', width: '6cm', margin: '0 auto', textAlign: 'center', paddingTop: '0.1cm' }}>
          Responsável
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Termo de Trancamento — {aluno.name}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setImprimindo(true)} disabled={imprimindo} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs">
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto p-6" style={{ maxWidth: '740px' }}>{Documento}</div>
        </div>
      </div>
      {imprimindo && createPortal(
        <div className="termo-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>{Documento}</div>,
        document.body
      )}
    </div>,
    document.body
  );
};
