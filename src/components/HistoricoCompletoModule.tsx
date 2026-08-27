import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { PrintModal } from './PrintModal';
import { Search, Printer, History, AlertTriangle, FileText, GraduationCap } from 'lucide-react';

// Extraído do AdminDashboard.tsx pra ficar reaproveitável — usado tanto na
// tela do Admin quanto, quando um professor específico ganha essa
// permissão extra, dentro do painel do professor. O conteúdo é EXATAMENTE
// o mesmo de antes, só isolado num componente próprio.

const cleanName = (name: string) => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
};

const areNamesSimilar = (name1: string, name2: string): boolean => {
  const n1 = cleanName(name1);
  const n2 = cleanName(name2);

  if (n1 === n2) return true;

  const coll1 = n1.replace(/([a-z])\1+/g, '$1');
  const coll2 = n2.replace(/([a-z])\1+/g, '$1');
  if (coll1 === coll2) return true;

  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return false;

  const distance = getLevenshteinDistance(n1, n2);
  const threshold = maxLen > 10 ? 2 : 1;
  if (distance <= threshold) return true;

  return false;
};

export const HistoricoCompletoModule: React.FC = () => {
  const { users, classes, grades, subjects, getStudentAbsences, unifyDuplicateStudents } = useApp();
  const [historicoSearch, setHistoricoSearch] = useState('');
  const [selectedHistoricoStudentId, setSelectedHistoricoStudentId] = useState('');
  const [printDoc, setPrintDoc] = useState<any | null>(null);

  const findSimilarStudents = (studentId: string) => {
    const currentStudent = users.find(u => u.id === studentId);
    if (!currentStudent) return [];
    return users.filter(u => u.role === UserRole.STUDENT && u.id !== studentId && areNamesSimilar(currentStudent.name, u.name));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <History className="h-6 w-6" />
            <h3 className="font-extrabold text-lg">Histórico Completo do Aluno</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visualize e emita o histórico escolar completo do aluno, contemplando todos os módulos e períodos cursados.
          </p>
        </div>
        {/* Print Action Button */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (selectedHistoricoStudentId) {
                const stdGrades = grades.filter(g => g.studentId === selectedHistoricoStudentId);
                const stdClassId = stdGrades[0]?.classId || users.find(u => u.id === selectedHistoricoStudentId)?.classId || classes[0]?.id || '';
                setPrintDoc({ type: 'historico_completo', studentId: selectedHistoricoStudentId, classId: stdClassId });
              } else {
                alert('Por favor, selecione um aluno.');
              }
            }}
            disabled={!selectedHistoricoStudentId}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-45 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir Histórico Completo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Search & Selection */}
        <div className="lg:col-span-4 space-y-4">

          {/* Search Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localizar Aluno (Nome ou Matrícula)</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por Nome ou Matrícula..."
                value={historicoSearch}
                onChange={(e) => setHistoricoSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-xs text-slate-800 dark:text-white focus:bg-white placeholder-slate-400"
              />
            </div>

            {/* Instant search results list */}
            {historicoSearch.trim() !== '' && (
              <div className="border border-slate-150 dark:border-slate-800 rounded-xl max-h-[250px] overflow-y-auto bg-slate-50 dark:bg-slate-950 divide-y divide-slate-150 dark:divide-slate-850">
                {(() => {
                  const matches = users.filter(u => u.role === UserRole.STUDENT && (
                    (u.name ?? '').toLowerCase().includes(historicoSearch.toLowerCase()) ||
                    (u.enrollment && u.enrollment.toLowerCase().includes(historicoSearch.toLowerCase()))
                  ));
                  if (matches.length === 0) {
                    return <p className="p-3 text-[11px] text-slate-400 italic text-center">Nenhum aluno encontrado</p>;
                  }
                  return matches.map(std => {
                    const stdGrade = grades.find(g => g.studentId === std.id);
                    const stdClass = stdGrade ? classes.find(c => c.id === stdGrade.classId) : null;
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => {
                          setSelectedHistoricoStudentId(std.id);
                          setHistoricoSearch(''); // clear search input
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs transition-all flex flex-col gap-0.5"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">{std.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Matrícula: {std.enrollment || 'N/A'} {stdClass ? `• Turma: ${stdClass.name}` : ''}
                        </span>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Student Quick List Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diretório de Alunos</p>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              {users
                .filter(u => u.role === UserRole.STUDENT)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(std => {
                  const isSelected = selectedHistoricoStudentId === std.id;
                  const stdGrade = grades.find(g => g.studentId === std.id);
                  const stdClass = stdGrade ? classes.find(c => c.id === stdGrade.classId) : null;
                  return (
                    <button
                      key={std.id}
                      type="button"
                      onClick={() => setSelectedHistoricoStudentId(std.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex flex-col gap-0.5 border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20'
                          : 'bg-slate-50 dark:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-extrabold truncate">{std.name}</span>
                      <span className={`text-[9px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        Matrícula: {std.enrollment || 'Sem matrícula'} {stdClass ? `• ${stdClass.name}` : ''}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Column: Complete academic records grouped by modules */}
        <div className="lg:col-span-8">
          {(() => {
            const targetStudent = users.find(u => u.id === selectedHistoricoStudentId);
            if (!targetStudent) {
              return (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-center min-h-[350px]">
                  <History className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4 animate-pulse" />
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Nenhum Aluno Selecionado</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Utilize a busca ou o diretório ao lado para selecionar o aluno e visualizar o Histórico Completo de Aproveitamento.
                  </p>
                </div>
              );
            }

            const similarStudents = findSimilarStudents(targetStudent.id);
            const studentGrades = grades.filter(g => g.studentId === targetStudent.id);
            const uniqueClassIds = Array.from(new Set(studentGrades.map(g => g.classId)));
            if (targetStudent.classId && !uniqueClassIds.includes(targetStudent.classId)) {
              uniqueClassIds.push(targetStudent.classId);
            }
            const studentClasses = classes.filter(c => uniqueClassIds.includes(c.id));

            studentClasses.sort((a, b) => {
              if (a.year !== b.year) return a.year - b.year;
              if (a.semester !== b.semester) return a.semester - b.semester;
              return a.module - b.module;
            });

            const similarBanner = similarStudents.length > 0 && (
              <div className="space-y-3 mb-4">
                {similarStudents.map(simStudent => {
                  const simClass = simStudent.classId ? classes.find(c => c.id === simStudent.classId)?.name : '';
                  const simGradesCount = grades.filter(g => g.studentId === simStudent.id).length;
                  return (
                    <div key={simStudent.id} className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs animate-fade-in">
                      <div className="flex gap-2.5 items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                        <div className="space-y-1">
                          <p className="font-extrabold text-amber-800 dark:text-amber-400">
                            Cadastro Duplicado Identificado!
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Existe outro cadastro com nome correspondente: <strong>{simStudent.name}</strong>
                            {simClass ? ` (Turma: ${simClass})` : ''}
                            {simStudent.enrollment ? ` • Matrícula: ${simStudent.enrollment}` : ' • Sem matrícula'}
                            {` • Registros de notas: ${simGradesCount}`}.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const hasEnrollmentTarget = !!targetStudent.enrollment;
                          const hasEnrollmentSim = !!simStudent.enrollment;

                          let principalId = targetStudent.id;
                          let duplicateId = simStudent.id;

                          if (!hasEnrollmentTarget && hasEnrollmentSim) {
                            principalId = simStudent.id;
                            duplicateId = targetStudent.id;
                          }

                          if (confirm(`Confirmar unificação? Todos os boletins, notas, diários, presenças e documentos de "${simStudent.name}" serão migrados para "${targetStudent.name}". O cadastro duplicado será deletado permanentemente.`)) {
                            unifyDuplicateStudents(principalId, [duplicateId]);
                            setSelectedHistoricoStudentId(principalId);
                            alert('Registros de alunos unificados com sucesso!');
                          }
                        }}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap self-start sm:self-center"
                      >
                        Unificar Cadastros
                      </button>
                    </div>
                  );
                })}
              </div>
            );

            if (studentClasses.length === 0) {
              return (
                <div className="space-y-4">
                  {similarBanner}
                  <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl text-center min-h-[350px]">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white mb-1">Nenhum Registro de Notas</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      O aluno <strong>{targetStudent.name}</strong> não possui registros de notas cadastrados no sistema.
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-6">
                {similarBanner}
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                      <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">{targetStudent.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                        Matrícula: {targetStudent.enrollment || 'N/A'} • Status: Ativo
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {studentClasses.map(cls => {
                      const classGrades = studentGrades.filter(g => g.classId === cls.id);
                      const clsSubjects = (cls.isDependency && cls.dependencySubjectId ? subjects.filter(s => s.id === cls.dependencySubjectId) : subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module));

                      return (
                        <div key={cls.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                          {/* Group Header */}
                          <div className="bg-slate-50 dark:bg-slate-850 p-4 border-b border-slate-150 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                              Turma: {cls.name} ({cls.code || 'N/A'})
                            </span>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                              <span>Ano: {cls.year}</span>
                              <span>Semestre: {cls.semester}º</span>
                              <span>Módulo: {cls.module}º</span>
                            </div>
                          </div>

                          {/* Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  <th className="py-3 px-4">Disciplina</th>
                                  <th className="py-3 px-2 text-center w-12">S1</th>
                                  <th className="py-3 px-2 text-center w-12">S2</th>
                                  <th className="py-3 px-2 text-center w-12">AFC</th>
                                  <th className="py-3 px-2 text-center w-12">EX</th>
                                  <th className="py-3 px-2 text-center w-12">CS</th>
                                  <th className="py-3 px-2 text-center w-14 font-black">PF</th>
                                  <th className="py-3 px-3 text-center w-16">Faltas</th>
                                  <th className="py-3 px-3 text-center w-20">Conceito</th>
                                  <th className="py-3 px-4 text-right w-24">Resultado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                                {clsSubjects.map(sub => {
                                  const score = classGrades.find(g => g.subjectId === sub.id);
                                  const absences = getStudentAbsences(targetStudent.id, sub.id, cls.id);
                                  return (
                                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                                        {sub.name}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score ? score.s1.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score ? score.s2.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score?.afc ? score.afc.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score?.extra !== null && score?.extra !== undefined ? score.extra.toFixed(1) : '-'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-mono">
                                        {score?.conselho !== null && score?.conselho !== undefined ? score.conselho.toFixed(1) : '-'}
                                      </td>
                                      <td className="py-3 px-2 text-center font-black font-mono bg-blue-50/20 text-blue-700 dark:text-blue-400">
                                        {score ? score.pf.toFixed(1) : '0.0'}
                                      </td>
                                      <td className="py-3 px-3 text-center font-mono font-bold text-red-600">
                                        {absences.total}
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          score?.concept === 'A'
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                            : score?.concept === 'B'
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                            : score?.concept === 'C'
                                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                            : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                                        }`}>
                                          {score ? score.concept : 'D'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                          score?.result === 'APTO'
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        }`}>
                                          {score ? score.result : 'Pendente'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {printDoc && (
        <PrintModal
          documentType={printDoc.type}
          studentId={printDoc.studentId}
          classId={printDoc.classId}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  );
};
