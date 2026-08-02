import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DependencyEnrollment } from '../../types/movimentacao';
import { getDependencies, saveDependency, getCurriculums } from '../../services/movimentacaoStorage';
import { 
  Repeat, Search, CheckCircle2, DollarSign, BookOpen, UserCheck, AlertCircle, History 
} from 'lucide-react';

interface DependencyManagerModuleProps {
  currentUser: string;
}

export const DependencyManagerModule: React.FC<DependencyManagerModuleProps> = ({ currentUser }) => {
  const { users, courses, subjects, currentPeriod } = useApp();
  const [dependencies, setDependencies] = useState<DependencyEnrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Form
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [semester, setSemester] = useState<string>(currentPeriod || '2026/1');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  
  // Financial
  const [feeValue, setFeeValue] = useState<number>(300);
  const [installmentsCount, setInstallmentsCount] = useState<number>(6);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setDependencies(getDependencies());
    if (courses.length > 0) setSelectedCourseId(courses[0].id);
  }, [courses]);

  const students = users.filter(u => u.role === ('student' as any) || (u.role as string) === 'STUDENT' || (u as any).role === 'ALUNO');
  const teachers = users.filter(u => u.role === ('teacher' as any) || (u.role as string) === 'TEACHER' || (u as any).role === 'PROFESSOR');

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || (s.enrollment && s.enrollment.toLowerCase().includes(term));
  });

  const availableSubjects = subjects.filter(s => !selectedCourseId || s.courseId === selectedCourseId);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const handleConfirmDependency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setNotification({ type: 'error', message: 'Selecione o aluno.' });
      return;
    }
    if (!selectedSubject) {
      setNotification({ type: 'error', message: 'Selecione a disciplina reprovada para dependência.' });
      return;
    }

    const dep: DependencyEnrollment = {
      id: `dep_${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      enrollmentNumber: selectedStudent.enrollment || `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      courseId: selectedCourse?.id || 'c1',
      courseName: selectedCourse?.name || 'Curso',
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      semester,
      teacherId: selectedTeacher?.id,
      teacherName: selectedTeacher?.name || 'A Definir',
      enrollmentDate: new Date().toISOString().substring(0, 10),
      feeValue,
      installmentsCount,
      status: 'ATIVA',
      createdBy: currentUser
    };

    saveDependency(dep, currentUser);
    setDependencies(getDependencies());
    setNotification({
      type: 'success',
      message: `Matrícula de dependência em "${selectedSubject.name}" confirmada! Diário exclusivo criado e ${installmentsCount} parcelas geradas no Financeiro.`
    });

    setSelectedStudentId('');
    setSelectedSubjectId('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-400/30 text-indigo-300">
              <Repeat className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Matrícula de Dependência (DP)</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Inscrição em disciplinas pendentes, geração de diário exclusivo e plano de parcelamento.
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <form onSubmit={handleConfirmDependency} className="space-y-4">
            
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                1. Selecionar Aluno *
              </label>
              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar aluno..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">-- Selecione o Aluno ({filteredStudents.length}) --</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.enrollment || 'Sem Matrícula'})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Curso *
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Disciplina em Dependência *
                </label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="">-- Selecione a Disciplina --</option>
                  {availableSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.workload}h)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Professor Responsável
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="">-- Selecione o Professor --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Semestre Letivo
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Financial Config */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Plano Financeiro da Dependência
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Valor Total da Dependência (R$)
                  </label>
                  <input
                    type="number"
                    value={feeValue}
                    onChange={(e) => setFeeValue(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Número de Parcelas (Ex: 6x)
                  </label>
                  <input
                    type="number"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Repeat className="h-4 w-4" /> Confirmar Dependência e Gerar Diário / Financeiro
              </button>
            </div>

          </form>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Dependências Ativas ({dependencies.length})
            </h3>
          </div>

          {dependencies.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma dependência cadastrada.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {dependencies.map(dep => (
                <div
                  key={dep.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                >
                  <h4 className="font-extrabold text-slate-900 dark:text-white">{dep.studentName}</h4>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">{dep.subjectName}</p>
                  <p className="text-[10px] text-slate-500">Prof: {dep.teacherName} • Semestre {dep.semester}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                    Valor: R$ {dep.feeValue.toFixed(2)} ({dep.installmentsCount}x)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
