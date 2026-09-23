import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getEnrollments, saveEnrollment } from '../../services/movimentacaoStorage';
import type { StudentEnrollment, EnrollmentDocumentCheckitem } from '../../types/movimentacao';
import { createPortal } from 'react-dom';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import { FONTE_DOCUMENTOS } from '../../lib/documentoEstilo';
import { Search, Printer, X, CheckCircle2, XCircle, FileText } from 'lucide-react';

// ===========================================================================
//  TERMO DE CIÊNCIA E CONCORDÂNCIA (documentação da pré-matrícula)
//
//  Marca aqui quais documentos o aluno JÁ ENTREGOU — o termo impresso sai
//  automaticamente com os que AINDA FALTAM assinalados (é assim que o
//  modelo em papel funciona: lista "documentos que faltam"). Marcar/
//  desmarcar aqui atualiza o checklist de documentos da matrícula do
//  aluno (o mesmo que já existe em Movimentação → Matrícula).
// ===========================================================================

const DOCUMENTOS_DO_TERMO = [
  'Identidade', 'CPF', 'Título de Eleitor', 'Reservista', '01 Foto 3x4',
  'Certidão de Nascimento ou Casamento', 'Comprovante de Endereço', 'Diploma do Ensino Médio, com Histórico Escolar',
];

interface Props {
  currentUser?: string;
}

export const TermoCienciaDocumentosManager: React.FC<Props> = ({ currentUser = 'Secretaria' }) => {
  const { users, classes, courses } = useApp();
  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [checklist, setChecklist] = useState<EnrollmentDocumentCheckitem[]>([]);
  const [prazo, setPrazo] = useState('');
  const [mostrarImpressao, setMostrarImpressao] = useState(false);

  const alunos = users.filter((u: any) => u.role === 'STUDENT');
  const alunosFiltrados = busca.trim().length >= 2
    ? alunos.filter((a: any) => a.name?.toLowerCase().includes(busca.toLowerCase()) || a.enrollment?.includes(busca)).slice(0, 8)
    : [];

  // Curso direto do cadastro da turma — funciona mesmo sem StudentEnrollment
  // (a maioria dos alunos, cadastrados por planilha, não tem esse registro).
  const turma = aluno ? classes.find((c: any) => c.id === aluno.classId) : null;
  const curso = turma ? courses.find((c: any) => c.id === turma.courseId) : null;

  const montarChecklist = (base: EnrollmentDocumentCheckitem[]): EnrollmentDocumentCheckitem[] =>
    DOCUMENTOS_DO_TERMO.map(nome => {
      const existente = base.find(i => i.name.toLowerCase().includes(nome.toLowerCase().split(',')[0].split(' ')[0]));
      return existente || { name: nome, delivered: false };
    });

  const handleSelecionar = (a: any) => {
    setAluno(a);
    setBusca('');
    const matriculas = getEnrollments().filter(e => e.studentId === a.id);
    const ultima = matriculas[matriculas.length - 1] || null;
    setEnrollment(ultima);
    setChecklist(montarChecklist(ultima?.documentsChecklist || []));
  };

  const handleToggle = (nome: string) => {
    const novo = checklist.map(item =>
      item.name === nome ? { ...item, delivered: !item.delivered, deliveredAt: !item.delivered ? new Date().toISOString() : undefined } : item
    );
    setChecklist(novo);
    // Só persiste de verdade se o aluno tiver um registro de matrícula
    // (StudentEnrollment) — a maioria, cadastrada por planilha, não tem.
    // Sem isso, o checklist ainda funciona pra gerar o termo agora, só
    // não fica salvo pra próxima vez que abrir esse aluno.
    if (enrollment) {
      const atualizada: StudentEnrollment = { ...enrollment, documentsChecklist: novo };
      saveEnrollment(atualizada, currentUser);
      setEnrollment(atualizada);
    }
  };

  const faltantes = checklist.filter(i => !i.delivered);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" /> Termo de Ciência e Concordância
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Marque os documentos já entregues. O termo impresso sai com os que ainda faltam assinalados.
        </p>

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
          <>
            <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300">
              ✓ {aluno.name} (Matrícula: {aluno.enrollment})
              {turma ? (
                <p className="font-normal mt-1">{curso?.name || 'Curso não identificado'} — Turma {turma.name}</p>
              ) : (
                <p className="text-rose-600 font-normal mt-1">Esse aluno não tem turma cadastrada — confira em Cadastros Acadêmicos.</p>
              )}
              {!enrollment && <p className="text-amber-600 font-normal mt-1">Aviso: sem registro de matrícula formal — o checklist funciona normalmente, mas não fica salvo pra próxima vez que abrir esse aluno.</p>}
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Prazo para entregar o que falta</label>
              <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklist.map(item => (
                <button key={item.name} type="button" onClick={() => handleToggle(item.name)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs font-bold ${
                    item.delivered
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {item.delivered ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                  {item.name}
                </button>
              ))}
            </div>

            <button type="button" disabled={!prazo} onClick={() => setMostrarImpressao(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl shadow-lg uppercase tracking-wide">
              <Printer className="h-4 w-4" /> Gerar Termo ({faltantes.length} documento(s) faltando)
            </button>
          </>
        )}
      </div>

      {mostrarImpressao && aluno && (
        <TermoCienciaPrintView aluno={aluno} cursoNome={curso?.name || ''} checklist={checklist} prazo={prazo} onClose={() => setMostrarImpressao(false)} />
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

const TermoCienciaPrintView: React.FC<{
  aluno: any; cursoNome: string; checklist: EnrollmentDocumentCheckitem[]; prazo: string; onClose: () => void;
}> = ({ aluno, cursoNome, checklist, prazo, onClose }) => {
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

  const prazoBr = prazo ? new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR') : '____/____/______';

  const Documento = (
    <div style={{ fontFamily: FONTE_DOCUMENTOS, color: '#000', maxWidth: '700px', margin: '0 auto', fontSize: '11.5pt', lineHeight: 1.6 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '0.3cm', marginBottom: '0.6cm' }}>
        <img src={LOGO_COLEGIO_OSWALDO_CRUZ} alt="COC" style={{ height: '1.6cm', margin: '0 auto 0.2cm', display: 'block', objectFit: 'contain' }} />
      </div>

      <h2 style={{ textAlign: 'center', fontSize: '13pt', margin: '0 0 0.6cm' }}>TERMO DE CIÊNCIA E CONCORDÂNCIA</h2>

      <p style={{ textAlign: 'justify' }}>
        Declaro pelo presente termo, estar ciente de que esta pré-matrícula não garante minha permanência no curso
        de <strong>{cursoNome || '.....................................'}</strong>, gerando apenas uma
        expectativa de vaga, que será efetivamente assegurada mediante a confirmação da matrícula, procedimento este
        de minha responsabilidade, e condicionado à apresentação de toda a documentação exigida pela Secretaria do
        Colégio Oswaldo Cruz de Goiânia — até <strong>{prazoBr}</strong>, sob pena de cancelamento da matrícula.
      </p>

      <p style={{ marginTop: '0.8cm' }}>Goiânia, ....................... de .................................................. de 20.............</p>

      <p style={{ marginTop: '0.6cm' }}>Nome Legível: <strong>{aluno.name}</strong></p>
      <p style={{ marginTop: '0.8cm' }}>Assinatura: ...................................................................................................................</p>

      <p style={{ marginTop: '0.8cm', fontWeight: 'bold' }}>Documentos que faltam:</p>
      <div style={{ marginTop: '0.2cm' }}>
        {checklist.map(item => (
          <p key={item.name} style={{ margin: '0.15cm 0' }}>
            ( {item.delivered ? '' : 'X'} ) {item.name}
          </p>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <div className="no-print fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">Termo de Ciência — {aluno.name}</span>
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
