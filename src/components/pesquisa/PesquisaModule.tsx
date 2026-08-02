import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, User as UserIcon, DollarSign, Stethoscope, AlertTriangle, GraduationCap, 
  FileText, History, Printer, Download, Eye, CheckCircle2, XCircle, 
  Clock, Shield, Filter, Calendar, MapPin, Award, BookOpen, Layers, 
  ChevronRight, RefreshCw, Lock, UserCheck, ShieldAlert, FileSpreadsheet,
  Building, Phone, Mail, FileCheck, Tag, Plus, Check, Info, FileCode, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { UserRole, User } from '../../types';
import { DetailedStudent, DetailedTeacher, AuditLog } from '../../types/cadastros';
import { Installment, FinancialNote } from '../../types/financeiro';
import { StageEvaluation, StageVacancy, StageDefinition, TransferRecord, CancelationRecord, DependencyEnrollment, StudentRequirementRequest } from '../../types/movimentacao';
import { 
  getDetailedStudents, getDetailedTeachers, getAuditLogs, addAuditLog 
} from '../../services/cadastrosStorage';
import { 
  getInstallments, getFinancialNotes 
} from '../../services/financeiroStorage';
import { 
  getStageEvaluations, getStageVacancies, getStageDefinitions, 
  getTransfers, getCancelations, getDependencies, 
  getRequirementRequests, getCurriculums, getEnrollments
} from '../../services/movimentacaoStorage';
import { MovimentacaoDocumentPrintModal } from '../movimentacao/MovimentacaoDocumentPrintModal';

type SubTab = 
  | 'aluno'
  | 'financeiro'
  | 'estagios_realizados'
  | 'estagios_pendentes'
  | 'professores'
  | 'matriculas'
  | 'historico_matriculas';

interface PesquisaModuleProps {
  initialSubTab?: SubTab;
}

export const PesquisaModule: React.FC<PesquisaModuleProps> = ({ initialSubTab = 'aluno' }) => {
  const { users, classes, courses, subjects, currentUser } = useApp();

  // Active Submenu Tab
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(initialSubTab);

  // Smart Search input
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected entities for dossier view
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Filters for Professores
  const [teacherTypeFilter, setTeacherTypeFilter] = useState<'TODOS' | 'SALA_DE_AULA' | 'ESTAGIO' | 'AMBOS'>('TODOS');

  // Filters for Matrículas
  const [matriculaTab, setMatriculaTab] = useState<'novas' | 'todas' | 'estagio'>('todas');

  // Modal State for Access Audit Log
  const [showAuditLogModal, setShowAuditLogModal] = useState<boolean>(false);

  // Modal State for Printable Document
  const [printDoc, setPrintDoc] = useState<{ title: string; subtitle?: string; contentHtml: string } | null>(null);

  // Data Sources
  const [detailedStudentsMap, setDetailedStudentsMap] = useState<Record<string, DetailedStudent>>({});
  const [detailedTeachersMap, setDetailedTeachersMap] = useState<Record<string, DetailedTeacher>>({});
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [financialNotes, setFinancialNotes] = useState<FinancialNote[]>([]);
  const [stageEvaluations, setStageEvaluations] = useState<StageEvaluation[]>([]);
  const [stageVacancies, setStageVacancies] = useState<StageVacancy[]>([]);
  const [stageDefinitions, setStageDefinitions] = useState<StageDefinition[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [cancelations, setCancelations] = useState<CancelationRecord[]>([]);
  const [dependencies, setDependencies] = useState<DependencyEnrollment[]>([]);
  const [requirements, setRequirements] = useState<StudentRequirementRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Refresh all data
  const loadAllData = () => {
    setDetailedStudentsMap(getDetailedStudents());
    setDetailedTeachersMap(getDetailedTeachers());
    setInstallments(getInstallments());
    setFinancialNotes(getFinancialNotes());
    setStageEvaluations(getStageEvaluations());
    setStageVacancies(getStageVacancies());
    setStageDefinitions(getStageDefinitions());
    setTransfers(getTransfers());
    setCancelations(getCancelations());
    setDependencies(getDependencies());
    setRequirements(getRequirementRequests());
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter student users
  const studentsList = useMemo(() => {
    return users.filter(u => u.role === UserRole.STUDENT);
  }, [users]);

  // Filter teacher users
  const teachersList = useMemo(() => {
    return users.filter(u => u.role === UserRole.TEACHER);
  }, [users]);

  // Record audit access
  const recordAccess = (entityId: string, entityType: AuditLog['entityType'], details: string) => {
    const operator = currentUser?.name || 'Administrador';
    addAuditLog(entityId, entityType as any, 'CONSULTADO', operator, details);
    setAuditLogs(getAuditLogs());
  };

  // Export search results to CSV
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

  const selectedStudent = useMemo(() => {
    return studentsList.find(s => s.id === selectedStudentId);
  }, [studentsList, selectedStudentId]);

  const selectedStudentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    return detailedStudentsMap[selectedStudentId] || null;
  }, [selectedStudentId, detailedStudentsMap]);

  return (
    <div className="space-y-6">
      
      {/* HEADER PRINCIPAL DO MÓDULO PESQUISA */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Search className="h-7 w-7 text-blue-400" />
              <h1 className="text-2xl font-black tracking-tight">Central de Pesquisas Acadêmicas & Consultas Inteligentes</h1>
            </div>
            <p className="text-xs text-blue-200/90 font-medium max-w-3xl">
              Localização rápida de informações acadêmicas, históricas, financeiras, administrativas e profissionais com registro de acessos, controle de permissões e exportação oficial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAuditLogModal(true)}
              className="px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 font-bold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Registro de Acessos & Auditoria</span>
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

        {/* SUBMENU DE NAVEGAÇÃO PRINCIPAL DAS PESQUISAS */}
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2 pt-2 border-t border-blue-800/60 select-none">
          {[
            { id: 'aluno', label: '1. Pesquisa Aluno', icon: UserIcon },
            { id: 'financeiro', label: '2. Histórico Financeiro', icon: DollarSign },
            { id: 'estagios_realizados', label: '3. Estágios Realizados', icon: Stethoscope },
            { id: 'estagios_pendentes', label: '4. Estágios Pendentes', icon: AlertTriangle },
            { id: 'professores', label: '5. Pesquisa Professores', icon: GraduationCap },
            { id: 'matriculas', label: '6. Pesquisa Matrículas', icon: FileText },
            { id: 'historico_matriculas', label: '7. Histórico de Matrículas', icon: History },
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as SubTab);
                  setSelectedStudentId('');
                  setSearchTerm('');
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
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
      {/* 1. SUBMENU: PESQUISA ALUNO / DOSSIÊ DO ALUNO */}
      {/* ========================================================================================= */}
      {activeSubTab === 'aluno' && (
        <div className="space-y-6">
          
          {/* Smart Search Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisa Inteligente por Nome do Aluno, Matrícula, CPF, E-mail, WhatsApp ou Dossiê..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* If a Student is Selected: Show Dossier View */}
          {selectedStudent ? (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-8 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                    <p className="text-xs text-blue-600 font-bold">Matrícula: {selectedStudent.enrollment || '2026.1.ENF.089'} • Dossiê nº: {selectedStudentDetails?.dossierNumber || 'DOS-2026-089'}</p>
                    <p className="text-[11px] text-slate-500">Cadastrado em: {selectedStudentDetails?.createdAt ? new Date(selectedStudentDetails.createdAt).toLocaleDateString('pt-BR') : '15/01/2026'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      recordAccess(selectedStudent.id, 'PESQUISA_ALUNO', `Imprimiu Ficha Dossiê do Aluno ${selectedStudent.name}`);
                      const html = `
                        <div style="font-family: Arial, sans-serif; padding: 25px; color: #0f172a;">
                          <h1 style="text-align: center; color: #1e3a8a; font-size: 20px; text-transform: uppercase;">Dossiê do Aluno - Ficha Acadêmica Integrada</h1>
                          <hr style="border: 1px solid #1e3a8a; margin-bottom: 20px;" />
                          
                          <table style="width: 100%; font-size: 12px; margin-bottom: 20px; line-height: 1.6;">
                            <tr><td><strong>Nome Completo:</strong> ${selectedStudent.name}</td><td><strong>Matrícula:</strong> ${selectedStudent.enrollment || '-'}</td></tr>
                            <tr><td><strong>CPF:</strong> ${selectedStudent.cpf || selectedStudentDetails?.cpf || '-'}</td><td><strong>RG:</strong> ${selectedStudentDetails?.rg || '-'} (${selectedStudentDetails?.rgIssuer || 'SSP'}/${selectedStudentDetails?.rgUf || 'PB'})</td></tr>
                            <tr><td><strong>Mãe:</strong> ${selectedStudentDetails?.motherName || '-'}</td><td><strong>Pai:</strong> ${selectedStudentDetails?.fatherName || '-'}</td></tr>
                            <tr><td><strong>Nascimento:</strong> ${selectedStudentDetails?.birthDate || '-'}</td><td><strong>Estado Civil:</strong> ${selectedStudentDetails?.maritalStatus || 'Solteiro(a)'}</td></tr>
                            <tr><td><strong>WhatsApp:</strong> ${selectedStudentDetails?.whatsapp || selectedStudent.phone || '-'}</td><td><strong>E-mail:</strong> ${selectedStudent.email || '-'}</td></tr>
                            <tr><td><strong>Endereço:</strong> ${selectedStudentDetails?.address || 'Rua Principal, 100'} - ${selectedStudentDetails?.neighborhood || 'Centro'}, ${selectedStudentDetails?.city || 'João Pessoa'} - ${selectedStudentDetails?.state || 'PB'}</td><td><strong>CEP:</strong> ${selectedStudentDetails?.cep || '58000-000'}</td></tr>
                          </table>

                          <h3 style="background: #1e3a8a; color: white; padding: 6px 12px; font-size: 12px; border-radius: 4px;">VINCULAÇÃO ACADÊMICA ATIVA</h3>
                          <p style="font-size: 12px;">Curso: <strong>${courses.find(c => c.id === selectedStudent.courseId)?.name || 'Técnico em Enfermagem'}</strong> | Turma: <strong>${classes.find(c => c.id === selectedStudent.classId)?.name || 'Turma A'}</strong></p>

                          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #64748b;">
                            Emitido via Central de Pesquisas Acadêmicas em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
                          </div>
                        </div>
                      `;
                      setPrintDoc({ title: `Dossiê Completo - ${selectedStudent.name}`, contentHtml: html });
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Imprimir Dossiê
                  </button>

                  <button
                    onClick={() => setSelectedStudentId('')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl cursor-pointer"
                  >
                    Voltar para Busca
                  </button>
                </div>
              </div>

              {/* Dossier Tabs / Sections */}
              <div className="space-y-6">
                
                {/* 1. Dados Pessoais & Documentação */}
                <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-700">
                    <UserIcon className="h-4 w-4 text-blue-600" /> Dados Pessoais, Filiação e Contato
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div><span className="text-slate-500 font-bold block">Nome da Mãe:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudentDetails?.motherName || 'Maria Silva'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Nome do Pai:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudentDetails?.fatherName || 'João Silva'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">CPF:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudent.cpf || selectedStudentDetails?.cpf || '000.000.000-00'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">RG / Órgão:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudentDetails?.rg || '1234567'} {selectedStudentDetails?.rgIssuer || 'SSP'}/{selectedStudentDetails?.rgUf || 'PB'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Data de Nascimento:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudentDetails?.birthDate || '10/05/2000'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Estado Civil:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudentDetails?.maritalStatus || 'Solteiro(a)'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">WhatsApp:</span> <strong className="text-emerald-600 font-black">{selectedStudentDetails?.whatsapp || selectedStudent.phone || '(83) 98888-0000'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">E-mail:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudent.email || 'aluno@email.com'}</strong></div>
                    <div><span className="text-slate-500 font-bold block">Profissão:</span> <strong className="text-slate-900 dark:text-slate-100">{selectedStudentDetails?.profession || 'Estudante'}</strong></div>
                  </div>
                </div>

                {/* 2. Resumo da Trajetória Acadêmica */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-blue-600" /> Trajetória e Histórico no Sistema
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    
                    {/* Matrículas & Mudanças */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block border-b pb-1">Historico de Matrículas & Transferências</span>
                      <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                        <li>• Matrícula inicial realizada em <strong className="text-blue-600">15/01/2026</strong>.</li>
                        <li>• Turma alocada: <strong>Turma ENF-2026-A</strong>.</li>
                        {transfers.filter(t => t.studentId === selectedStudent.id).map(t => (
                          <li key={t.id} className="text-amber-600 font-bold">• Transferência em {t.transferredAt}: {t.oldCourseName} → {t.newCourseName}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Financeiro Resumo */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block border-b pb-1">Resumo Financeiro</span>
                      {(() => {
                        const stInstallments = installments.filter(i => i.studentId === selectedStudent.id);
                        const totalPagas = stInstallments.filter(i => i.status === 'PAGA').length;
                        const totalOpen = stInstallments.filter(i => i.status === 'PENDENTE' || i.status === 'ATRASADA').length;
                        return (
                          <div className="space-y-1">
                            <p>Parcelas Quitadas: <strong className="text-emerald-600">{totalPagas} parcelas</strong></p>
                            <p>Parcelas em Aberto: <strong className="text-amber-600">{totalOpen} parcelas</strong></p>
                            <p className="text-[11px] text-slate-500 font-medium">Situação geral: {totalOpen === 0 ? 'Regular' : 'Com pendências financeiras'}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Estágios Alocados */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block border-b pb-1">Estágios Supervisionados</span>
                      {(() => {
                        const stEvals = stageEvaluations.filter(e => e.studentId === selectedStudent.id);
                        return (
                          <div className="space-y-1">
                            {stEvals.length === 0 ? (
                              <p className="text-slate-400">Nenhum estágio concluído registrado.</p>
                            ) : (
                              stEvals.map(ev => {
                                const stageName = (ev as any).stageName || stageDefinitions.find(d => d.id === (ev as any).stageId)?.stageName || 'Estágio Supervisão';
                                const finalGrade = ev.grade ?? ev.finalGrade ?? 0;
                                const status = ev.approved ? 'APROVADO' : (ev.status || 'EM_ANDAMENTO');
                                return (
                                  <div key={ev.id} className="flex justify-between text-slate-800 dark:text-slate-200">
                                    <span>{stageName}:</span>
                                    <strong className="text-emerald-600">Nota {finalGrade} ({status})</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Requerimentos Solicitados */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-900 dark:text-white block border-b pb-1">Requerimentos / Protocolos</span>
                      {(() => {
                        const stReqs = requirements.filter(r => r.studentId === selectedStudent.id);
                        return (
                          <div className="space-y-1">
                            {stReqs.length === 0 ? (
                              <p className="text-slate-400">Nenhum requerimento aberto.</p>
                            ) : (
                              stReqs.map(req => (
                                <div key={req.id} className="flex justify-between">
                                  <span>{req.documentName || req.type}</span>
                                  <span className="font-bold text-blue-600">{req.status}</span>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Student Search List Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentsList
                .filter(s => {
                  const d = detailedStudentsMap[s.id] || ({} as Partial<DetailedStudent>);
                  const term = searchTerm.toLowerCase();
                  return (
                    s.name.toLowerCase().includes(term) ||
                    (s.cpf || d.cpf || '').includes(term) ||
                    (s.enrollment || '').toLowerCase().includes(term) ||
                    (s.email || '').toLowerCase().includes(term) ||
                    (d.whatsapp || s.phone || '').includes(term)
                  );
                })
                .map(student => {
                  const d = detailedStudentsMap[student.id] || ({} as Partial<DetailedStudent>);
                  return (
                    <div 
                      key={student.id} 
                      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3 relative group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{student.name}</h3>
                          <p className="text-xs text-blue-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                          <p className="text-[11px] text-slate-500 font-medium">CPF: {student.cpf || d.cpf || 'Não informado'}</p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
                        <div>Curso: <strong>{courses.find(c => c.id === student.courseId)?.name || 'Técnico em Enfermagem'}</strong></div>
                        <div>Turma: <strong>{classes.find(c => c.id === student.classId)?.name || 'Turma A'}</strong></div>
                        <div>WhatsApp: <strong>{d.whatsapp || student.phone || '(83) 98888-0000'}</strong></div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          recordAccess(student.id, 'PESQUISA_ALUNO', `Acessou Dossiê Completo de ${student.name}`);
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
                      >
                        <Eye className="h-4 w-4" /> Abrir Dossiê Completo
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================================= */}
      {/* 2. SUBMENU: PESQUISA HISTÓRICO FINANCEIRO DO ALUNO */}
      {/* ========================================================================================= */}
      {activeSubTab === 'financeiro' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Histórico Financeiro por Nome do Aluno, Matrícula ou CPF..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {selectedStudent ? (
            /* Selected Student Financial History */
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-8 animate-fadeIn">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">Extrato Financeiro do Aluno</h2>
                  <p className="text-xs text-blue-600 font-bold">{selectedStudent.name} • Matrícula: {selectedStudent.enrollment || '2026.1.ENF.089'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      recordAccess(selectedStudent.id, 'PESQUISA_FINANCEIRO', `Imprimiu Extrato Financeiro de ${selectedStudent.name}`);
                      const stInstallments = installments.filter(i => i.studentId === selectedStudent.id);
                      const rows = stInstallments.map(inst => `
                        <tr>
                          <td style="padding: 6px; border: 1px solid #ddd;">${inst.number}ª Parcela</td>
                          <td style="padding: 6px; border: 1px solid #ddd;">R$ ${inst.originalValue.toFixed(2)}</td>
                          <td style="padding: 6px; border: 1px solid #ddd;">${inst.dueDate}</td>
                          <td style="padding: 6px; border: 1px solid #ddd;">${inst.paidAt || '-'}</td>
                          <td style="padding: 6px; border: 1px solid #ddd;">${inst.paidMethod || '-'}</td>
                          <td style="padding: 6px; border: 1px solid #ddd;">${inst.receiptNumber || '-'}</td>
                          <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold;">${inst.status}</td>
                        </tr>
                      `).join('');

                      const html = `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                          <h2 style="text-align: center; color: #1e3a8a;">EXTRATO DE HISTÓRICO FINANCEIRO DO ALUNO</h2>
                          <p style="text-align: center; font-size: 12px; color: #475569;">Aluno: <strong>${selectedStudent.name}</strong> | CPF: ${selectedStudent.cpf || '-'} | Matrícula: ${selectedStudent.enrollment || '-'}</p>
                          <hr style="margin-bottom: 20px;" />
                          
                          <table style="width: 100%; font-size: 11px; border-collapse: collapse; text-align: left;">
                            <thead>
                              <tr style="background: #1e3a8a; color: white;">
                                <th style="padding: 8px;">Parcela</th>
                                <th style="padding: 8px;">Valor</th>
                                <th style="padding: 8px;">Vencimento</th>
                                <th style="padding: 8px;">Pagamento</th>
                                <th style="padding: 8px;">Forma</th>
                                <th style="padding: 8px;">Recibo nº</th>
                                <th style="padding: 8px;">Situação</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${rows || '<tr><td colspan="7" style="padding: 10px; text-align: center;">Nenhuma parcela gerada.</td></tr>'}
                            </tbody>
                          </table>

                          <div style="margin-top: 40px; text-align: center; font-size: 11px; color: #64748b;">
                            Emitido via Sistema de Gestão Financeira Escolar em ${new Date().toLocaleDateString('pt-BR')}.
                          </div>
                        </div>
                      `;
                      setPrintDoc({ title: `Histórico Financeiro - ${selectedStudent.name}`, contentHtml: html });
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Imprimir Histórico Financeiro
                  </button>

                  <button
                    onClick={() => setSelectedStudentId('')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </div>

              {/* Installments Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Parcelas e Mensalidades</h3>
                
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                        <th className="p-3">Nº Parcela</th>
                        <th className="p-3">Valor (R$)</th>
                        <th className="p-3">Vencimento</th>
                        <th className="p-3">Data Pagamento</th>
                        <th className="p-3">Forma Pagamento</th>
                        <th className="p-3">Usuário Resp.</th>
                        <th className="p-3">Recibo nº</th>
                        <th className="p-3">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold text-slate-800 dark:text-slate-200">
                      {installments.filter(i => i.studentId === selectedStudent.id).map(inst => (
                        <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">{inst.number}ª Parcela</td>
                          <td className="p-3">R$ {inst.originalValue.toFixed(2)}</td>
                          <td className="p-3">{inst.dueDate}</td>
                          <td className="p-3">{inst.paidAt || '-'}</td>
                          <td className="p-3">{inst.paidMethod || '-'}</td>
                          <td className="p-3">{inst.waivedBy || 'Tesouraria'}</td>
                          <td className="p-3">{inst.receiptNumber || '-'}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              inst.status === 'PAGA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              inst.status === 'ATRASADA' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                              inst.status === 'ABONADA' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {inst.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Notes / Administrative Exemptions */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="font-black text-slate-900 dark:text-white block">Observações e Acordos Financeiros</span>
                <p className="text-slate-600 dark:text-slate-400">
                  {financialNotes.find(n => n.studentId === selectedStudent.id)?.description || 'Nenhuma observação financeira registrada para este aluno.'}
                </p>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentsList
                .filter(s => {
                  const d = detailedStudentsMap[s.id] || ({} as Partial<DetailedStudent>);
                  const term = searchTerm.toLowerCase();
                  return (
                    s.name.toLowerCase().includes(term) ||
                    (s.cpf || d.cpf || '').includes(term) ||
                    (s.enrollment || '').toLowerCase().includes(term)
                  );
                })
                .map(student => {
                  const stInstallments = installments.filter(i => i.studentId === student.id);
                  const totalPaid = stInstallments.filter(i => i.status === 'PAGA').reduce((sum, i) => sum + i.originalValue, 0);
                  const totalPending = stInstallments.filter(i => i.status === 'PENDENTE' || i.status === 'ATRASADA').reduce((sum, i) => sum + i.originalValue, 0);

                  return (
                    <div key={student.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                          <p className="text-xs text-blue-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                        </div>
                        <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                          <DollarSign className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
                        <div>
                          <span className="text-slate-500 font-bold block">Pago:</span>
                          <strong className="text-emerald-600 font-black">R$ {totalPaid.toFixed(2)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">Pendente:</span>
                          <strong className="text-amber-600 font-black">R$ {totalPending.toFixed(2)}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          recordAccess(student.id, 'PESQUISA_FINANCEIRO', `Consultou Histórico Financeiro de ${student.name}`);
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Ver Extrato Financeiro
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================================= */}
      {/* 3. SUBMENU: PESQUISA HISTÓRICO DE ESTÁGIOS REALIZADOS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'estagios_realizados' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Estágios Concluídos por Aluno, Matrícula ou Hospital/Campo..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-600" /> Registro de Estágios Realizados / Avaliados
              </h3>

              <button
                onClick={() => {
                  handleExportCsv(
                    'Estagios_Realizados',
                    ['Aluno', 'Matrícula', 'Estágio', 'Nota Final', 'Situação', 'Professor Orientador'],
                    stageEvaluations.map(e => [
                      e.studentName, 
                      e.enrollmentNumber || '-', 
                      (e as any).stageName || 'Estágio Supervisão', 
                      e.grade ?? e.finalGrade ?? 0, 
                      e.approved ? 'APROVADO' : (e.status || 'EM_ANDAMENTO'), 
                      e.teacherName || '-'
                    ])
                  );
                }}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stageEvaluations
                .filter(e => {
                  const term = searchTerm.toLowerCase();
                  const stageName = (e as any).stageName || '';
                  return (
                    e.studentName.toLowerCase().includes(term) ||
                    (e.enrollmentNumber || '').toLowerCase().includes(term) ||
                    stageName.toLowerCase().includes(term)
                  );
                })
                .map(ev => {
                  const stageName = (ev as any).stageName || stageDefinitions.find(d => d.id === (ev as any).stageId)?.stageName || 'Estágio Supervisionado';
                  const finalGrade = ev.grade ?? ev.finalGrade ?? 0;
                  const statusLabel = ev.approved ? 'APROVADO' : (ev.status || 'EM_ANDAMENTO');
                  const techGrade = ev.techGrade ?? ev.technicalGrade ?? finalGrade;

                  return (
                    <div key={ev.id} className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">{ev.studentName}</h4>
                          <p className="text-xs text-blue-600 font-bold">{stageName} • Matrícula: {ev.enrollmentNumber || '2026.1.ENF.089'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                          statusLabel === 'APROVADO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 font-bold">
                        <div>Nota Prática: <strong className="text-emerald-600">{techGrade}</strong></div>
                        <div>Horas Concluídas: <strong>{ev.completedHours || 120}h</strong></div>
                        <div>Média Final: <strong className="text-blue-600">{finalGrade}</strong></div>
                        <div>Supervisor: <strong>{ev.teacherName || 'Docente Orientador'}</strong></div>
                      </div>

                      {(ev.comments || (ev as any).generalObservations) && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                          "{ev.comments || (ev as any).generalObservations}"
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* 4. SUBMENU: PESQUISA HISTÓRICO DE ESTÁGIOS NÃO REALIZADOS (PENDENTES) */}
      {/* ========================================================================================= */}
      {activeSubTab === 'estagios_pendentes' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Aluno para Comparar Grade Curricular de Estágios x Realizados..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentsList
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
              .map(student => {
                const doneStages = stageEvaluations.filter(e => e.studentId === student.id && (e.approved || e.status === 'APROVADO'));
                const doneIds = doneStages.map(d => (d as any).stageId || d.vacancyId);
                const pendingStages = stageDefinitions.filter(sd => !doneIds.includes(sd.id));

                return (
                  <div key={student.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                        <p className="text-xs text-blue-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded-full text-[10px] font-black">
                        {pendingStages.length} Estágios Pendentes
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-bold">
                      {stageDefinitions.map(def => {
                        const isDone = doneIds.includes(def.id);
                        return (
                          <div key={def.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            isDone 
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300' 
                              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                              <span>{def.stageName} ({def.workloadHours}h)</span>
                            </div>
                            <span className="text-[10px] uppercase font-black">
                              {isDone ? '✔ Concluído' : '❌ PENDENTE'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* 5. SUBMENU: PESQUISA PROFESSORES */}
      {/* ========================================================================================= */}
      {activeSubTab === 'professores' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar Professor por Nome, CPF, Conselho ou Especialidade..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Advanced Filter: Tipo de Professor */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-slate-500">Tipo de Professor:</span>
                <select
                  value={teacherTypeFilter}
                  onChange={(e) => setTeacherTypeFilter(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-black text-slate-800 dark:text-white"
                >
                  <option value="TODOS">Todos os Tipos</option>
                  <option value="SALA_DE_AULA">Sala de Aula</option>
                  <option value="ESTAGIO">Estágio Supervisionado</option>
                  <option value="AMBOS">Ambos (Sala + Estágio)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachersList
              .filter(t => {
                const d = detailedTeachersMap[t.id] || ({} as Partial<DetailedTeacher>);
                const term = searchTerm.toLowerCase();
                const matchesSearch = 
                  t.name.toLowerCase().includes(term) ||
                  (t.cpf || d.cpf || '').includes(term) ||
                  (d.councilNumber || '').includes(term) ||
                  (d.specialty || '').toLowerCase().includes(term);

                const matchesType = 
                  teacherTypeFilter === 'TODOS' || 
                  d.teacherType === teacherTypeFilter || 
                  d.teacherType === 'AMBOS';

                return matchesSearch && matchesType;
              })
              .map(teacher => {
                const d = detailedTeachersMap[teacher.id] || ({} as Partial<DetailedTeacher>);
                return (
                  <div key={teacher.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{teacher.name}</h3>
                        <p className="text-xs text-purple-600 font-bold">{d.council || d.councilType || 'COREN'} {d.councilNumber || '184.920'} / {d.councilUf || 'PB'}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl font-bold">
                      <div>Titulação: <strong>{d.academicTitle || 'Especialista'}</strong></div>
                      <div>Especialidade: <strong>{d.specialty || 'Saúde da Família / UTIP'}</strong></div>
                      <div>Tipo de Atuação: <strong className="text-purple-600 dark:text-purple-300 uppercase">{d.teacherType ? d.teacherType.replace('_', ' ') : 'SALA E ESTÁGIO'}</strong></div>
                      <div>WhatsApp: <strong>{d.whatsapp || teacher.phone || '(83) 98888-1111'}</strong></div>
                    </div>
                  </div>
                );
              })}
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* 6. SUBMENU: PESQUISA MATRÍCULAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'matriculas' && (
        <div className="space-y-6">
          
          {/* Sub Tab Navigation for Matrículas */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {[
              { id: 'novas', label: 'Matrículas Novas do Semestre' },
              { id: 'todas', label: 'Todas as Matrículas (Hierárquico)' },
              { id: 'estagio', label: 'Matrículas de Estágio' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMatriculaTab(m.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  matriculaTab === m.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Quadro Geral de Matrículas
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleExportCsv(
                      'Matriculas_Gerais',
                      ['Matrícula', 'Aluno', 'Curso', 'Turma', 'Situação'],
                      studentsList.map(s => [s.enrollment || '-', s.name, courses.find(c => c.id === s.courseId)?.name || 'Técnico em Enfermagem', classes.find(c => c.id === s.classId)?.name || 'Turma A', 'ATIVO'])
                    );
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
                </button>
              </div>
            </div>

            {/* Hierarchical Tree: Course -> Class -> Students */}
            <div className="space-y-4">
              {courses.map(course => {
                const courseClasses = classes.filter(c => c.courseId === course.id);
                return (
                  <div key={course.id} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="font-black text-sm text-blue-900 dark:text-blue-300 uppercase flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Curso: {course.name}
                    </h4>

                    <div className="pl-4 space-y-3">
                      {courseClasses.length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhuma turma cadastrada para este curso.</p>
                      ) : (
                        courseClasses.map(cls => {
                          const classStudents = studentsList.filter(s => s.classId === cls.id);
                          return (
                            <div key={cls.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                              <span className="text-xs font-black text-indigo-600 flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5" /> Turma: {cls.name || cls.code} ({classStudents.length} Alunos Matriculados)
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-3">
                                {classStudents.map(st => (
                                  <div key={st.id} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 flex justify-between">
                                    <span>{st.name}</span>
                                    <span className="text-[10px] text-blue-600">{st.enrollment || '2026.1.ENF.089'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* 7. SUBMENU: PESQUISA HISTÓRICO DE MATRÍCULAS */}
      {/* ========================================================================================= */}
      {activeSubTab === 'historico_matriculas' && (
        <div className="space-y-6">
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar Trajetória Acadêmica Completa por Nome do Aluno ou Matrícula..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studentsList
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.enrollment || '').includes(searchTerm))
              .map(student => (
                <div key={student.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{student.name}</h3>
                      <p className="text-xs text-blue-600 font-bold">Matrícula: {student.enrollment || '2026.1.ENF.089'}</p>
                    </div>
                    <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
                      <History className="h-5 w-5" />
                    </span>
                  </div>

                  {/* Academic Timeline */}
                  <div className="space-y-2 text-xs border-l-2 border-blue-600 pl-3">
                    <div className="space-y-1">
                      <span className="font-black text-blue-600">2026/1 - Período Atual</span>
                      <p className="text-slate-700 dark:text-slate-300 font-bold">Curso Técnico em Enfermagem • Turma A • Situação: CURSANDO</p>
                    </div>
                    <div className="space-y-1 text-slate-500">
                      <span className="font-black">2025/2 - Semestre Anterior</span>
                      <p className="font-bold">Módulo I - Fundamentos da Saúde • Concluído com Sucesso</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* ACCESS AUDIT LOG MODAL */}
      {/* ========================================================================================= */}
      {showAuditLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden animate-fadeIn">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-400/30">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">Registro de Acessos & Auditoria de Consultas</h3>
              </div>
              <button
                onClick={() => setShowAuditLogModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum registro de acesso registrado no momento.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <strong className="text-blue-600 font-extrabold">{log.performedBy}</strong>
                      <p className="text-slate-800 dark:text-slate-200 font-bold">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* PRINTABLE DOCUMENT MODAL */}
      {/* ========================================================================================= */}
      {printDoc && (
        <MovimentacaoDocumentPrintModal
          title={printDoc.title}
          subtitle={printDoc.subtitle}
          contentHtml={printDoc.contentHtml}
          onClose={() => setPrintDoc(null)}
        />
      )}

    </div>
  );
};
