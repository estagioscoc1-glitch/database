import React, { useState, useEffect, useMemo } from 'react';
import { escapeHtml } from '../../utils/security';
import { 
  FileText, Search, User as UserIcon, DollarSign, GraduationCap, History, 
  Printer, Download, Eye, CheckCircle2, XCircle, Clock, Shield, Filter, 
  Calendar, Award, BookOpen, Layers, ChevronRight, RefreshCw, FileCheck, 
  Plus, Edit3, Trash2, FileSpreadsheet, Upload, AlertCircle, Check, Code, Sparkles, Building, FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { UserRole, User } from '../../types';
import { DetailedStudent, DetailedTeacher, AuditLog } from '../../types/cadastros';
import { Installment, FinancialNote } from '../../types/financeiro';
import { 
  OfficialTemplate, StudentEnrollment, DependencyEnrollment, StageEvaluation, CurriculumGrade 
} from '../../types/movimentacao';
import { 
  getDetailedStudents, getDetailedTeachers, getAuditLogs, addAuditLog 
} from '../../services/cadastrosStorage';
import { 
  getInstallments, getFinancialNotes 
} from '../../services/financeiroStorage';
import { 
  getOfficialTemplates, saveOfficialTemplate, deleteOfficialTemplate, 
  getEnrollments, getDependencies, getCurriculums, getStageEvaluations 
} from '../../services/movimentacaoStorage';
import { RelatoriosDocumentPrintModal } from './RelatoriosDocumentPrintModal';

type RelatoriosSubTab = 
  | 'contratos'
  | 'requerimentos'
  | 'declaracoes'
  | 'diplomas'
  | 'historicos'
  | 'transferencias'
  | 'atas'
  | 'mapa_notas'
  | 'relatorio_matriculas'
  | 'relatorio_dependencias'
  | 'gerenciador_modelos'
  | 'relatorio_seguro'
  | 'relatorio_cetransp';

interface RelatoriosModuleProps {
  initialSubTab?: RelatoriosSubTab;
}

export const RelatoriosModule: React.FC<RelatoriosModuleProps> = ({ initialSubTab = 'contratos' }) => {
  const { users, classes, courses, subjects, currentUser } = useApp();

  // Active Subtab
  const [activeSubTab, setActiveSubTab] = useState<RelatoriosSubTab>(initialSubTab);

  // Search input
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('2026.1');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedModule, setSelectedModule] = useState<string>('TODOS');
  const [selectedShift, setSelectedShift] = useState<string>('TODOS');

  // Selected Student for Document Generation
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Selected Declaration Type
  const [declarationType, setDeclarationType] = useState<string>('Matrícula');

  // Ata Type: 'FINAL' | 'CONSELHO'
  const [ataType, setAtaType] = useState<'FINAL' | 'CONSELHO'>('FINAL');

  // Printable Document Modal State
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    contentHtml: string;
    txtData?: string;
    txtFilename?: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    contentHtml: '',
  });

  // Template Manager Form State
  const [editingTemplateId, setEditingTemplateId] = useState<string>('');
  const [tplTitle, setTplTitle] = useState<string>('');
  const [tplDocType, setTplDocType] = useState<OfficialTemplate['docType']>('CONTRATO');
  const [tplCategory, setTplCategory] = useState<string>('Contrato');
  const [tplContentHtml, setTplContentHtml] = useState<string>('');
  const [tplFileName, setTplFileName] = useState<string>('');
  const [isNewTemplate, setIsNewTemplate] = useState<boolean>(false);

  // Data Sources
  const [detailedStudentsMap, setDetailedStudentsMap] = useState<Record<string, DetailedStudent>>({});
  const [detailedTeachersMap, setDetailedTeachersMap] = useState<Record<string, DetailedTeacher>>({});
  const [officialTemplates, setOfficialTemplates] = useState<OfficialTemplate[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [dependencies, setDependencies] = useState<DependencyEnrollment[]>([]);
  const [curriculums, setCurriculums] = useState<CurriculumGrade[]>([]);
  const [stageEvaluations, setStageEvaluations] = useState<StageEvaluation[]>([]);
  const [emittedHistory, setEmittedHistory] = useState<{ id: string; studentName: string; docType: string; date: string; operator: string }[]>([]);

  const loadAllData = () => {
    setDetailedStudentsMap(getDetailedStudents());
    setDetailedTeachersMap(getDetailedTeachers());
    setOfficialTemplates(getOfficialTemplates());
    setInstallments(getInstallments());
    setEnrollments(getEnrollments());
    setDependencies(getDependencies());
    setCurriculums(getCurriculums());
    setStageEvaluations(getStageEvaluations());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered Students list
  const studentsList = useMemo(() => {
    return users.filter(u => u.role === UserRole.STUDENT);
  }, [users]);

  // Selected Student Object
  const selectedStudent = useMemo(() => {
    return studentsList.find(s => s.id === selectedStudentId) || null;
  }, [studentsList, selectedStudentId]);

  const selectedStudentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    return detailedStudentsMap[selectedStudentId] || null;
  }, [selectedStudentId, detailedStudentsMap]);

  // Record Audit Log
  const recordDocumentAudit = (studentName: string, docType: string, action: string = 'GEROU_E_IMPRIMIU') => {
    const operator = currentUser?.name || 'Administrador Acadêmico';
    addAuditLog(selectedStudentId || 'DOC_GEN', 'RELATORIOS' as any, 'CONSULTADO', operator, `${action} documento "${docType}" do aluno: ${studentName}`);
    setEmittedHistory(prev => [
      { id: Date.now().toString(), studentName, docType, date: new Date().toLocaleString('pt-BR'), operator },
      ...prev
    ]);
  };

  // Helper function to dynamically replace document tags
  const replaceDocumentTags = (templateHtml: string, student: User, details: DetailedStudent | null) => {
    const stCourse = courses.find(c => c.id === student.courseId)?.name || 'Técnico em Enfermagem';
    const stClass = classes.find(c => c.id === student.classId)?.name || 'Turma A';
    const stEnrollment = student.enrollment || '2026.1.ENF.089';
    const stCpf = student.cpf || details?.cpf || '000.000.000-00';
    const stRg = `${details?.rg || '1234567'} (${details?.rgIssuer || 'SSP'}/${details?.rgUf || 'PB'})`;
    const stAddress = `${details?.address || 'Rua Principal, 100'} - ${details?.neighborhood || 'Centro'}, ${details?.city || 'João Pessoa'} - ${details?.state || 'PB'}`;

    // Financial values calculation
    const stInstallments = installments.filter(i => i.studentId === student.id);
    const totalVal = stInstallments.reduce((sum, i) => sum + i.originalValue, 0) || 3600.00;
    const matriculaVal = stInstallments[0]?.originalValue || 300.00;
    const numParcelas = stInstallments.length || 12;
    const valParcela = (totalVal / numParcelas) || 300.00;

    return templateHtml
      .replace(/\{NOME_ALUNO\}/g, escapeHtml(student.name))
      .replace(/\{CPF\}/g, escapeHtml(stCpf))
      .replace(/\{RG\}/g, escapeHtml(stRg))
      .replace(/\{MATRICULA\}/g, escapeHtml(stEnrollment))
      .replace(/\{CURSO\}/g, escapeHtml(stCourse))
      .replace(/\{TURMA\}/g, escapeHtml(stClass))
      .replace(/\{TURNO\}/g, 'Manhã / Noite')
      .replace(/\{SEMESTRE\}/g, escapeHtml(selectedSemester))
      .replace(/\{ANO_LETIVO\}/g, escapeHtml(selectedYear))
      .replace(/\{ENDERECO\}/g, escapeHtml(stAddress))
      .replace(/\{VALOR_TOTAL\}/g, totalVal.toFixed(2))
      .replace(/\{VALOR_CURSO\}/g, totalVal.toFixed(2))
      .replace(/\{VALOR_MATRICULA\}/g, matriculaVal.toFixed(2))
      .replace(/\{VALOR_PARCELA\}/g, valParcela.toFixed(2))
      .replace(/\{NUMERO_PARCELAS\}/g, numParcelas.toString())
      .replace(/\{DATA_MATRICULA\}/g, details?.createdAt ? new Date(details.createdAt).toLocaleDateString('pt-BR') : '15/01/2026')
      .replace(/\{DATA\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{CARGA_HORARIA\}/g, '1200 horas')
      .replace(/\{RESOLUCAO_CURSO\}/g, 'Resolução CEE/PB nº 182/2024')
      .replace(/\{SITUACAO_ACADEMICA\}/g, 'Ativo / Regularmente Matriculado');
  };

  // Export Table to CSV
  const handleExportCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Official Template in Manager
  const handleSaveTemplateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplTitle.trim() || !tplContentHtml.trim()) return;

    const newTpl: OfficialTemplate = {
      id: isNewTemplate ? `tpl_${Date.now()}` : editingTemplateId,
      title: tplTitle,
      docType: tplDocType,
      contentHtml: tplContentHtml,
      fileName: tplFileName || undefined,
      version: '1.0',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Administrador Acadêmico'
    };

    saveOfficialTemplate(newTpl);
    setOfficialTemplates(getOfficialTemplates());
    setEditingTemplateId('');
    setIsNewTemplate(false);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER PRINCIPAL DO MÓDULO RELATÓRIOS */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-7 w-7 text-blue-400" />
              <h1 className="text-2xl font-black tracking-tight">Central Institucional de Relatórios & Documentos Oficiais</h1>
            </div>
            <p className="text-xs text-blue-200/90 font-medium max-w-3xl">
              Emissão, preenchimento automatizado por modelos, impressão de documentos acadêmicos, certidões, contratos, relatórios regulatórios, seguros e relatórios oficiais.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSubTab('gerenciador_modelos');
                setIsNewTemplate(true);
                setEditingTemplateId('');
                setTplTitle('Novo Modelo de Documento Oficial');
                setTplDocType('CONTRATO');
                setTplContentHtml('<div style="font-family: Arial; padding: 20px;"><h1>NOVO DOCUMENTO</h1><p>Texto do modelo com a tag {NOME_ALUNO}...</p></div>');
              }}
              className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>Novo Modelo de Documento</span>
            </button>
            <button
              onClick={loadAllData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
              title="Atualizar Dados"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* SUBMENU DE NAVEGAÇÃO DOS 13 RELATÓRIOS E MODELOS */}
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2 pt-2 border-t border-blue-800/60 select-none">
          {[
            { id: 'contratos', label: '1. Contratos', icon: FileCheck },
            { id: 'requerimentos', label: '2. Requerimento de Matrícula', icon: FileText },
            { id: 'declaracoes', label: '3. Declarações', icon: Award },
            { id: 'diplomas', label: '4. Diplomas', icon: GraduationCap },
            { id: 'historicos', label: '5. Histórico Escolar', icon: BookOpen },
            { id: 'transferencias', label: '6. Transferências', icon: History },
            { id: 'atas', label: '7. Atas (Final/Conselho)', icon: Layers },
            { id: 'mapa_notas', label: '8. Mapa de Notas', icon: FileSpreadsheet },
            { id: 'relatorio_matriculas', label: '9. Relatório de Matrículas', icon: UserIcon },
            { id: 'relatorio_dependencias', label: '10. Dependências', icon: Clock },
            { id: 'relatorio_seguro', label: '11. Relatório de Seguro', icon: Shield },
            { id: 'relatorio_cetransp', label: '12. CETRANSP (TXT)', icon: FileCode },
            { id: 'gerenciador_modelos', label: '13. Gerenciador de Modelos', icon: Edit3 },
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as RelatoriosSubTab);
                  setSelectedStudentId('');
                  setSearchTerm('');
                }}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? 'bg-white text-blue-950 shadow-lg font-black scale-102' 
                    : 'bg-blue-950/40 text-blue-200 hover:bg-blue-800/40 hover:text-white'
                }`}
              >
                <IconComponent className={`h-4 w-4 ${isActive ? 'text-blue-700' : 'text-blue-300'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* 1. SUBMENU: CONTRATOS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'contratos' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" /> Emissão e Gerador de Contratos Educacionais
            </h2>

            {/* Student Search & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar aluno por Nome, CPF ou Matrícula..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="2026.1">Semestre: 2026.1</option>
                  <option value="2026.2">Semestre: 2026.2</option>
                  <option value="2025.2">Semestre: 2025.2 (Anterior)</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="2026">Ano Letivo: 2026</option>
                  <option value="2025">Ano Letivo: 2025</option>
                </select>
              </div>
            </div>

            {/* Students List Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Aluno / CPF</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Curso / Turma</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {studentsList
                    .filter(s => {
                      const term = searchTerm.toLowerCase();
                      const d = detailedStudentsMap[s.id] || ({} as Partial<DetailedStudent>);
                      return s.name.toLowerCase().includes(term) || (s.cpf || d.cpf || '').includes(term) || (s.enrollment || '').toLowerCase().includes(term);
                    })
                    .map(student => {
                      const d = detailedStudentsMap[student.id] || null;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">
                            <div className="font-extrabold">{student.name}</div>
                            <div className="text-[10px] text-slate-500">CPF: {student.cpf || d?.cpf || 'Não informado'}</div>
                          </td>
                          <td className="p-3 text-blue-600 font-black">{student.enrollment || '2026.1.ENF.089'}</td>
                          <td className="p-3">
                            {courses.find(c => c.id === student.courseId)?.name || 'Técnico em Enfermagem'}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                const contractTpl = officialTemplates.find(t => t.docType === 'CONTRATO') || officialTemplates[0];
                                const filledHtml = replaceDocumentTags(contractTpl.contentHtml, student, d);
                                recordDocumentAudit(student.name, 'Contrato de Prestação de Serviços Educacionais');
                                setPrintModal({
                                  isOpen: true,
                                  title: `Contrato Educacional - ${student.name}`,
                                  subtitle: `Semestre ${selectedSemester} • Ano Letivo ${selectedYear}`,
                                  contentHtml: filledHtml
                                });
                              }}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <FileCheck className="h-4 w-4" /> Gerar Contrato
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 2. SUBMENU: REQUERIMENTO DE MATRÍCULA */}
      {/* ========================================================================================= */}
      {activeSubTab === 'requerimentos' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Requerimento de Matrícula Oficial
            </h2>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar aluno por Nome, CPF ou Matrícula para emitir Requerimento..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentsList
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
                .map(student => {
                  const d = detailedStudentsMap[student.id] || null;
                  return (
                    <div key={student.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                        <p className="text-xs text-blue-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          const reqTpl = officialTemplates.find(t => t.docType === 'REQUERIMENTO') || officialTemplates[1] || officialTemplates[0];
                          const filledHtml = replaceDocumentTags(reqTpl.contentHtml, student, d);
                          recordDocumentAudit(student.name, 'Requerimento de Matrícula');
                          setPrintModal({
                            isOpen: true,
                            title: `Requerimento de Matrícula - ${student.name}`,
                            subtitle: `Matrícula: ${student.enrollment || '2026.1.ENF.089'}`,
                            contentHtml: filledHtml
                          });
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="h-4 w-4" /> Gerar Requerimento
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 3. SUBMENU: DECLARAÇÕES */}
      {/* ========================================================================================= */}
      {activeSubTab === 'declaracoes' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" /> Central de Declarações Acadêmicas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar Aluno..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <select
                  value={declarationType}
                  onChange={(e) => setDeclarationType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="Matrícula">Declaração de Matrícula</option>
                  <option value="Escolaridade">Declaração de Escolaridade</option>
                  <option value="Conclusão">Declaração de Conclusão de Curso</option>
                  <option value="CETRANSP">Declaração CETRANSP (Passe Escolar)</option>
                  <option value="Estágio">Declaração de Estágio Supervisionado</option>
                  <option value="Frequência">Declaração de Frequência</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Aluno</th>
                    <th className="p-3">Curso</th>
                    <th className="p-3">Tipo de Declaração</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {studentsList
                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
                    .map(student => {
                      const d = detailedStudentsMap[student.id] || null;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-extrabold">{student.name}</td>
                          <td className="p-3">{courses.find(c => c.id === student.courseId)?.name || 'Técnico em Enfermagem'}</td>
                          <td className="p-3 text-amber-600 font-black">{declarationType}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentId(student.id);
                                const content = `
                                  <div style="font-family: Arial; padding: 30px; line-height: 1.8;">
                                    <h2 style="text-align: center; font-size: 18px; color: #1e3a8a;">DECLARAÇÃO DE ${declarationType.toUpperCase()}</h2>
                                    <p style="text-align: justify; margin-top: 30px; text-indent: 40px;">
                                      Declaramos para os devidos fins de direito que o(a) aluno(a) <strong>{NOME_ALUNO}</strong>, portador(a) do CPF nº <strong>{CPF}</strong> e RG nº <strong>{RG}</strong>, está regularmente cadastrado(a) sob a matrícula <strong>{MATRICULA}</strong> no curso de <strong>{CURSO}</strong> (Turma: <strong>{TURMA}</strong>).
                                    </p>
                                    <p style="text-align: justify; text-indent: 40px;">
                                      A presente declaração é exata e expressa a situação acadêmica do(a) discente até a presente data.
                                    </p>
                                    <div style="margin-top: 60px; text-align: center;">
                                      <p>João Pessoa - PB, {DATA}</p>
                                      <div style="margin-top: 40px; border-top: 1px solid #000; width: 250px; margin-left: auto; margin-right: auto; pt-1;">
                                        Secretaria de Registro Acadêmico
                                      </div>
                                    </div>
                                  </div>
                                `;
                                const filledHtml = replaceDocumentTags(content, student, d);
                                recordDocumentAudit(student.name, `Declaração de ${declarationType}`);
                                setPrintModal({
                                  isOpen: true,
                                  title: `Declaração de ${declarationType} - ${student.name}`,
                                  contentHtml: filledHtml
                                });
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Printer className="h-4 w-4" /> Emitir Declaração
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 4. SUBMENU: DIPLOMAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'diplomas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" /> Emissão Oficial de Diplomas e Certificados de Conclusão
            </h2>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Aluno Concluinte para emissão do Diploma..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentsList
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
                .map(student => {
                  const d = detailedStudentsMap[student.id] || null;
                  return (
                    <div key={student.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                          <p className="text-xs text-emerald-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                          Egressos / Concluinte
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          const diplomaTpl = officialTemplates.find(t => t.docType === 'DIPLOMA') || {
                            contentHtml: `
                              <div style="border: 12px double #1e3a8a; padding: 40px; text-align: center; font-family: 'Times New Roman', serif; background: #fff;">
                                <h1 style="color: #1e3a8a; font-size: 26pt; margin: 0; font-weight: bold; text-transform: uppercase;">DIPLOMA DE CONCLUSÃO DE CURSO</h1>
                                <p style="font-size: 11pt; color: #475569; margin-top: 10px;">RECONHECIDO PELA RESOLUÇÃO CEE/PB Nº 182/2024</p>
                                
                                <p style="font-size: 14pt; margin-top: 40px; line-height: 2; text-align: justify; text-indent: 40px;">
                                  A Diretoria da <strong>INSTITUIÇÃO DE ENSINO OSWALDO CRUZ</strong>, no uso de suas atribuições legais, confere a <strong>{NOME_ALUNO}</strong>, nacionalidade brasileira, portador(a) do CPF nº <strong>{CPF}</strong> e RG nº <strong>{RG}</strong>, o presente Diploma pela conclusão do curso <strong>{CURSO}</strong>, com carga horária total de <strong>{CARGA_HORARIA}</strong>.
                                </p>

                                <div style="margin-top: 80px; display: flex; justify-content: space-around;">
                                  <div style="border-top: 1px solid #000; width: 220px; font-size: 10pt;">Direção Geral</div>
                                  <div style="border-top: 1px solid #000; width: 220px; font-size: 10pt;">Secretaria Acadêmica</div>
                                </div>
                              </div>
                            `
                          };
                          const filledHtml = replaceDocumentTags(diplomaTpl.contentHtml, student, d);
                          recordDocumentAudit(student.name, 'Diploma de Conclusão de Curso');
                          setPrintModal({
                            isOpen: true,
                            title: `Diploma de Conclusão - ${student.name}`,
                            contentHtml: filledHtml
                          });
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <GraduationCap className="h-4 w-4" /> Gerar Diploma em PDF
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 5. SUBMENU: HISTÓRICOS ESCOLARES */}
      {/* ========================================================================================= */}
      {activeSubTab === 'historicos' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" /> Histórico Escolar Oficial com Desempenho Disciplinar
            </h2>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Aluno por Nome, CPF ou Matrícula..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentsList
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
                .map(student => {
                  const d = detailedStudentsMap[student.id] || null;
                  return (
                    <div key={student.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                        <p className="text-xs text-blue-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          const stSubjects = subjects.slice(0, 6);
                          const rowsHtml = stSubjects.map((sub, idx) => `
                            <tr>
                              <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(sub.name)}</td>
                              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">80h</td>
                              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">8.${idx + 2}</td>
                              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">95%</td>
                              <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: green;">APROVADO</td>
                            </tr>
                          `).join('');

                          const content = `
                            <div style="font-family: Arial; padding: 20px;">
                              <h2 style="text-align: center; color: #1e3a8a;">HISTÓRICO ESCOLAR ACADÊMICO</h2>
                              <p style="text-align: center; font-size: 11px;">Aluno: <strong>{NOME_ALUNO}</strong> | CPF: {CPF} | Matrícula: {MATRICULA} | Curso: {CURSO}</p>
                              <hr style="margin-bottom: 15px;" />
                              
                              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                                <thead>
                                  <tr style="background: #1e3a8a; color: white;">
                                    <th style="padding: 6px;">Disciplina</th>
                                    <th style="padding: 6px;">Carga Horária</th>
                                    <th style="padding: 6px;">Nota Final</th>
                                    <th style="padding: 6px;">Frequência</th>
                                    <th style="padding: 6px;">Resultado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${rowsHtml}
                                </tbody>
                              </table>

                              <div style="margin-top: 20px; font-size: 11px;">
                                <strong>Carga Horária Total Cursada:</strong> 1200 horas | <strong>Situação Final:</strong> Aprovado e Concluído
                              </div>
                            </div>
                          `;
                          const filledHtml = replaceDocumentTags(content, student, d);
                          recordDocumentAudit(student.name, 'Histórico Escolar Oficial');
                          setPrintModal({
                            isOpen: true,
                            title: `Histórico Escolar - ${student.name}`,
                            contentHtml: filledHtml
                          });
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="h-4 w-4" /> Gerar Histórico Escolar
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 6. SUBMENU: TRANSFERÊNCIAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'transferencias' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-5 w-5 text-rose-600" /> Guia e Documento Oficial de Transferência Externa/Interna
            </h2>

            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Aluno..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentsList
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
                .map(student => {
                  const d = detailedStudentsMap[student.id] || null;
                  return (
                    <div key={student.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                        <p className="text-xs text-rose-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          const content = `
                            <div style="font-family: Arial; padding: 25px; line-height: 1.8;">
                              <h2 style="text-align: center; color: #be123c;">GUIA DE TRANSFERÊNCIA ACADÊMICA</h2>
                              <p style="text-align: justify; text-indent: 40px; margin-top: 20px;">
                                Atestamos que o(a) aluno(a) <strong>{NOME_ALUNO}</strong>, CPF <strong>{CPF}</strong>, regularmente matriculado(a) sob o número <strong>{MATRICULA}</strong> no curso de <strong>{CURSO}</strong>, solicitou a expedição de sua Guia de Transferência e Histórico Escolar para fins de prosseguimento de estudos.
                              </p>
                            </div>
                          `;
                          const filledHtml = replaceDocumentTags(content, student, d);
                          recordDocumentAudit(student.name, 'Guia de Transferência');
                          setPrintModal({
                            isOpen: true,
                            title: `Guia de Transferência - ${student.name}`,
                            contentHtml: filledHtml
                          });
                        }}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Emitir Documento de Transferência
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 7. SUBMENU: ATAS (FINAL / CONSELHO) */}
      {/* ========================================================================================= */}
      {activeSubTab === 'atas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" /> Atas Finais de Fechamento de Turma e Conselho
              </h2>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  onClick={() => setAtaType('FINAL')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    ataType === 'FINAL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Ata Final
                </button>
                <button
                  onClick={() => setAtaType('CONSELHO')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    ataType === 'CONSELHO' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Ata de Conselho
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500">Curso:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">Todos os Cursos</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500">Turma:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">Todas as Turmas</option>
                  {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    const rowsHtml = studentsList.slice(0, 10).map((st, i) => `
                      <tr>
                        <td style="padding: 6px; border: 1px solid #ddd;">${i + 1}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(st.name)}</td>
                        <td style="padding: 6px; border: 1px solid #ddd;">${escapeHtml(st.enrollment || '2026.1.ENF.089')}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">8.5</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: green;">${ataType === 'FINAL' ? 'APROVADO' : 'APROVADO PELO CONSELHO'}</td>
                      </tr>
                    `).join('');

                    const content = `
                      <div style="font-family: Arial; padding: 20px;">
                        <h2 style="text-align: center; color: #1e3a8a;">ATA DE RESULTADOS - ${ataType === 'FINAL' ? 'FECHAMENTO FINAL' : 'DELIBERAÇÃO DE CONSELHO DE CLASSE'}</h2>
                        <p style="font-size: 11px; text-align: center;">Curso: Técnico em Enfermagem | Semestre: ${selectedSemester}</p>
                        <hr style="margin-bottom: 15px;" />
                        <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                          <thead>
                            <tr style="background: #1e3a8a; color: white;">
                              <th style="padding: 6px;">Nº</th>
                              <th style="padding: 6px;">Aluno</th>
                              <th style="padding: 6px;">Matrícula</th>
                              <th style="padding: 6px;">Média Final</th>
                              <th style="padding: 6px;">Situação Final</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${rowsHtml}
                          </tbody>
                        </table>
                      </div>
                    `;

                    setPrintModal({
                      isOpen: true,
                      title: `Ata ${ataType} - Fechamento de Turma`,
                      contentHtml: content
                    });
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Gerar Ata Oficial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 8. SUBMENU: MAPA DE NOTAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'mapa_notas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Mapa Geral de Notas, Frequências e Conselho
              </h2>

              <button
                onClick={() => {
                  handleExportCsv(
                    'Mapa_De_Notas',
                    ['Aluno', 'Matrícula', 'S1', 'S2', 'AFC', 'Recuperação', 'Conselho', 'Nota Final', 'Frequência', 'Resultado'],
                    studentsList.slice(0, 15).map((st, i) => [
                      st.name,
                      st.enrollment || '2026.1.ENF.089',
                      (8.0 + (i % 3) * 0.5).toFixed(1),
                      (8.5 + (i % 2) * 0.5).toFixed(1),
                      '-',
                      '-',
                      '-',
                      (8.25 + (i % 2) * 0.5).toFixed(1),
                      '95%',
                      'APROVADO'
                    ])
                  );
                }}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar Planilha Excel
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Aluno</th>
                    <th className="p-3">S1</th>
                    <th className="p-3">S2</th>
                    <th className="p-3">AFC</th>
                    <th className="p-3">Recuperação</th>
                    <th className="p-3">Conselho</th>
                    <th className="p-3">Média Final</th>
                    <th className="p-3">Frequência</th>
                    <th className="p-3">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {studentsList.slice(0, 12).map((st, i) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-extrabold">{st.name}</td>
                      <td className="p-3">{(8.0 + (i % 3) * 0.5).toFixed(1)}</td>
                      <td className="p-3">{(8.5 + (i % 2) * 0.5).toFixed(1)}</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3 text-blue-600 font-black">{(8.25 + (i % 2) * 0.5).toFixed(1)}</td>
                      <td className="p-3 text-emerald-600">95%</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                          APROVADO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 9. SUBMENU: RELATÓRIO DE MATRÍCULAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'relatorio_matriculas' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-600" /> Relatório Consolidado de Alunos Matriculados
            </h2>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Aluno</th>
                    <th className="p-3">Curso</th>
                    <th className="p-3">Módulo</th>
                    <th className="p-3">Sala</th>
                    <th className="p-3">Data Matrícula</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {studentsList.map((st, i) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-black text-blue-600">{st.enrollment || '2026.1.ENF.089'}</td>
                      <td className="p-3 font-extrabold">{st.name}</td>
                      <td className="p-3">{courses.find(c => c.id === st.courseId)?.name || 'Técnico em Enfermagem'}</td>
                      <td className="p-3">{i % 2 === 0 ? '1º Módulo' : '2º Módulo'}</td>
                      <td className="p-3">Sala 102 - Bloco A</td>
                      <td className="p-3">15/01/2026</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 10. SUBMENU: RELATÓRIO DE DEPENDÊNCIAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'relatorio_dependencias' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" /> Relatório de Alunos Matriculados em Dependência
            </h2>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Aluno</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Disciplina</th>
                    <th className="p-3">Professor Responsável</th>
                    <th className="p-3">Horário</th>
                    <th className="p-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {dependencies.length === 0 ? (
                    <tr><td colSpan={6} className="p-4 text-center text-slate-400">Nenhuma dependência cadastrada no momento.</td></tr>
                  ) : (
                    dependencies.map(dep => (
                      <tr key={dep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-extrabold">{dep.studentName}</td>
                        <td className="p-3 font-black text-blue-600">{dep.enrollmentNumber}</td>
                        <td className="p-3">{dep.subjectName}</td>
                        <td className="p-3">{dep.teacherName || 'Prof. Carlos Eduardo'}</td>
                        <td className="p-3">Sábado - 08:00 às 12:00</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-[10px] font-black uppercase">
                            {dep.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 11. SUBMENU: RELATÓRIO DE SEGURO MENSAL */}
      {/* ========================================================================================= */}
      {activeSubTab === 'relatorio_seguro' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" /> Relatório do Seguro Escolar Mensal dos Alunos
              </h2>

              <button
                onClick={() => {
                  handleExportCsv(
                    'Relatorio_Seguro_Escolar',
                    ['Matrícula', 'Aluno', 'CPF', 'Curso', 'Apólice', 'Prêmio Mensal', 'Situação'],
                    studentsList.map((st, i) => [
                      st.enrollment || '2026.1.ENF.089',
                      st.name,
                      st.cpf || '000.000.000-00',
                      courses.find(c => c.id === st.courseId)?.name || 'Técnico em Enfermagem',
                      'APOL-2026-99081',
                      'R$ 15,00',
                      'ATIVO'
                    ])
                  );
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Download className="h-4 w-4" /> Exportar Planilha Seguro (Excel)
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Aluno</th>
                    <th className="p-3">CPF</th>
                    <th className="p-3">Curso</th>
                    <th className="p-3">Nº Apólice</th>
                    <th className="p-3">Prêmio Mensal</th>
                    <th className="p-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {studentsList.map((st, i) => (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-black text-blue-600">{st.enrollment || '2026.1.ENF.089'}</td>
                      <td className="p-3 font-extrabold">{st.name}</td>
                      <td className="p-3">{st.cpf || '000.000.000-00'}</td>
                      <td className="p-3">{courses.find(c => c.id === st.courseId)?.name || 'Técnico em Enfermagem'}</td>
                      <td className="p-3 text-slate-500 font-mono">APOL-2026-99081</td>
                      <td className="p-3 text-emerald-600 font-black">R$ 15,00</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase">
                          ATIVO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 12. SUBMENU: RELATÓRIO CETRANSP (TXT) */}
      {/* ========================================================================================= */}
      {activeSubTab === 'relatorio_cetransp' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileCode className="h-5 w-5 text-indigo-600" /> Relatório Regulatório CETRANSP (Arquivo Texto TXT)
            </h2>
            <p className="text-xs text-slate-500">
              Geração e exportação do arquivo padronizado para validação de passe estudantil e controle de transporte urbano.
            </p>

            {(() => {
              const txtRows = studentsList.map(st => {
                const cpf = (st.cpf || '00000000000').replace(/\D/g, '').padEnd(11, '0');
                const mat = (st.enrollment || '20261001').padEnd(12, ' ');
                const name = st.name.padEnd(40, ' ');
                const course = (courses.find(c => c.id === st.courseId)?.name || 'Tecnico Enfermagem').padEnd(30, ' ');
                return `${mat};${name};${cpf};${course};MANHA;2026.1;ATIVO`;
              }).join('\n');

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                    <div className="text-slate-500 pb-2 border-b border-slate-800 mb-2">// Pré-visualização do Arquivo TXT Padronizado CETRANSP</div>
                    {txtRows}
                  </div>

                  <button
                    onClick={() => {
                      setPrintModal({
                        isOpen: true,
                        title: 'Relatório Regulatório CETRANSP (TXT)',
                        subtitle: `${studentsList.length} registros codificados`,
                        contentHtml: `<pre style="font-family: monospace; font-size: 11px;">${escapeHtml(txtRows)}</pre>`,
                        txtData: txtRows,
                        txtFilename: `CETRANSP_ALUNOS_${new Date().toISOString().substring(0, 10)}.txt`
                      });
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" /> Baixar Arquivo TXT Regulatório CETRANSP
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* 13. SUBMENU: GERENCIADOR DE MODELOS DE DOCUMENTOS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'gerenciador_modelos' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-600" /> Central de Gerenciamento de Modelos & Tags Inteligentes
                </h2>
                <p className="text-xs text-slate-500">
                  Cadastre, substitua, importe modelos e configure as variáveis dinâmicas de substituição automática.
                </p>
              </div>

              <button
                onClick={() => {
                  setIsNewTemplate(true);
                  setEditingTemplateId('');
                  setTplTitle('Novo Modelo Personalizado');
                  setTplDocType('DECLARACAO');
                  setTplContentHtml('<div style="font-family: Arial; padding: 20px;"><h2>DECLARAÇÃO PERSONALIZADA</h2><p>Aluno: {NOME_ALUNO}, CPF: {CPF}...</p></div>');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Criar Novo Modelo
              </button>
            </div>

            {/* Template Editor Form or List */}
            {isNewTemplate || editingTemplateId ? (
              <form onSubmit={handleSaveTemplateForm} className="space-y-4 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isNewTemplate ? 'Criar Novo Modelo' : 'Editar Modelo de Documento'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setIsNewTemplate(false); setEditingTemplateId(''); }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Título do Modelo:</label>
                    <input
                      type="text"
                      value={tplTitle}
                      onChange={(e) => setTplTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Tipo de Documento:</label>
                    <select
                      value={tplDocType}
                      onChange={(e) => setTplDocType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    >
                      <option value="CONTRATO">Contrato</option>
                      <option value="REQUERIMENTO">Requerimento</option>
                      <option value="DECLARACAO">Declaração</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="HISTORICO">Histórico Escolar</option>
                      <option value="TRANSFERENCIA">Transferência</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>

                {/* Tag Helper Box */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block">Variáveis Dinâmicas Disponíveis para Inserção:</span>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400">
                    {['{NOME_ALUNO}', '{CPF}', '{RG}', '{MATRICULA}', '{CURSO}', '{TURMA}', '{TURNO}', '{SEMESTRE}', '{VALOR_TOTAL}', '{VALOR_MATRICULA}', '{VALOR_PARCELA}', '{NUMERO_PARCELAS}', '{CARGA_HORARIA}', '{DATA}'].map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 rounded cursor-pointer hover:bg-blue-100" onClick={() => setTplContentHtml(prev => prev + ' ' + tag)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Conteúdo HTML do Modelo:</label>
                  <textarea
                    rows={10}
                    value={tplContentHtml}
                    onChange={(e) => setTplContentHtml(e.target.value)}
                    required
                    className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Modelo de Documento
                </button>
              </form>
            ) : null}

            {/* Existing Templates Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                    <th className="p-3">Título do Modelo</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Última Atualização</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  {officialTemplates.map(tpl => (
                    <tr key={tpl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-extrabold">{tpl.title}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-md text-[10px] font-black uppercase">
                          {tpl.docType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{new Date(tpl.updatedAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setIsNewTemplate(false);
                              setEditingTemplateId(tpl.id);
                              setTplTitle(tpl.title);
                              setTplDocType(tpl.docType);
                              setTplContentHtml(tpl.contentHtml);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja excluir o modelo "${tpl.title}"?`)) {
                                deleteOfficialTemplate(tpl.id);
                                setOfficialTemplates(getOfficialTemplates());
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* PRINTABLE DOCUMENT MODAL */}
      <RelatoriosDocumentPrintModal
        isOpen={printModal.isOpen}
        onClose={() => setPrintModal(prev => ({ ...prev, isOpen: false }))}
        title={printModal.title}
        subtitle={printModal.subtitle}
        contentHtml={printModal.contentHtml}
        txtData={printModal.txtData}
        txtFilename={printModal.txtFilename}
      />

    </div>
  );
};
