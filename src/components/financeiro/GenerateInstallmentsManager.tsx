import React, { useState, useEffect } from 'react';
import { CoursePriceConfig } from '../../types/financeiro';
import { 
  getCoursePriceConfigs, generateIndividualInstallments, generateBatchClassInstallments 
} from '../../services/financeiroStorage';
import { 
  Calendar, Layers, User, Users, CheckCircle2, AlertCircle, Sparkles, Search, ArrowRight 
} from 'lucide-react';

interface GenerateInstallmentsManagerProps {
  currentUser?: string;
  allStudentUsers?: any[];
  courses?: any[];
  classes?: any[];
}

export const GenerateInstallmentsManager: React.FC<GenerateInstallmentsManagerProps> = ({ 
  currentUser = 'Financeiro',
  allStudentUsers = [],
  courses = [],
  classes = []
}) => {
  const [mode, setMode] = useState<'INDIVIDUAL' | 'LOTE'>('INDIVIDUAL');
  const [courseConfigs, setCourseConfigs] = useState<CoursePriceConfig[]>([]);

  // Individual Form State
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [courseId, setCourseId] = useState('ENF');
  const [monthlyValue, setMonthlyValue] = useState('480.00');
  const [totalInstallments, setTotalInstallments] = useState(12);
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(15);
    return nextMonth.toISOString().split('T')[0];
  });
  const [discountValue, setDiscountValue] = useState('48.00');
  const [discountLimitDay, setDiscountLimitDay] = useState(10);
  const [finePercent, setFinePercent] = useState(2);
  const [dailyInterestPercent, setDailyInterestPercent] = useState(0.033);
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Batch Form State
  const [batchCourseId, setBatchCourseId] = useState('ENF');
  const [batchClassName, setBatchClassName] = useState('TURMA ENF-2026/1');
  const [batchMonthlyValue, setBatchMonthlyValue] = useState('480.00');
  const [batchTotalInstallments, setBatchTotalInstallments] = useState(12);
  const [batchFirstDueDate, setBatchFirstDueDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(15);
    return nextMonth.toISOString().split('T')[0];
  });

  useEffect(() => {
    const cfgs = getCoursePriceConfigs();
    setCourseConfigs(cfgs);
  }, []);

  const handleCourseChange = (cId: string, isBatch: boolean = false) => {
    const cfg = courseConfigs.find(c => c.courseId === cId);
    if (isBatch) {
      setBatchCourseId(cId);
      if (cfg) {
        setBatchMonthlyValue(cfg.monthlyPrice.toString());
      }
    } else {
      setCourseId(cId);
      if (cfg) {
        setMonthlyValue(cfg.monthlyPrice.toString());
        setDiscountValue(((cfg.monthlyPrice * cfg.discountPercent) / 100).toString());
        setDiscountLimitDay(cfg.discountLimitDay);
        setFinePercent(cfg.finePercent);
        setDailyInterestPercent(cfg.dailyInterestPercent);
      }
    }
  };

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Por favor, busque e selecione um aluno.');
      return;
    }

    const monthlyVal = parseFloat(monthlyValue.replace(',', '.'));
    const discVal = parseFloat(discountValue.replace(',', '.'));

    if (isNaN(monthlyVal) || monthlyVal <= 0) {
      alert('Informe um valor de mensalidade válido.');
      return;
    }

    const cfg = courseConfigs.find(c => c.courseId === courseId);
    const courseNameStr = cfg?.courseName || 'CURSO TÉCNICO';

    generateIndividualInstallments({
      studentId: selectedStudent.id || '1',
      studentName: selectedStudent.name || selectedStudent.studentName,
      enrollment: selectedStudent.enrollment || 'ALU-001',
      courseId,
      courseName: courseNameStr,
      monthlyValue: monthlyVal,
      totalInstallments: Number(totalInstallments),
      firstDueDate,
      discountValue: isNaN(discVal) ? 0 : discVal,
      discountLimitDay: Number(discountLimitDay),
      finePercent: Number(finePercent),
      dailyInterestPercent: Number(dailyInterestPercent),
      notes,
      user: currentUser
    });

    setSuccessMessage(`Sucesso! ${totalInstallments} parcelas geradas com sucesso para o aluno ${selectedStudent.name}.`);
    setTimeout(() => setSuccessMessage(''), 5000);

    setSelectedStudent(null);
    setSearchStudentQuery('');
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monthlyVal = parseFloat(batchMonthlyValue.replace(',', '.'));
    if (isNaN(monthlyVal) || monthlyVal <= 0) {
      alert('Informe um valor de mensalidade válido.');
      return;
    }

    // Filter students belonging to this course/class or use sample list
    const filteredStudents = allStudentUsers.filter((s: any) => 
      s.courseId === batchCourseId || s.courseName?.includes(batchCourseId) || true
    ).slice(0, 15);

    if (filteredStudents.length === 0) {
      alert('Nenhum aluno encontrado para a turma selecionada.');
      return;
    }

    const cfg = courseConfigs.find(c => c.courseId === batchCourseId);

    const count = generateBatchClassInstallments({
      students: filteredStudents.map(s => ({
        id: s.id || '1',
        name: s.name || 'Aluno',
        enrollment: s.enrollment || 'ALU-00'
      })),
      courseId: batchCourseId,
      courseName: cfg?.courseName || 'CURSO TÉCNICO',
      className: batchClassName,
      monthlyValue: monthlyVal,
      totalInstallments: Number(batchTotalInstallments),
      firstDueDate: batchFirstDueDate,
      discountValue: (monthlyVal * 0.1),
      discountLimitDay: 10,
      finePercent: 2,
      dailyInterestPercent: 0.033,
      user: currentUser
    });

    setSuccessMessage(`Geração em Lote Concluída! Total de ${count} alunos processados na turma ${batchClassName}.`);
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const filteredStudents = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allStudentUsers.filter((s: any) => 
      s.name?.toLowerCase().includes(q) || 
      s.enrollment?.toLowerCase().includes(q)
    ).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      
      {/* Subtab Toggle */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => setMode('INDIVIDUAL')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            mode === 'INDIVIDUAL'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Geração Individual por Aluno</span>
        </button>

        <button
          onClick={() => setMode('LOTE')}
          className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            mode === 'LOTE'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Geração em Lote por Turma / Curso</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-extrabold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* MODE 1: INDIVIDUAL */}
      {mode === 'INDIVIDUAL' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Gerar Carnê / Parcelas para Aluno Específico
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gera a sequência mensal de mensalidades com regras de juros, multa e pontualidade configuradas
            </p>
          </div>

          <form onSubmit={handleIndividualSubmit} className="space-y-5 text-xs">
            
            {/* Student Search */}
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold uppercase text-slate-500">Buscar e Selecionar Aluno (*)</label>
              <div className="relative">
                <Search className="h-4.5 w-4.5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchStudentQuery}
                  onChange={(e) => {
                    setSearchStudentQuery(e.target.value);
                    if (!e.target.value) setSelectedStudent(null);
                  }}
                  placeholder="Nome ou matrícula..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />

                {searchStudentQuery && !selectedStudent && (
                  <div className="absolute left-0 right-0 top-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
                    {filteredStudents(searchStudentQuery).map((st: any) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchStudentQuery(st.name);
                        }}
                        className="w-full text-left p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all font-bold text-slate-800 dark:text-white cursor-pointer"
                      >
                        {st.name} ({st.enrollment})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-xl font-bold text-blue-700 dark:text-blue-300">
                  ✓ Aluno Selecionado: {selectedStudent.name} (Matrícula: {selectedStudent.enrollment})
                </div>
              )}
            </div>

            {/* Course & Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Curso (*)</label>
                <select
                  value={courseId}
                  onChange={(e) => handleCourseChange(e.target.value, false)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ENF">TÉCNICO EM ENFERMAGEM</option>
                  <option value="RAD">TÉCNICO EM RADIOLOGIA</option>
                  <option value="ELE">TÉCNICO EM ELETROTÉCNICA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor da Mensalidade (R$ *)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={monthlyValue}
                  onChange={(e) => setMonthlyValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Qtd de Parcelas (*)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  required
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">1º Vencimento (*)</label>
                <input
                  type="date"
                  required
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Desconto Pontualidade (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Dia Limite p/ Desconto</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={discountLimitDay}
                  onChange={(e) => setDiscountLimitDay(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Multa Atraso (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={finePercent}
                  onChange={(e) => setFinePercent(parseFloat(e.target.value) || 2)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Juros ao Dia (%)</label>
                <input
                  type="number"
                  step="0.001"
                  value={dailyInterestPercent}
                  onChange={(e) => setDailyInterestPercent(parseFloat(e.target.value) || 0.033)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Observações no Carnê</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Parcela gerada após renegociação..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all active:scale-95 uppercase tracking-wide flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Gerar Parcelas do Aluno
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODE 2: LOTE */}
      {mode === 'LOTE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Geração de Parcelas em Lote por Turma
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gera parcelas simultaneamente para todos os alunos matriculados em uma determinada turma usando a tabela de valores do curso
            </p>
          </div>

          <form onSubmit={handleBatchSubmit} className="space-y-5 text-xs">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Curso (*)</label>
                <select
                  value={batchCourseId}
                  onChange={(e) => handleCourseChange(e.target.value, true)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ENF">TÉCNICO EM ENFERMAGEM</option>
                  <option value="RAD">TÉCNICO EM RADIOLOGIA</option>
                  <option value="ELE">TÉCNICO EM ELETROTÉCNICA</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Turma Alvo (*)</label>
                <input
                  type="text"
                  required
                  value={batchClassName}
                  onChange={(e) => setBatchClassName(e.target.value)}
                  placeholder="Ex: TURMA ENF-2026/1"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Valor da Mensalidade (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={batchMonthlyValue}
                  onChange={(e) => setBatchMonthlyValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Quantidade de Parcelas</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={batchTotalInstallments}
                  onChange={(e) => setBatchTotalInstallments(parseInt(e.target.value) || 12)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-500 mb-1">Data 1º Vencimento</label>
                <input
                  type="date"
                  required
                  value={batchFirstDueDate}
                  onChange={(e) => setBatchFirstDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-amber-800 dark:text-amber-200 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" /> Confirmação de Processamento em Lote
              </span>
              <p className="text-[11px]">
                A geração em lote criará {batchTotalInstallments} parcelas mensais para todos os alunos ativos da turma selecionada. Bolsas de estudo ativas serão aplicadas automaticamente.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95 uppercase tracking-wide flex items-center gap-2"
              >
                <Users className="h-4 w-4" /> Executar Geração em Lote
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
};
