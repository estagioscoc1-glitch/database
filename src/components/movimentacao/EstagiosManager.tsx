import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  StageVacancy, StageEvaluationSheet, TeacherStageReceipt,
  StageDefinition, StageField, StageTeacher, StageCronograma 
} from '../../types/movimentacao';
import { 
  getStageVacancies, saveStageVacancy, removeStageVacancy, saveStageEvaluation, 
  getStageEvaluations, getTeacherReceipts, saveTeacherReceipt,
  getStageDefinitions, saveStageDefinition, removeStageDefinition,
  getStageFields, saveStageField, removeStageField,
  getStageTeachers, saveStageTeacher, removeStageTeacher,
  getStageCronogramas, saveStageCronograma, removeStageCronograma
} from '../../services/movimentacaoStorage';
import { MovimentacaoDocumentPrintModal } from './MovimentacaoDocumentPrintModal';
import { 
  Briefcase, Plus, CheckCircle2, FileText, Printer, Link as LinkIcon, 
  Award, UserCheck, Search, Building2, Calendar, Clock, Sparkles, ExternalLink, ShieldCheck,
  Trash2, Edit3, X, User, MapPin, DollarSign, BookOpen, AlertCircle, Layers
} from 'lucide-react';

interface EstagiosManagerProps {
  currentUser: string;
}

export const EstagiosManager: React.FC<EstagiosManagerProps> = ({ currentUser }) => {
  const { users, classes, courses } = useApp();
  
  // Storage Lists
  const [stageDefinitions, setStageDefinitions] = useState<StageDefinition[]>([]);
  const [fields, setFields] = useState<StageField[]>([]);
  const [stageTeachers, setStageTeachers] = useState<StageTeacher[]>([]);
  const [cronogramas, setCronogramas] = useState<StageCronograma[]>([]);
  const [vacancies, setVacancies] = useState<StageVacancy[]>([]);
  const [evaluations, setEvaluations] = useState<StageEvaluationSheet[]>([]);
  const [receipts, setReceipts] = useState<TeacherStageReceipt[]>([]);

  // Active Subtab
  const [activeSubTab, setActiveTab] = useState<
    'DEFINICOES' | 'CAMPOS' | 'PROFESSORES' | 'CRONOGRAMA' | 'VAGAS' | 'LANCAMENTO_NOTAS' | 'RECIBOS'
  >('VAGAS');

  // Selecteds
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // 1. Form Disciplina de Estágio (StageDefinition)
  const [defStageName, setDefStageName] = useState<string>('');
  const [defCourseId, setDefCourseId] = useState<string>('');
  const [defWorkloadHours, setDefWorkloadHours] = useState<number>(120);
  const [defMinPassingGrade, setDefMinPassingGrade] = useState<number>(60);
  const [defStudentPrice, setDefStudentPrice] = useState<number>(150);
  const [defTeacherPayRate, setDefTeacherPayRate] = useState<number>(45);
  const [defDescription, setDefDescription] = useState<string>('');

  // 2. Form Campo de Estágio (StageField)
  const [fldCompanyName, setFldCompanyName] = useState<string>('');
  const [fldCnpj, setFldCnpj] = useState<string>('');
  const [fldAddress, setFldAddress] = useState<string>('');
  const [fldSector, setFldSector] = useState<string>('');
  const [fldSupervisorName, setFldSupervisorName] = useState<string>('');
  const [fldPhone, setFldPhone] = useState<string>('');
  const [fldEmail, setFldEmail] = useState<string>('');
  const [fldMaxCapacity, setFldMaxCapacity] = useState<number>(20);

  // 3. Form Professor de Estágio (StageTeacher)
  const [tchName, setTchName] = useState<string>('');
  const [tchCouncilNumber, setTchCouncilNumber] = useState<string>('');
  const [tchEmail, setTchEmail] = useState<string>('');
  const [tchPhone, setTchPhone] = useState<string>('');
  const [tchSpecialty, setTchSpecialty] = useState<string>('');
  const [tchPixKey, setTchPixKey] = useState<string>('');

  // 4. Form Cronograma (StageCronograma)
  const [croTitle, setCroTitle] = useState<string>('');
  const [croCourseName, setCroCourseName] = useState<string>('Técnico em Enfermagem');
  const [croStageName, setCroStageName] = useState<string>('Estágio Supervisão Hospitalar I');
  const [croClassName, setCroClassName] = useState<string>('Turma ENF-2026-A');
  const [croCompanyName, setCroCompanyName] = useState<string>('');
  const [croReleaseDate, setCroReleaseDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [croStartDate, setCroStartDate] = useState<string>('');
  const [croEndDate, setCroEndDate] = useState<string>('');
  const [croShift, setCroShift] = useState<'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL'>('MANHA');
  const [croVacanciesCount, setCroVacanciesCount] = useState<number>(15);
  const [croStatus, setCroStatus] = useState<StageCronograma['status']>('LIBERADO');
  const [croObservations, setCroObservations] = useState<string>('');

  // 5. Form Vaga de Estágio (StageVacancy)
  const [vacFieldId, setVacFieldId] = useState<string>('');
  const [vacTeacherId, setVacTeacherId] = useState<string>('');
  const [vacCourseId, setVacCourseId] = useState<string>('');
  const [vacDefinitionId, setVacDefinitionId] = useState<string>('');
  const [vacSelectedClassIds, setVacSelectedClassIds] = useState<string[]>([]);
  const [vacScheduleDays, setVacScheduleDays] = useState<string>('Segunda e Quarta - 07:00 às 12:00');
  const [vacStartDate, setVacStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [vacEndDate, setVacEndDate] = useState<string>(new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10));
  const [vacMaxStudents, setVacMaxStudents] = useState<number>(15);
  const [vacTotalHours, setVacTotalHours] = useState<number>(120);
  const [vacHourlyRate, setVacHourlyRate] = useState<number>(25.00);

  // 6. Form Avaliação / Lançamento de Notas
  const [evalTechGrade, setEvalTechGrade] = useState<number>(10);
  const [evalEthicsGrade, setEvalEthicsGrade] = useState<number>(10);
  const [evalPunctualityGrade, setEvalPunctualityGrade] = useState<number>(10);
  const [evalReportGrade, setEvalReportGrade] = useState<number>(10);
  const [evalTotalAbsences, setEvalTotalAbsences] = useState<number>(0);
  const [evalFeedback, setEvalFeedback] = useState<string>('Excelente postura profissional e bom desempenho técnico.');

  // Print Modal
  const [printModal, setPrintModal] = useState<{ title: string; contentHtml: string } | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = () => {
    const defs = getStageDefinitions();
    const flds = getStageFields();
    const tchs = getStageTeachers();
    const cros = getStageCronogramas();
    const vacs = getStageVacancies();
    const evals = getStageEvaluations();
    const recs = getTeacherReceipts();

    setStageDefinitions(defs || []);
    setFields(flds || []);
    setStageTeachers(tchs || []);
    setCronogramas(cros || []);
    setVacancies(vacs || []);
    setEvaluations(evals || []);
    setReceipts(recs || []);

    if (vacs && vacs.length > 0 && !selectedVacancyId) {
      setSelectedVacancyId(vacs[0].id);
    }
  };

  const selectedVacancy = (vacancies || []).find(v => v.id === selectedVacancyId) || vacancies[0];

  const currentVacancyStudents = selectedVacancy?.studentsAllocated || [];

  // 1. Cadastrar Disciplina de Estágio
  const handleCreateDefinition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defStageName.trim()) {
      setNotification({ type: 'error', message: 'Informe o nome da disciplina de estágio.' });
      return;
    }

    const selectedCourse = (courses || []).find(c => c.id === defCourseId);

    const newDef: StageDefinition = {
      id: `stg_def_${Date.now()}`,
      courseId: defCourseId || 'c1',
      courseName: selectedCourse?.name || 'Técnico em Enfermagem',
      stageName: defStageName.trim(),
      workloadHours: Number(defWorkloadHours) || 120,
      description: defDescription || 'Acompanhamento prático supervisionado em campo.',
      minPassingGrade: Number(defMinPassingGrade) || 60,
      maxGrade: 100,
      studentPrice: Number(defStudentPrice) || 150,
      teacherPayRate: Number(defTeacherPayRate) || 45,
      paymentMethodInfo: 'Cobrança via boleto/Pix na matrícula do estágio.',
      createdAt: new Date().toISOString()
    };

    saveStageDefinition(newDef);
    refreshAllData();
    setDefStageName('');
    setDefDescription('');
    setNotification({ type: 'success', message: 'Módulo / Disciplina de Estágio cadastrada com sucesso!' });
  };

  // 2. Cadastrar Campo de Estágio
  const handleCreateField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fldCompanyName.trim()) {
      setNotification({ type: 'error', message: 'Informe o nome da instituição / hospital.' });
      return;
    }

    const newFld: StageField = {
      id: `fld_${Date.now()}`,
      companyName: fldCompanyName.trim(),
      cnpj: fldCnpj.trim(),
      address: fldAddress.trim(),
      sector: fldSector.trim() || 'Geral',
      supervisorName: fldSupervisorName.trim(),
      phone: fldPhone.trim(),
      email: fldEmail.trim(),
      maxCapacity: Number(fldMaxCapacity) || 20,
      status: 'ATIVO',
      createdAt: new Date().toISOString()
    };

    saveStageField(newFld);
    refreshAllData();
    setFldCompanyName('');
    setFldCnpj('');
    setFldAddress('');
    setFldSupervisorName('');
    setNotification({ type: 'success', message: 'Campo de Estágio (Hospital/Clínica) cadastrado com sucesso!' });
  };

  // 3. Cadastrar Professor de Estágio
  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tchName.trim() || !tchCouncilNumber.trim()) {
      setNotification({ type: 'error', message: 'Informe o nome e o número de registro no Conselho (COREN/COFFITO/etc).' });
      return;
    }

    const newTch: StageTeacher = {
      id: `tch_${Date.now()}`,
      name: tchName.trim(),
      councilNumber: tchCouncilNumber.trim(),
      email: tchEmail.trim(),
      phone: tchPhone.trim(),
      specialty: tchSpecialty.trim() || 'Enfermagem Geral',
      pixKey: tchPixKey.trim(),
      status: 'ATIVO',
      createdAt: new Date().toISOString()
    };

    saveStageTeacher(newTch);
    refreshAllData();
    setTchName('');
    setTchCouncilNumber('');
    setTchEmail('');
    setTchPhone('');
    setNotification({ type: 'success', message: 'Professor / Preceptor de Estágio cadastrado!' });
  };

  // 4. Cadastrar Cronograma
  const handleCreateCronograma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!croTitle.trim()) {
      setNotification({ type: 'error', message: 'Informe o título do cronograma.' });
      return;
    }

    const newCro: StageCronograma = {
      id: `crono_${Date.now()}`,
      title: croTitle.trim(),
      courseName: croCourseName,
      stageName: croStageName,
      className: croClassName,
      companyName: croCompanyName || 'Hospital Parceiro',
      releaseDate: croReleaseDate,
      startDate: croStartDate || new Date().toISOString().substring(0, 10),
      endDate: croEndDate || new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10),
      shift: croShift,
      vacanciesCount: Number(croVacanciesCount) || 15,
      status: croStatus,
      observations: croObservations,
      createdAt: new Date().toISOString()
    };

    saveStageCronograma(newCro);
    refreshAllData();
    setCroTitle('');
    setCroObservations('');
    setNotification({ type: 'success', message: 'Cronograma de datas de liberação publicado aos alunos!' });
  };

  // 5. Cadastrar Vaga de Estágio
  const handleCreateVacancy = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vacFieldId) {
      setNotification({ type: 'error', message: 'Selecione o Campo de Estágio (Hospital/Clínica).' });
      return;
    }
    if (!vacTeacherId) {
      setNotification({ type: 'error', message: 'Selecione o Professor Orientador / Preceptor.' });
      return;
    }
    if (!vacCourseId) {
      setNotification({ type: 'error', message: 'Selecione o Curso do estágio.' });
      return;
    }
    if (!vacDefinitionId) {
      setNotification({ type: 'error', message: 'Selecione a Disciplina / Módulo de Estágio.' });
      return;
    }
    if (vacSelectedClassIds.length === 0) {
      setNotification({ type: 'error', message: 'Selecione ao menos uma Turma Vinculada.' });
      return;
    }

    const selectedField = (fields || []).find(f => f.id === vacFieldId);
    const selectedTeacher = (stageTeachers || []).find(t => t.id === vacTeacherId);
    const selectedDef = (stageDefinitions || []).find(d => d.id === vacDefinitionId);
    const selectedCourse = (courses || []).find(c => c.id === vacCourseId);
    const selectedClasses = (classes || []).filter(c => vacSelectedClassIds.includes(c.id));

    const classNamesJoined = selectedClasses.map(c => c.name || c.code).join(', ');

    const newVac: StageVacancy = {
      id: `vac_${Date.now()}`,
      vacancyNumber: `Vaga #${(vacancies || []).length + 1}`,
      companyName: selectedField?.companyName || '',
      sector: selectedField?.sector || '',
      supervisorName: selectedField?.supervisorName || '',
      teacherId: selectedTeacher?.id || '',
      teacherName: selectedTeacher?.name || '',
      teacherCouncilNumber: selectedTeacher?.councilNumber || '',
      courseId: selectedCourse?.id || selectedDef?.courseId || '',
      courseName: selectedCourse?.name || selectedDef?.courseName || '',
      stageId: selectedDef?.id || '',
      stageName: selectedDef?.stageName || '',
      classId: vacSelectedClassIds[0],
      className: classNamesJoined || 'Turmas Selecionadas',
      maxStudents: Number(vacMaxStudents) || 15,
      startDate: vacStartDate || new Date().toISOString().substring(0, 10),
      endDate: vacEndDate || new Date(Date.now() + 60 * 86400000).toISOString().substring(0, 10),
      scheduleDaysTime: vacScheduleDays,
      totalHours: Number(selectedDef?.workloadHours) || Number(vacTotalHours) || 120,
      hourlyRate: Number(selectedDef?.teacherPayRate) || Number(vacHourlyRate) || 25.00,
      studentsAllocated: [],
      accessLinkCode: `stg_token_${Math.random().toString(36).substring(2, 8)}`,
      status: 'EM_ANDAMENTO',
      createdAt: new Date().toISOString()
    };

    saveStageVacancy(newVac, currentUser);
    refreshAllData();
    setSelectedVacancyId(newVac.id);
    setVacSelectedClassIds([]);
    setNotification({ type: 'success', message: 'Vaga de estágio cadastrada e turmas vinculadas com sucesso!' });
  };

  // 6. Lançamento de Notas / Ficha de Avaliação
  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVacancy) {
      setNotification({ type: 'error', message: 'Selecione a vaga/turma de estágio.' });
      return;
    }

    const student = (currentVacancyStudents || []).find(s => s.studentId === selectedStudentId) || currentVacancyStudents[0];
    if (!student) {
      setNotification({ type: 'error', message: 'Selecione o aluno para lançar as notas.' });
      return;
    }

    const finalGrade = (Number(evalTechGrade) + Number(evalEthicsGrade) + Number(evalPunctualityGrade) + Number(evalReportGrade)) / 4;

    const evalSheet: StageEvaluationSheet = {
      id: `eval_${selectedVacancy.id}_${student.studentId}`,
      vacancyId: selectedVacancy.id,
      studentId: student.studentId,
      studentName: student.studentName,
      teacherName: selectedVacancy.teacherName,
      companyName: selectedVacancy.companyName,
      technicalGrade: Number(evalTechGrade),
      ethicsGrade: Number(evalEthicsGrade),
      punctualityGrade: Number(evalPunctualityGrade),
      reportGrade: Number(evalReportGrade),
      finalGrade,
      totalAbsences: Number(evalTotalAbsences),
      completedHours: selectedVacancy.totalHours || 120,
      supervisorFeedback: evalFeedback,
      status: finalGrade >= 7 ? 'APROVADO' : 'REPROVADO',
      evaluatedAt: new Date().toISOString()
    };

    saveStageEvaluation(evalSheet, currentUser);
    refreshAllData();
    setNotification({ type: 'success', message: `Notas de estágio do aluno ${student.studentName} registradas! Média Final: ${finalGrade.toFixed(1)}.` });
  };

  return (
    <div className="space-y-6">
      
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <Briefcase className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Gestão Integrada de Estágios Supervisionados</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Cadastre campos de estágio, professores, cronograma de liberação, vagas, fichas de avaliação e recibos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Notificação */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {notification.message}
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Sub-navegação das Telas de Estágio */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('VAGAS')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'VAGAS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <Briefcase className="h-4 w-4" /> Vagas e Alocação
        </button>

        <button
          onClick={() => setActiveTab('CAMPOS')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'CAMPOS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <Building2 className="h-4 w-4" /> Campos de Estágio ({fields.length})
        </button>

        <button
          onClick={() => setActiveTab('PROFESSORES')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'PROFESSORES'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <UserCheck className="h-4 w-4" /> Professores / Preceptores ({stageTeachers.length})
        </button>

        <button
          onClick={() => setActiveTab('CRONOGRAMA')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'CRONOGRAMA'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <Calendar className="h-4 w-4" /> Cronograma de Datas ({cronogramas.length})
        </button>

        <button
          onClick={() => setActiveTab('DEFINICOES')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'DEFINICOES'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Módulos / Disciplinas ({stageDefinitions.length})
        </button>

        <button
          onClick={() => setActiveTab('LANCAMENTO_NOTAS')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'LANCAMENTO_NOTAS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <Award className="h-4 w-4" /> Lançamento de Notas
        </button>

        <button
          onClick={() => setActiveTab('RECIBOS')}
          className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'RECIBOS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400'
          }`}
        >
          <FileText className="h-4 w-4" /> Recibos do Professor
        </button>
      </div>

      {/* TAB 1: CADASTRO DE MÓDULOS/DISCIPLINAS DE ESTÁGIO */}
      {activeSubTab === 'DEFINICOES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateDefinition} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" /> Cadastrar Disciplina de Estágio
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Disciplina / Estágio *</label>
              <input
                type="text"
                required
                placeholder="Ex: Estágio Supervisão Hospitalar I"
                value={defStageName}
                onChange={(e) => setDefStageName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Curso Vinculado *</label>
              <select
                value={defCourseId}
                onChange={(e) => setDefCourseId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">Selecione o Curso...</option>
                {(courses || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Carga Horária (h) *</label>
                <input
                  type="number"
                  required
                  value={defWorkloadHours}
                  onChange={(e) => setDefWorkloadHours(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Média Mínima *</label>
                <input
                  type="number"
                  required
                  value={defMinPassingGrade}
                  onChange={(e) => setDefMinPassingGrade(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Aluno (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={defStudentPrice}
                  onChange={(e) => setDefStudentPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Docente (R$/h)</label>
                <input
                  type="number"
                  step="0.01"
                  value={defTeacherPayRate}
                  onChange={(e) => setDefTeacherPayRate(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição do Módulo</label>
              <textarea
                rows={3}
                value={defDescription}
                onChange={(e) => setDefDescription(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Salvar Disciplina de Estágio
            </button>
          </form>

          {/* List Stage Definitions */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Disciplinas e Módulos Cadastrados
            </h3>
            <div className="space-y-3">
              {(stageDefinitions || []).map(def => (
                <div key={def.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-black text-sm text-slate-900 dark:text-white">{def.stageName}</div>
                      <button
                        onClick={() => {
                          removeStageDefinition(def.id);
                          refreshAllData();
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Excluir Disciplina de Estágio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                      {def.courseName} • Carga Horária: {def.workloadHours}h • Média Mínima: {def.minPassingGrade}
                    </div>
                    <p className="text-xs text-slate-500 italic">{def.description}</p>
                  </div>
                  <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    <div>Taxa Aluno: <span className="text-emerald-600 font-black">R$ {def.studentPrice?.toFixed(2)}</span></div>
                    <div>Hora Docente: <span className="text-blue-600 font-black">R$ {def.teacherPayRate?.toFixed(2)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CADASTRO DE CAMPOS DE ESTÁGIO (HOSPITAIS/CLÍNICAS) */}
      {activeSubTab === 'CAMPOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateField} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" /> Cadastrar Campo de Estágio (Hospital / Clínica)
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Instituição / Hospital *</label>
              <input
                type="text"
                required
                placeholder="Ex: Hospital Geral Oswaldo Cruz"
                value={fldCompanyName}
                onChange={(e) => setFldCompanyName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={fldCnpj}
                  onChange={(e) => setFldCnpj(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Capacidade (Alunos)</label>
                <input
                  type="number"
                  value={fldMaxCapacity}
                  onChange={(e) => setFldMaxCapacity(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Setor / Ala de Atuação</label>
              <input
                type="text"
                placeholder="Ex: UTI, Pró-Socorro, Vacinação, Maternidade"
                value={fldSector}
                onChange={(e) => setFldSector(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
              <input
                type="text"
                placeholder="Rua / Av., Número, Bairro, Cidade"
                value={fldAddress}
                onChange={(e) => setFldAddress(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Supervisor Local</label>
                <input
                  type="text"
                  placeholder="Enf. Chefe / Responsável"
                  value={fldSupervisorName}
                  onChange={(e) => setFldSupervisorName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone Contato</label>
                <input
                  type="text"
                  placeholder="(83) 90000-0000"
                  value={fldPhone}
                  onChange={(e) => setFldPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Salvar Campo de Estágio
            </button>
          </form>

          {/* List Fields */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Campos de Estágio Cadastrados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(fields || []).map(fld => (
                <div key={fld.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 relative">
                  <div className="flex justify-between items-start">
                    <div className="font-black text-sm text-slate-900 dark:text-white">{fld.companyName}</div>
                    <button
                      onClick={() => {
                        removeStageField(fld.id);
                        refreshAllData();
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Excluir Campo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {fld.sector && <div className="font-bold text-blue-600">Setor: {fld.sector}</div>}
                    {fld.address && <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {fld.address}</div>}
                    {fld.supervisorName && <div>Supervisor: <strong>{fld.supervisorName}</strong></div>}
                    {fld.phone && <div>Tel: {fld.phone}</div>}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] font-bold">
                    <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">Capacidade: {fld.maxCapacity || 20} vagas</span>
                    <span className="text-slate-500">{fld.cnpj || 'CNPJ não informado'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CADASTRO DE PROFESSORES / PRECEPTORES DE ESTÁGIO */}
      {activeSubTab === 'PROFESSORES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateTeacher} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" /> Cadastrar Professor / Preceptor
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo do Docente *</label>
              <input
                type="text"
                required
                placeholder="Ex: Prof. Carlos Eduardo Silva"
                value={tchName}
                onChange={(e) => setTchName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Registro no Conselho (COREN/COFFITO/CRM/etc) *</label>
              <input
                type="text"
                required
                placeholder="Ex: COREN-PB 184.920"
                value={tchCouncilNumber}
                onChange={(e) => setTchCouncilNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="professor@oswaldocruz.edu.br"
                  value={tchEmail}
                  onChange={(e) => setTchEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  placeholder="(83) 98888-0000"
                  value={tchPhone}
                  onChange={(e) => setTchPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Especialidade / Área de Supervisão</label>
              <input
                type="text"
                placeholder="Ex: Enfermagem em UTI e Emergência"
                value={tchSpecialty}
                onChange={(e) => setTchSpecialty(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Chave PIX (para Pagamentos/Recibos)</label>
              <input
                type="text"
                placeholder="CPF / E-mail / Telefone"
                value={tchPixKey}
                onChange={(e) => setTchPixKey(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Salvar Professor
            </button>
          </form>

          {/* List Teachers */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Professores de Estágio Cadastrados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(stageTeachers || []).map(tch => (
                <div key={tch.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 relative">
                  <div className="flex justify-between items-start">
                    <div className="font-black text-sm text-slate-900 dark:text-white">{tch.name}</div>
                    <button
                      onClick={() => {
                        removeStageTeacher(tch.id);
                        refreshAllData();
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Excluir Professor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="font-extrabold text-blue-600">{tch.councilNumber}</div>
                    {tch.specialty && <div>Especialidade: {tch.specialty}</div>}
                    {tch.phone && <div>Tel: {tch.phone}</div>}
                    {tch.email && <div>Email: {tch.email}</div>}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500">
                    Chave PIX: {tch.pixKey || 'Não cadastrado'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CRONOGRAMA DE DATAS PARA OS ALUNOS */}
      {activeSubTab === 'CRONOGRAMA' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateCronograma} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Cadastrar Cronograma de Liberação
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Título do Cronograma *</label>
              <input
                type="text"
                required
                placeholder="Ex: Liberação de Vagas de Estágio Hospitalar - 2026.2"
                value={croTitle}
                onChange={(e) => setCroTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Curso</label>
                <input
                  type="text"
                  value={croCourseName}
                  onChange={(e) => setCroCourseName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Turma Target</label>
                <input
                  type="text"
                  value={croClassName}
                  onChange={(e) => setCroClassName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Campo de Estágio / Hospital</label>
              <select
                value={croCompanyName}
                onChange={(e) => setCroCompanyName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">Selecione o Hospital...</option>
                {(fields || []).map(f => (
                  <option key={f.id} value={f.companyName}>{f.companyName}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Liberação *</label>
                <input
                  type="date"
                  required
                  value={croReleaseDate}
                  onChange={(e) => setCroReleaseDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Turno</label>
                <select
                  value={croShift}
                  onChange={(e) => setCroShift(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="MANHA">Manhã</option>
                  <option value="TARDE">Tarde</option>
                  <option value="NOITE">Noite</option>
                  <option value="INTEGRAL">Integral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
                <input
                  type="date"
                  value={croStartDate}
                  onChange={(e) => setCroStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Término</label>
                <input
                  type="date"
                  value={croEndDate}
                  onChange={(e) => setCroEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status de Liberação</label>
              <select
                value={croStatus}
                onChange={(e) => setCroStatus(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="AGUARDANDO_LIBERACAO">Aguardando Liberação</option>
                <option value="LIBERADO">Liberado para Escolha de Vagas</option>
                <option value="EM_ANDAMENTO">Estágios Em Andamento</option>
                <option value="FINALIZADO">Finalizado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Observações para os Alunos</label>
              <textarea
                rows={3}
                value={croObservations}
                onChange={(e) => setCroObservations(e.target.value)}
                placeholder="Ex: Escolha mediante quitação de taxa de estágio e atestado de vacinação ok."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              Publicar Cronograma
            </button>
          </form>

          {/* List Cronogramas */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Cronogramas de Liberação Ativos
            </h3>
            <div className="space-y-3">
              {(cronogramas || []).map(cro => (
                <div key={cro.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{cro.title}</div>
                      <div className="text-xs text-blue-600 font-bold">{cro.courseName} • {cro.className}</div>
                    </div>
                    <button
                      onClick={() => {
                        removeStageCronograma(cro.id);
                        refreshAllData();
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Excluir Cronograma"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-bold p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Data Liberação:</span>
                      <span className="text-emerald-600 font-black">{cro.releaseDate ? new Date(cro.releaseDate).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Período:</span>
                      <span className="text-slate-800 dark:text-slate-200">{cro.startDate ? new Date(cro.startDate).toLocaleDateString('pt-BR') : '-'} até {cro.endDate ? new Date(cro.endDate).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Turno / Vagas:</span>
                      <span className="text-slate-800 dark:text-slate-200">{cro.shift} ({cro.vacanciesCount} vagas)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        cro.status === 'LIBERADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {cro.status}
                      </span>
                    </div>
                  </div>

                  {cro.observations && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 italic bg-blue-50/50 dark:bg-slate-800/50 p-3 rounded-xl">
                      "{cro.observations}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: VAGAS E ALOCAÇÃO */}
      {activeSubTab === 'VAGAS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleCreateVacancy} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" /> Alocar Nova Vaga de Estágio
            </h3>

            {/* 1. Campo de Estágio (Hospital) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Campo de Estágio (Hospital / Clínica) *</label>
              <select
                value={vacFieldId}
                onChange={(e) => setVacFieldId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">Selecione o Campo de Estágio...</option>
                {(fields || []).map(f => (
                  <option key={f.id} value={f.id}>{f.companyName} - {f.sector}</option>
                ))}
              </select>
            </div>

            {/* 2. Professor Orientador */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Professor Orientador / Preceptor *</label>
              <select
                value={vacTeacherId}
                onChange={(e) => setVacTeacherId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">Selecione o Docente...</option>
                {(stageTeachers || []).map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.councilNumber})</option>
                ))}
              </select>
            </div>

            {/* 3. Escolher Curso */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Curso do Estágio *</label>
              <select
                value={vacCourseId}
                onChange={(e) => {
                  setVacCourseId(e.target.value);
                  setVacDefinitionId('');
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">Selecione o Curso...</option>
                {(courses || []).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 4. Disciplina / Módulo de Estágio (Filtrado pelo Curso Escolhido) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Disciplina / Módulo do Estágio *</label>
              <select
                value={vacDefinitionId}
                onChange={(e) => setVacDefinitionId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">Selecione o Módulo de Estágio...</option>
                {(stageDefinitions || [])
                  .filter(d => !vacCourseId || d.courseId === vacCourseId)
                  .map(d => (
                    <option key={d.id} value={d.id}>
                      {d.stageName} ({d.workloadHours}h) - {d.courseName}
                    </option>
                  ))}
              </select>

              {/* Badges de Carga Horária e Detalhes */}
              {(() => {
                const selectedDef = stageDefinitions.find(d => d.id === vacDefinitionId);
                if (!selectedDef) return null;
                return (
                  <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-1 text-blue-900 dark:text-blue-200 font-bold">
                    <div className="flex justify-between items-center">
                      <span>Carga Horária: <strong className="text-blue-700 dark:text-blue-300 font-black">{selectedDef.workloadHours}h</strong></span>
                      <span>Média Mínima: <strong>{selectedDef.minPassingGrade}</strong></span>
                    </div>
                    {selectedDef.studentPrice > 0 && (
                      <div className="text-[11px] text-emerald-600 font-black">
                        Taxa do Estágio: R$ {selectedDef.studentPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 5. Turmas Vinculadas (Multi-seleção de Várias Turmas) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Turmas Vinculadas (Pode selecionar várias) *
              </label>
              <div className="max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl space-y-1.5">
                {(classes || [])
                  .filter(c => !vacCourseId || c.courseId === vacCourseId)
                  .map(cls => {
                    const isChecked = vacSelectedClassIds.includes(cls.id);
                    return (
                      <label key={cls.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        isChecked ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVacSelectedClassIds(prev => [...prev, cls.id]);
                            } else {
                              setVacSelectedClassIds(prev => prev.filter(id => id !== cls.id));
                            }
                          }}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                        <span>{cls.name || cls.code}</span>
                      </label>
                    );
                  })}
              </div>
              {vacSelectedClassIds.length > 0 && (
                <div className="mt-1.5 text-[11px] font-black text-blue-600">
                  {vacSelectedClassIds.length} turma(s) selecionada(s)
                </div>
              )}
            </div>

            {/* 6. Escala e Horários */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Escala e Horários de Estágio *
              </label>
              
              {/* Presets de Horários Prontos */}
              <div className="mb-2 flex flex-wrap gap-1">
                {[
                  'Segunda e Quarta - 07:00 às 12:00',
                  'Terça e Quinta - 13:00 às 18:00',
                  'Sexta e Sábado - 07:00 às 17:00',
                  'Sábado e Domingo - 07:00 às 17:00',
                  'Plantão 12x36 Diurno (07:00 - 19:00)',
                  'Plantão 12x36 Noturno (19:00 - 07:00)',
                  'Segunda a Sexta - 08:00 às 12:00'
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setVacScheduleDays(preset)}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-700 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    + {preset.split(' - ')[0]}
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                placeholder="Ex: Segunda e Quarta - 07:00 às 12:00"
                value={vacScheduleDays}
                onChange={(e) => setVacScheduleDays(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            {/* 7. Datas do Estágio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Início *</label>
                <input
                  type="date"
                  required
                  value={vacStartDate}
                  onChange={(e) => setVacStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Término *</label>
                <input
                  type="date"
                  required
                  value={vacEndDate}
                  onChange={(e) => setVacEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* 8. Quantitativo de Alunos */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantitativo Máximo de Alunos *
              </label>
              <input
                type="number"
                required
                min={1}
                max={100}
                value={vacMaxStudents}
                onChange={(e) => setVacMaxStudents(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Criar Vaga e Alocar Alunos
            </button>
          </form>

          {/* List Vacancies */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Vagas e Estágios em Andamento
            </h3>
            <div className="space-y-4">
              {(vacancies || []).map(vac => (
                <div key={vac.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">
                        {vac.stageName || vac.companyName || 'Estágio Supervisionado'}
                      </div>
                      <p className="text-xs text-blue-600 font-bold">
                        {vac.companyName} • Setor: {vac.sector}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-xs rounded-full">
                        {(vac.studentsAllocated || []).length} / {vac.maxStudents || 15} Alunos
                      </span>
                      <button
                        onClick={() => {
                          removeStageVacancy(vac.id);
                          refreshAllData();
                          setNotification({ type: 'success', message: 'Vaga de estágio removida.' });
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                        title="Excluir Vaga"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div>Docente Orientador: <strong className="text-blue-600">{vac.teacherName}</strong> ({vac.teacherCouncilNumber || 'COREN'})</div>
                    <div>Curso / Módulo: <strong>{vac.courseName || 'Enfermagem'}</strong> • Carga Horária: <strong className="text-emerald-600">{vac.totalHours || 120}h</strong></div>
                    <div>Turmas Vinculadas: <strong className="text-slate-800 dark:text-slate-200">{vac.className}</strong></div>
                    <div>Período: <strong>{vac.startDate ? new Date(vac.startDate).toLocaleDateString('pt-BR') : '-'} até {vac.endDate ? new Date(vac.endDate).toLocaleDateString('pt-BR') : '-'}</strong></div>
                    <div>Escala e Horários: <strong>{vac.scheduleDaysTime}</strong></div>
                  </div>

                  {/* Allocated Students List */}
                  <div>
                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                      <span>Alunos na Turma de Estágio:</span>
                      <span className="text-[10px] text-slate-400 font-normal">Capacidade Máxima: {vac.maxStudents || 15}</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(vac.studentsAllocated || []).map(s => (
                        <div key={s.studentId} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex justify-between items-center">
                          <span>{s.studentName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{s.enrollmentNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Link do Professor / Actions Bar */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 justify-between items-center">
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/portal-professor-estagio/${vac.accessLinkCode || 'stg'}`;
                        navigator.clipboard.writeText(link);
                        setNotification({ type: 'success', message: 'Link do portal de avaliação do professor copiado com sucesso!' });
                      }}
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <LinkIcon className="h-3.5 w-3.5 text-emerald-600" /> Copiar Link do Docente
                    </button>

                    <button
                      onClick={() => {
                        setSelectedVacancyId(vac.id);
                        setActiveTab('LANCAMENTO_NOTAS');
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Award className="h-3.5 w-3.5" /> Lançar Notas desta Turma
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LANÇAMENTO DE NOTAS / FICHA DE AVALIAÇÃO */}
      {activeSubTab === 'LANCAMENTO_NOTAS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" /> Lançamento de Notas de Estágio Supervisionado
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Avalie o desempenho técnico, ético, pontualidade e relatórios do estudante.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveEvaluation} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">Selecione o Campo de Estágio / Turma *</label>
                <select
                  value={selectedVacancyId || selectedVacancy?.id || ''}
                  onChange={(e) => {
                    setSelectedVacancyId(e.target.value);
                    const vac = (vacancies || []).find(v => v.id === e.target.value);
                    const stList = (vac?.studentsAllocated && vac.studentsAllocated.length > 0)
                      ? vac.studentsAllocated
                      : currentVacancyStudents;
                    if (stList.length > 0) {
                      setSelectedStudentId(stList[0].studentId);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {(vacancies || []).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.companyName || v.stageName || 'Campo de Estágio'} - {v.className || 'Turma'} ({v.teacherName || 'Prof. Orientador'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-1">Selecione o Aluno para Lançar Notas *</label>
                <select
                  value={selectedStudentId || currentVacancyStudents[0]?.studentId || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  {(currentVacancyStudents || []).map(s => (
                    <option key={s.studentId} value={s.studentId}>{s.studentName} (#{s.enrollmentNumber})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grades Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Atuação Técnica (0-10)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  required
                  value={evalTechGrade}
                  onChange={(e) => setEvalTechGrade(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-center text-sm font-black text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Conduta Ética (0-10)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  required
                  value={evalEthicsGrade}
                  onChange={(e) => setEvalEthicsGrade(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-center text-sm font-black text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pontualidade (0-10)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  required
                  value={evalPunctualityGrade}
                  onChange={(e) => setEvalPunctualityGrade(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-center text-sm font-black text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Relatório Final (0-10)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  required
                  value={evalReportGrade}
                  onChange={(e) => setEvalReportGrade(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-center text-sm font-black text-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Parecer / Feedback do Preceptor</label>
              <textarea
                rows={3}
                value={evalFeedback}
                onChange={(e) => setEvalFeedback(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Salvar Ficha e Confirmar Média
              </button>
            </div>
          </form>

          {/* Evaluations list */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Histórico de Fichas de Avaliação Lançadas
            </h4>
            <div className="space-y-2">
              {(evaluations || []).map(ev => (
                <div key={ev.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{ev.studentName}</div>
                    <div className="text-[11px] text-slate-500">{ev.companyName} • Evaluated at: {ev.evaluatedAt ? new Date(ev.evaluatedAt).toLocaleDateString('pt-BR') : '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-blue-600 text-sm">Média: {ev.finalGrade?.toFixed(1) || ev.grade || '10.0'}</div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                      {ev.status || 'APROVADO'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: RECIBOS DO PROFESSOR */}
      {activeSubTab === 'RECIBOS' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Recibos de Pagamento dos Professores de Estágio
          </h3>
          <p className="text-xs text-slate-500">
            Emissão automática de recibos para supervisores de estágio com base no número de alunos acompanhados.
          </p>

          <div className="space-y-3 pt-2">
            {(receipts || []).map(rec => (
              <div key={rec.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="font-black text-slate-900 dark:text-white text-sm">{rec.teacherName}</div>
                  <div className="text-xs text-slate-500 font-bold">{rec.companyName} • {rec.studentsCount} Alunos acompanhados</div>
                </div>
                <div className="text-right font-black text-emerald-600 text-base">
                  R$ {rec.totalValue?.toFixed(2)}
                </div>
              </div>
            ))}

            {(receipts || []).length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 font-bold">
                Nenhum recibo de pagamento gerado ainda. Conclua e avalie as turmas de estágio para gerar recibos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printModal && (
        <MovimentacaoDocumentPrintModal
          title={printModal.title}
          subtitle="Documento de Estágio Supervisionado"
          contentHtml={printModal.contentHtml}
          onClose={() => setPrintModal(null)}
        />
      )}

    </div>
  );
};
