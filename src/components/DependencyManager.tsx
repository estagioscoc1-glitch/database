import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DependencyEnrollment, ClassSection, Shift } from '../types';
import { Calendar, Search, BookOpen, UserCheck, Sparkles, CheckCircle2, Clock, AlertCircle, Plus, FileText, Check, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DependencyManager: React.FC = () => {
  const { 
    courses, subjects, users, classes, dependencies, 
    createDependencyEnrollment, setActiveClassId, setActiveSubjectId 
  } = useApp();

  // Active Tab: List of Dependencies or New Enrollment Form
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('new');
  const [searchTerm, setSearchTerm] = useState('');

  // Form Fields
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || 'ENF');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [semester, setSemester] = useState<number>(1);
  const [schedule, setSchedule] = useState<string>('Sábado - Matutino (08:00 - 12:00)');
  const [customSchedule, setCustomSchedule] = useState<string>('');
  
  // Student Search inside form
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Success Confirmation State
  const [createdResult, setCreatedResult] = useState<{ dependency: DependencyEnrollment; classSection: ClassSection } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter subjects for selected course
  const courseSubjects = subjects.filter(s => s.courseId === selectedCourseId || !s.courseId);

  // Filter student users
  const studentUsers = users.filter(u => u.role === 'STUDENT' && u.active);
  const filteredStudents = studentUsers.filter(u =>
    u.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (u.enrollment && u.enrollment.toLowerCase().includes(studentSearch.toLowerCase())) ||
    (u.cpf && u.cpf.includes(studentSearch))
  ).slice(0, 8); // show top 8 results for clean display

  const handleConfirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedCourseId) {
      setErrorMsg('Por favor, selecione um curso.');
      return;
    }
    if (!selectedSubjectId) {
      setErrorMsg('Por favor, selecione a disciplina pendente para dependência.');
      return;
    }
    if (!selectedStudentId) {
      setErrorMsg('Por favor, pesquise e selecione o aluno.');
      return;
    }

    const finalSchedule = schedule === 'Outro' ? (customSchedule.trim() || 'Horário Especial') : schedule;

    setLoading(true);
    try {
      const result = await createDependencyEnrollment({
        studentId: selectedStudentId,
        courseId: selectedCourseId,
        subjectId: selectedSubjectId,
        semester,
        schedule: finalSchedule
      });

      setCreatedResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar matrícula na dependência.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setCreatedResult(null);
    setSelectedStudentId('');
    setStudentSearch('');
    setErrorMsg(null);
  };

  return (
    <div id="dependency-manager-root" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-400/20">
              <Sparkles className="h-3.5 w-3.5" /> Automação Acadêmica
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Cadastro de Dependência</h2>
            <p className="text-sm text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Matricule alunos em matérias pendentes/dependências. Ao confirmar a matrícula, o sistema 
              <strong> gera automaticamente o diário correspondente</strong> com vinculação do aluno e controle de notas/frequência.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('new'); handleResetForm(); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'new' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="h-4 w-4" /> Nova Dependência
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'list' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" /> Histórico de Dependências ({dependencies.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Form */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            
            {createdResult ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center py-6"
              >
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                    Matrícula Confirmada & Diário Gerado
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                    Dependência Cadastrada com Sucesso!
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    A dependência foi registrada e o Diário Acadêmico foi gerado de forma totalmente automática.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-left space-y-3 max-w-lg mx-auto text-xs sm:text-sm">
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500">Aluno:</span>
                    <strong className="text-slate-800 dark:text-white">{createdResult.dependency.studentName} ({createdResult.dependency.enrollment})</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500">Diário Criado:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{createdResult.classSection.name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-slate-500">Código do Diário:</span>
                    <strong className="font-mono text-slate-800 dark:text-white">{createdResult.classSection.code}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Horário:</span>
                    <strong className="text-slate-800 dark:text-white">{createdResult.dependency.schedule}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cadastrar Outra Dependência
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveClassId(createdResult.classSection.id);
                      if (createdResult.classSection.dependencySubjectId) {
                        setActiveSubjectId(createdResult.classSection.dependencySubjectId);
                      }
                      setActiveTab('list');
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" /> Acessar Diário Criado
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleConfirmEnrollment} className="space-y-6">
                
                {errorMsg && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-200 dark:border-red-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Step 1: Course and Subject */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> 1. Curso, Disciplina e Semestre da Dependência
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Curso <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCourseId}
                        onChange={(e) => {
                          setSelectedCourseId(e.target.value);
                          setSelectedSubjectId('');
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Disciplina em Dependência <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      >
                        <option value="">-- Selecione a Disciplina --</option>
                        {courseSubjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.workload}h)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Módulo / Semestre
                      </label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      >
                        <option value={1}>1º Módulo / Semestre</option>
                        <option value={2}>2º Módulo / Semestre</option>
                        <option value={3}>3º Módulo / Semestre</option>
                        <option value={4}>4º Módulo / Semestre</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2: Schedule Selection */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="h-4 w-4" /> 2. Horário da Dependência
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      'Sábado - Matutino (08:00 - 12:00)',
                      'Sábado - Vespertino (13:00 - 17:00)',
                      'Noturno (19:00 - 20:30)',
                      'Contra-Turno Flexível',
                      'Outro'
                    ].map((slot) => {
                      const isSel = schedule === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSchedule(slot)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                            isSel
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>{slot}</span>
                          {isSel && <Check className="h-4 w-4 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>

                  {schedule === 'Outro' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Especifique o Horário Customizado
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Terças e Quintas das 17h às 18h30"
                        value={customSchedule}
                        onChange={(e) => setCustomSchedule(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Step 3: Student Selection */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> 3. Pesquisar e Selecionar o Aluno
                  </h3>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Digite o nome, matrícula ou CPF do aluno..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>

                  {/* Student Search Results */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                    {filteredStudents.map((st) => {
                      const isSelected = selectedStudentId === st.id;
                      return (
                        <div
                          key={st.id}
                          onClick={() => setSelectedStudentId(st.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs sm:text-sm">{st.name}</div>
                            <div className={`text-[11px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              Matrícula: {st.enrollment || st.username}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-white shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Geração de Diário com vínculo de notas e presença 100% automatizada.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    <span>{loading ? 'Processando...' : 'Confirmar Matrícula na Dependência'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Side Info Box */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                <Award className="h-4 w-4" /> Regras do Módulo de Dependências
              </div>
              
              <ul className="space-y-3 text-xs text-slate-300 leading-relaxed list-disc pl-4">
                <li>
                  Ao efetuar a matrícula na dependência, o aluno é vinculado ao diário específico e fica apto para lançamentos de notas.
                </li>
                <li>
                  A dependência não sobrescreve o histórico anterior do aluno até que a nova nota final seja lançada.
                </li>
                <li>
                  O diário gerado fica disponível imediatamente na tela de <strong>Diário dos Professores</strong> para que o docente possa lançar faltas e notas.
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 p-5 rounded-3xl border border-blue-200/60 dark:border-blue-900/40 text-blue-800 dark:text-blue-300 space-y-2 text-xs">
              <h4 className="font-bold flex items-center gap-1.5 text-sm">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Automação de Diários
              </h4>
              <p className="leading-relaxed">
                Você não precisa criar a turma/diário manualmente no menu de turmas. O sistema cria o diário no formato <code>DEP-[SIGLA]</code> com todas as diretivas acadêmicas necessárias.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Dependencies History List */
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              Histórico de Dependências Cadastradas
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              Total: {dependencies.length} registro(s)
            </span>
          </div>

          {dependencies.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold">Nenhuma dependência cadastrada até o momento.</p>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-bold underline"
              >
                Cadastrar a primeira dependência agora
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Aluno</th>
                    <th className="px-4 py-3">Matrícula</th>
                    <th className="px-4 py-3">Disciplina / Curso</th>
                    <th className="px-4 py-3">Horário</th>
                    <th className="px-4 py-3">Data de Registro</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {dependencies.map((dep) => {
                    const subj = subjects.find(s => s.id === dep.subjectId);
                    return (
                      <tr key={dep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">
                          {dep.studentName}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {dep.enrollment}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-indigo-600 dark:text-indigo-400">
                            {subj ? subj.name : dep.subjectId}
                          </div>
                          <div className="text-slate-400 text-xs">{dep.courseId} • Semestre {dep.semester}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {dep.schedule}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(dep.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveClassId(dep.createdClassId);
                              setActiveSubjectId(dep.subjectId);
                            }}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Ver Diário
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
