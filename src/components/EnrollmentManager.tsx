import React, { useState, useEffect } from 'react';
import { escapeHtml } from '../../utils/security';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { StudentEnrollment, EnrollmentDocumentCheckitem } from '../../types/movimentacao';
import { getEnrollments, saveEnrollment, getOfficialTemplates } from '../../services/movimentacaoStorage';
import { generateStudentInstallments, getCoursePriceConfigs } from '../../services/financeiroStorage';
import { MovimentacaoDocumentPrintModal } from './MovimentacaoDocumentPrintModal';
import { 
  UserCheck, Search, FileText, CheckCircle2, ShieldCheck, Printer, 
  DollarSign, Clock, Calendar, Sparkles, Building2, AlertCircle, FileUp
} from 'lucide-react';

interface EnrollmentManagerProps {
  currentUser: string;
}

const DEFAULT_DOC_CHECKLIST: EnrollmentDocumentCheckitem[] = [
  { name: 'RG (Carteira de Identidade)', delivered: true, deliveredAt: new Date().toISOString() },
  { name: 'CPF', delivered: true, deliveredAt: new Date().toISOString() },
  { name: 'Título de Eleitor', delivered: false, deadlineDays: 40, notes: 'Apresentação pendente' },
  { name: 'Certidão de Nascimento / Casamento', delivered: true, deliveredAt: new Date().toISOString() },
  { name: 'Comprovante de Residência Atualizado', delivered: true, deliveredAt: new Date().toISOString() },
  { name: 'Foto 3x4 Recente', delivered: true, deliveredAt: new Date().toISOString() },
  { name: 'Certificado de Reservista (para homens)', delivered: false, deadlineDays: 40, notes: 'Apresentação pendente' },
];

export const EnrollmentManager: React.FC<EnrollmentManagerProps> = ({ currentUser }) => {
  const { users, courses, classes, currentPeriod } = useApp();
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [shift, setShift] = useState<'Manhã' | 'Tarde' | 'Noite' | 'EAD'>('Manhã');
  const [roomName, setRoomName] = useState<string>('Sala 101 - Bloco A');
  const [semester, setSemester] = useState<string>(currentPeriod || '2026/1');

  // Financial Plan Options
  const [enrollmentFee, setEnrollmentFee] = useState<number>(150);
  const [installmentsCount, setInstallmentsCount] = useState<number>(12);
  const [installmentValue, setInstallmentValue] = useState<number>(350);
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [specialConditions, setSpecialConditions] = useState<string>('');

  // Checklist state
  const [checklist, setChecklist] = useState<EnrollmentDocumentCheckitem[]>(DEFAULT_DOC_CHECKLIST);

  // Active Print Document Modal
  const [documentModal, setDocumentModal] = useState<{ title: string; subtitle?: string; contentHtml: string } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setEnrollments(getEnrollments());
    if (courses.length > 0) setSelectedCourseId(courses[0].id);
  }, [courses]);

  // Update default financial values when course changes
  useEffect(() => {
    if (selectedCourseId) {
      const priceConfigs = getCoursePriceConfigs();
      const course = courses.find(c => c.id === selectedCourseId);
      if (course) {
        const cfg = priceConfigs.find(p => p.courseName.toLowerCase() === course.name.toLowerCase());
        if (cfg) {
          setEnrollmentFee(cfg.enrollmentPrice || 150);
          setInstallmentsCount(cfg.maxInstallments || 12);
          setInstallmentValue(cfg.monthlyPrice || 350);
        }
      }
    }
  }, [selectedCourseId, courses]);

  // Available students (Role = UserRole.STUDENT)
  const availableStudents = users.filter(u => u.role === UserRole.STUDENT || (u as any).role === 'STUDENT' || (u as any).enrollment);

  const filteredStudents = availableStudents.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || (s.cpf && s.cpf.includes(term)) || (s.enrollment && s.enrollment.toLowerCase().includes(term));
  });

  const selectedStudent = availableStudents.find(s => s.id === selectedStudentId);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const filteredClasses = classes.filter(c => c.courseId === selectedCourseId);
  const selectedClassObj = classes.find(c => c.id === selectedClassId) || filteredClasses[0];

  const handleConfirmEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setNotification({ type: 'error', message: 'Selecione o aluno para efetuar a matrícula.' });
      return;
    }
    if (!selectedCourse) {
      setNotification({ type: 'error', message: 'Selecione o curso.' });
      return;
    }

    // Generate unique enrollment code
    const enrollCode = selectedStudent.enrollment || `2026.${semester.split('/')[1] || '1'}.${selectedCourse.name.substring(0, 3).toUpperCase()}.${Math.floor(100 + Math.random() * 900)}`;

    const newEnrollment: StudentEnrollment = {
      id: `enr_${Date.now()}`,
      enrollmentNumber: enrollCode,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      studentCpf: selectedStudent.cpf || '000.000.000-00',
      courseId: selectedCourse.id,
      courseName: selectedCourse.name,
      shift,
      classId: selectedClassObj?.id || 'class_default',
      className: selectedClassObj?.code || 'Turma A',
      roomName,
      semester,
      enrollmentDate: new Date().toISOString().substring(0, 10),
      status: 'ATIVA',
      financialPlan: {
        enrollmentFee,
        installmentsCount,
        installmentValue,
        discountPercent,
        specialConditions
      },
      documentsChecklist: checklist,
      cetranDeclarationGenerated: true,
      matriculaRequerimentoGenerated: true,
      createdAt: new Date().toISOString(),
      createdBy: currentUser
    };

    saveEnrollment(newEnrollment, currentUser);

    // Generate financial installments automatically in Financeiro module!
    const discountedMonthly = installmentValue * (1 - discountPercent / 100);
    const now = new Date();
    generateStudentInstallments({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      enrollment: enrollCode,
      courseName: selectedCourse.name,
      className: selectedClassObj?.code || 'Turma A',
      monthlyValue: discountedMonthly,
      totalInstallments: installmentsCount,
      firstDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString().substring(0, 10),
      user: currentUser,
      notes: `Matrícula oficial gerada em ${new Date().toLocaleDateString('pt-BR')}. Taxa Matrícula: R$ ${enrollmentFee.toFixed(2)}.`
    });

    setEnrollments(getEnrollments());
    setNotification({ type: 'success', message: `Matrícula #${enrollCode} confirmada com sucesso! Contrato e Documentos Prontos.` });

    // Open contract automatically
    handleGenerateContract(newEnrollment);
  };

  const handleGenerateContract = (enr: StudentEnrollment) => {
    const templates = getOfficialTemplates();
    const contractTpl = templates.find(t => t.docType === 'CONTRATO') || templates[0];

    const content = contractTpl.contentHtml
      .replace(/{NOME_ALUNO}/g, escapeHtml(enr.studentName))
      .replace(/{CPF}/g, escapeHtml(enr.studentCpf))
      .replace(/{MATRICULA}/g, escapeHtml(enr.enrollmentNumber))
      .replace(/{CURSO}/g, escapeHtml(enr.courseName))
      .replace(/{TURMA}/g, escapeHtml(enr.className))
      .replace(/{TURNO}/g, escapeHtml(enr.shift))
      .replace(/{VALOR_TOTAL}/g, (enr.financialPlan.installmentsCount * enr.financialPlan.installmentValue).toFixed(2))
      .replace(/{VALOR_MATRICULA}/g, enr.financialPlan.enrollmentFee.toFixed(2))
      .replace(/{NUMERO_PARCELAS}/g, enr.financialPlan.installmentsCount.toString())
      .replace(/{VALOR_PARCELA}/g, (enr.financialPlan.installmentValue * (1 - enr.financialPlan.discountPercent / 100)).toFixed(2));

    setDocumentModal({
      title: `Contrato de Prestação de Serviços - ${enr.studentName}`,
      subtitle: `Matrícula #${enr.enrollmentNumber} • ${enr.courseName}`,
      contentHtml: content
    });
  };

  const handleGenerateRequerimento = (enr: StudentEnrollment) => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center; color: #1e3a8a;">REQUERIMENTO DE MATRÍCULA OFICIAL</h2>
        <p style="text-align: center; font-[11px]; font-weight: bold;">Ano Letivo / Semestre: ${enr.semester}</p>
        <hr style="margin: 20px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr><td style="padding: 6px; font-weight: bold; width: 30%;">Nome do Aluno:</td><td style="padding: 6px;">${escapeHtml(enr.studentName)}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">CPF:</td><td style="padding: 6px;">${escapeHtml(enr.studentCpf)}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Número de Matrícula:</td><td style="padding: 6px; font-family: monospace; font-weight: bold;">${escapeHtml(enr.enrollmentNumber)}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Curso Escolhido:</td><td style="padding: 6px;">${escapeHtml(enr.courseName)}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Turma e Turno:</td><td style="padding: 6px;">${escapeHtml(enr.className)} (${escapeHtml(enr.shift)})</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Sala de Aula:</td><td style="padding: 6px;">${escapeHtml(enr.roomName || 'Sala Central')}</td></tr>
          <tr><td style="padding: 6px; font-weight: bold;">Data de Efetivação:</td><td style="padding: 6px;">${new Date(enr.enrollmentDate).toLocaleDateString('pt-BR')}</td></tr>
        </table>
        <div style="margin-top: 50px; text-align: center;">
          <p>____________________________________________________</p>
          <p style="font-size: 12px; font-weight: bold; margin-top: 5px;">Assinatura do Aluno(a) ou Responsável Legal</p>
        </div>
      </div>
    `;
    setDocumentModal({
      title: `Requerimento de Matrícula - ${enr.studentName}`,
      subtitle: `Matrícula #${enr.enrollmentNumber}`,
      contentHtml: html
    });
  };

  const handleGenerateCetran = (enr: StudentEnrollment) => {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; line-height: 1.8;">
        <h2 style="text-align: center; color: #0f172a; text-transform: uppercase;">DECLARAÇÃO CETRAN / PASSE ESTUDANTIL</h2>
        <p style="text-align: justify; margin-top: 30px;">
          A Direção Geral do Colégio e Instituto Técnico Oswaldo Cruz declara, para os devidos fins de direito e comprovação junto aos órgãos de transporte público e regulação (CETRAN/DER), que o(a) estudante <strong>${escapeHtml(enr.studentName)}</strong>, inscrito(a) no CPF sob nº <strong>${escapeHtml(enr.studentCpf)}</strong> e Matrícula nº <strong>${escapeHtml(enr.enrollmentNumber)}</strong>, encontra-se regularmente MATRICULADO(A) e FREQUENTANDO as aulas do curso de <strong>${escapeHtml(enr.courseName)}</strong>, Turma <strong>${escapeHtml(enr.className)}</strong>, no Turno <strong>${escapeHtml(enr.shift)}</strong>.
        </p>
        <p style="margin-top: 20px;">Por ser verdade, firmamos a presente declaração.</p>
        <div style="margin-top: 60px; text-align: center;">
          <p>____________________________________________________</p>
          <p style="font-size: 11px; font-weight: bold;">Secretaria Acadêmica • Carimbo e Assinatura</p>
        </div>
      </div>
    `;
    setDocumentModal({
      title: `Declaração CETRAN / Transporte - ${enr.studentName}`,
      subtitle: `Comprovante de Frequência e Matrícula`,
      contentHtml: html
    });
  };

  const handleToggleChecklist = (idx: number) => {
    const updated = [...checklist];
    updated[idx].delivered = !updated[idx].delivered;
    if (updated[idx].delivered) {
      updated[idx].deliveredAt = new Date().toISOString();
    } else {
      delete updated[idx].deliveredAt;
    }
    setChecklist(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <UserCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Módulo Oficial de Matrículas</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Geração automática de matrícula, plano financeiro, contratos e folhas de documentos.
              </p>
            </div>
          </div>

          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Integração Automática com Financeiro
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

      {/* Main Grid: Form vs History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" /> Nova Matrícula Acadêmica
            </h3>
          </div>

          <form onSubmit={handleConfirmEnrollment} className="space-y-5">
            
            {/* Step 1: Student Search */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                1. Pesquisar Aluno (Cadastrado no Sistema) *
              </label>
              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar aluno por Nome, CPF ou Matrícula..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">-- Selecione o Aluno Encontrado ({filteredStudents.length}) --</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.cpf || 'Sem CPF'}) - {s.enrollment || 'Novo'}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Academic Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                  Turma *
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  {filteredClasses.length === 0 ? (
                    <option value="">Turma Geral 2026.1</option>
                  ) : (
                    filteredClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} ({c.year}/{c.semester})</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Turno *
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                  <option value="EAD">EAD / A Distância</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sala de Aula
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Ex: Sala 101 - Bloco A"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"
                />
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

            {/* Step 3: Financial Setup */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Condições Financeiras da Matrícula (Geradas Automaticamente)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Taxa Matrícula (R$)
                  </label>
                  <input
                    type="number"
                    value={enrollmentFee}
                    onChange={(e) => setEnrollmentFee(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Nº de Parcelas
                  </label>
                  <input
                    type="number"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    value={installmentValue}
                    onChange={(e) => setInstallmentValue(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                    Desconto (%)
                  </label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Documents Checklist */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">
                4. Conferência de Documentos Exigidos (Prazo de 40 dias se pendente)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleToggleChecklist(idx)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                      item.delivered
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={item.delivered}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono">
                      {item.delivered ? '✔ Entregue' : '⚠ Pendente (40d)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="h-5 w-5" /> Confirmar Matrícula e Gerar Contrato / Documentos
              </button>
            </div>

          </form>
        </div>

        {/* Enrollments History Column */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Matrículas Confirmadas ({enrollments.length})
            </h3>
          </div>

          {enrollments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma matrícula efetuada recentemente.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {enrollments.map(enr => (
                <div
                  key={enr.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{enr.studentName}</h4>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                        Matrícula #{enr.enrollmentNumber}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px] rounded-full">
                      {enr.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {enr.courseName} • {enr.className} ({enr.shift})
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => handleGenerateContract(enr)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="h-3 w-3" /> Contrato PDF
                    </button>
                    <button
                      onClick={() => handleGenerateRequerimento(enr)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="h-3 w-3" /> Requerimento
                    </button>
                    <button
                      onClick={() => handleGenerateCetran(enr)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="h-3 w-3" /> CETRAN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Document Viewer Modal */}
      {documentModal && (
        <MovimentacaoDocumentPrintModal
          title={documentModal.title}
          subtitle={documentModal.subtitle}
          contentHtml={documentModal.contentHtml}
          onClose={() => setDocumentModal(null)}
        />
      )}

    </div>
  );
};
