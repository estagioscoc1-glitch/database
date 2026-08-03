import { 
  CurriculumGrade, StudentEnrollment, TransferRecord, CancelationRecord, 
  DependencyEnrollment, DocumentRequirementConfig, StudentRequirementRequest, 
  OfficialTemplate, EventMinicourse, EventParticipant, StageRequirementConfig, 
  StageDefinition, StageVacancy, StageEvaluation, StageScheduleItem, StageTeacherReceipt,
  StageField, StageTeacher, StageCronograma
} from '../types/movimentacao';
import { addFinancialAuditLog, saveMiscPaymentCatalog, generateStudentInstallments, getInstallments, saveInstallments } from './financeiroStorage';
import { addAuditLog } from './cadastrosStorage';

// LocalStorage Keys
const KEYS = {
  CURRICULUMS: 'movimentacao_curriculums',
  ENROLLMENTS: 'movimentacao_enrollments',
  TRANSFERS: 'movimentacao_transfers',
  CANCELATIONS: 'movimentacao_cancelations',
  DEPENDENCIES: 'movimentacao_dependencies',
  REQUIREMENT_CONFIGS: 'movimentacao_req_configs',
  REQUIREMENT_REQUESTS: 'movimentacao_req_requests',
  OFFICIAL_TEMPLATES: 'movimentacao_official_templates',
  EVENTS: 'movimentacao_events',
  EVENT_PARTICIPANTS: 'movimentacao_event_participants',
  STAGE_REQ_CONFIG: 'movimentacao_stage_req_config',
  STAGE_DEFINITIONS: 'movimentacao_stage_definitions',
  STAGE_VACANCIES: 'movimentacao_stage_vacancies',
  STAGE_EVALUATIONS: 'movimentacao_stage_evaluations',
  STAGE_SCHEDULES: 'movimentacao_stage_schedules',
  STAGE_RECEIPTS: 'movimentacao_stage_receipts',
  STAGE_FIELDS: 'movimentacao_stage_fields',
  STAGE_TEACHERS: 'movimentacao_stage_teachers',
  STAGE_CRONOGRAMAS: 'movimentacao_stage_cronogramas',
};

// Initial Seed Data
const defaultCurriculums: CurriculumGrade[] = [
  {
    id: 'curr_enf_01',
    courseId: 'c1',
    courseName: 'Técnico em Enfermagem',
    modality: 'Presencial',
    teachingType: 'Técnico',
    subjects: [
      { id: 'sub_enf_1', name: 'Anatomia e Fisiologia Humana', workloadHours: 80, order: 1, module: 1, code: 'ANAT80' },
      { id: 'sub_enf_2', name: 'Biossegurança e MicroBiologia', workloadHours: 40, order: 2, module: 1, code: 'BIOS40' },
      { id: 'sub_enf_3', name: 'Primeiros Socorros e APH', workloadHours: 60, order: 3, module: 1, code: 'SOC60' },
      { id: 'sub_enf_4', name: 'Fundamentos de Enfermagem', workloadHours: 100, order: 1, module: 2, code: 'FUND100' },
      { id: 'sub_enf_5', name: 'Farmacologia Aplicada', workloadHours: 80, order: 2, module: 2, code: 'FARM80' },
      { id: 'sub_enf_6', name: 'Enfermagem Clínica e Cirúrgica', workloadHours: 120, order: 1, module: 3, code: 'ENFC120' },
    ],
    createdAt: '2025-01-10T10:00:00.000Z',
    updatedAt: '2025-01-10T10:00:00.000Z'
  },
  {
    id: 'curr_rad_01',
    courseId: 'c2',
    courseName: 'Técnico em Radiologia',
    modality: 'Presencial',
    teachingType: 'Técnico',
    subjects: [
      { id: 'sub_rad_1', name: 'Física das Radiações', workloadHours: 60, order: 1, module: 1, code: 'FISRAD' },
      { id: 'sub_rad_2', name: 'Anatomia Radiológica', workloadHours: 80, order: 2, module: 1, code: 'ANATRAD' },
      { id: 'sub_rad_3', name: 'Técnicas Radiográficas I', workloadHours: 100, order: 1, module: 2, code: 'TECRA1' },
      { id: 'sub_rad_4', name: 'Proteção Radiológica', workloadHours: 60, order: 2, module: 2, code: 'PROTRAD' },
    ],
    createdAt: '2025-01-10T10:00:00.000Z',
    updatedAt: '2025-01-10T10:00:00.000Z'
  }
];

const defaultRequirementConfigs: DocumentRequirementConfig[] = [
  {
    id: 'req_cfg_1',
    name: 'Declaração de Escolaridade e Matrícula',
    type: 'Declaração',
    deliveryDays: 2,
    feeValue: 0.00,
    isFeeMandatory: false,
    rules: { requireNoOverdueInstallments: true, requireFeePaid: false, requireActiveEnrollment: true },
    customConditions: [
      { id: 'cond_1', name: 'Matrícula Ativa no Semestre/Período', key: 'ACTIVE_ENROLLMENT', required: true, description: 'O aluno deve estar devidamente matriculado' },
      { id: 'cond_2', name: 'Documentos Obrigatórios Entregues', key: 'DOCS_DELIVERED', required: false, description: 'Documentos básicos da matrícula checados' }
    ],
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'req_cfg_2',
    name: 'Histórico Escolar Parcial / Final',
    type: 'Histórico',
    deliveryDays: 5,
    feeValue: 25.00,
    isFeeMandatory: true,
    rules: { requireNoOverdueInstallments: true, requireFeePaid: true, requireActiveEnrollment: true },
    customConditions: [
      { id: 'cond_3', name: 'Parcelas e Débitos do Período Quitados', key: 'SEMESTER_PAID', required: true, description: 'Sem mensalidades em atraso' },
      { id: 'cond_4', name: 'Taxa do Requerimento Quitada', key: 'FEE_PAID', required: true, description: 'Pagamento da taxa de R$ 25,00 confirmado' }
    ],
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'req_cfg_3',
    name: 'Guia de Transferência Externa',
    type: 'Transferência',
    deliveryDays: 10,
    feeValue: 50.00,
    isFeeMandatory: true,
    rules: { requireNoOverdueInstallments: true, requireFeePaid: true, requireActiveEnrollment: false },
    customConditions: [
      { id: 'cond_5', name: 'Período e Mensalidades do Semestre Quitados', key: 'SEMESTER_PAID', required: true, description: 'Quitação financeira do período letivo' },
      { id: 'cond_6', name: 'Solicitação de Cancelamento/Desistência Formalizada', key: 'CANCELED_ENROLLMENT', required: true, description: 'Trancamento ou cancelamento efetuado' },
      { id: 'cond_7', name: 'Taxa do Requerimento Quitada', key: 'FEE_PAID', required: true, description: 'Pagamento da taxa efetuado' }
    ],
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 'req_cfg_4',
    name: 'Segunda Via de Diploma / Certificado de Conclusão',
    type: 'Diploma',
    deliveryDays: 15,
    feeValue: 120.00,
    isFeeMandatory: true,
    rules: { requireNoOverdueInstallments: true, requireFeePaid: true, requireActiveEnrollment: false },
    customConditions: [
      { id: 'cond_8', name: 'Todas as Parcelas do Curso Quitadas (Quitação Integral)', key: 'NO_OVERDUE', required: true, description: 'Inexistência de débitos em todas as mensalidades' },
      { id: 'cond_9', name: 'Todos os Estágios Supervisionados Concluídos e Aprovados', key: 'STAGES_COMPLETED', required: true, description: 'Relatórios e avaliações de estágio entregues e aprovados' },
      { id: 'cond_10', name: 'Todos os Documentos de Matrícula Entregues', key: 'DOCS_DELIVERED', required: true, description: 'RG, CPF, Histórico Médio, Certidão, Fotos' },
      { id: 'cond_11', name: 'Taxa do Diploma Quitada', key: 'FEE_PAID', required: true, description: 'Pagamento da taxa do diploma confirmado' }
    ],
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];

const defaultOfficialTemplates: OfficialTemplate[] = [
  {
    id: 'tpl_contrato_geral',
    title: 'Contrato Padrão de Prestação de Serviços Educacionais',
    docType: 'CONTRATO',
    contentHtml: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; color: #1e293b;">
      <h2 style="text-align: center; font-weight: bold; text-transform: uppercase;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h2>
      <p style="text-align: justify; margin-top: 20px;">
        Pelo presente instrumento particular, de um lado a <strong>INSTITUIÇÃO DE ENSINO TÉCNICO E SUPERIOR OSWALDO CRUZ</strong>, e de outro lado o(a) ALUNO(A) <strong>{NOME_ALUNO}</strong>, portador(a) do CPF nº <strong>{CPF}</strong>, doravante denominado CONTRATANTE, matriculado(a) sob o número <strong>{MATRICULA}</strong> no curso de <strong>{CURSO}</strong> (Turma: <strong>{TURMA}</strong>, Turno: <strong>{TURNO}</strong>).
      </p>
      <h3 style="margin-top: 15px; font-weight: bold;">CLÁUSULA PRIMEIRA - DO OBJETO</h3>
      <p style="text-align: justify;">O objeto do presente contrato é a prestação de serviços educacionais correspondente ao ano letivo vigente para o curso acima indicado.</p>
      <h3 style="margin-top: 15px; font-weight: bold;">CLÁUSULA SEGUNDA - DOS VALORES E PLANO FINANCEIRO</h3>
      <p style="text-align: justify;">Pelos serviços educacionais prestados, o CONTRATANTE pagará o valor total de R$ {VALOR_TOTAL}, distribuídos em taxa de matrícula de R$ {VALOR_MATRICULA} e {NUMERO_PARCELAS} parcelas mensais no valor de R$ {VALOR_PARCELA}.</p>
      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 45%; border-top: 1px solid #000; pt-2;">Instituição de Ensino Oswaldo Cruz</div>
        <div style="text-align: center; width: 45%; border-top: 1px solid #000; pt-2;">Assinatura do Aluno / Responsável Legal</div>
      </div>
    </div>`,
    version: '1.0',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Coordenação Geral'
  },
  {
    id: 'tpl_req_matricula',
    title: 'Requerimento Oficial de Matrícula',
    docType: 'REQUERIMENTO',
    contentHtml: `<div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5;">
      <h2 style="text-align: center;">REQUERIMENTO DE MATRÍCULA ACADÊMICA</h2>
      <p>Eu, <strong>{NOME_ALUNO}</strong>, CPF <strong>{CPF}</strong>, solicito minha matrícula regular no curso <strong>{CURSO}</strong>, Turma <strong>{TURMA}</strong>, para o período letivo <strong>{SEMESTRE}</strong>.</p>
      <p style="margin-top: 20px;">Declaro estar ciente e de acordo com o Regimento Escolar e normas regimentais da instituição.</p>
      <div style="margin-top: 50px; text-align: center; border-top: 1px dashed #333; padding-top: 10px; width: 60%; margin-left: auto; margin-right: auto;">
        Assinatura do Requerente
      </div>
    </div>`,
    version: '1.0',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Secretaria Acadêmica'
  }
];

const defaultEvents: EventMinicourse[] = [];

const defaultStageDefinition: StageDefinition[] = [];

const defaultStageVacancies: StageVacancy[] = [];

const defaultStageReqConfig: StageRequirementConfig = {
  id: 'stg_req_default',
  insurancePaid: true,
  kitPaid: true,
  tuitionUpToDate: true,
  activeEnrollment: true
};

// --- Storage Helper Functions ---

export function getCurriculums(): CurriculumGrade[] {
  const data = localStorage.getItem(KEYS.CURRICULUMS);
  if (!data) {
    localStorage.setItem(KEYS.CURRICULUMS, JSON.stringify(defaultCurriculums));
    return defaultCurriculums;
  }
  return JSON.parse(data);
}

export function saveCurriculums(curriculums: CurriculumGrade[]): void {
  localStorage.setItem(KEYS.CURRICULUMS, JSON.stringify(curriculums));
}

export function getEnrollments(): StudentEnrollment[] {
  const data = localStorage.getItem(KEYS.ENROLLMENTS);
  return data ? JSON.parse(data) : [];
}

export function saveEnrollment(enrollment: StudentEnrollment, operator: string): void {
  const list = getEnrollments();
  const idx = list.findIndex(e => e.id === enrollment.id);
  if (idx >= 0) {
    list[idx] = enrollment;
  } else {
    list.push(enrollment);
  }
  localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(list));
  addAuditLog(enrollment.id, 'ALUNO', 'CRIADO', operator, `Matrícula #${enrollment.enrollmentNumber} criada para ${enrollment.studentName} no curso ${enrollment.courseName}`);
}

export function getTransfers(): TransferRecord[] {
  const data = localStorage.getItem(KEYS.TRANSFERS);
  return data ? JSON.parse(data) : [];
}

export function recordTransfer(transfer: TransferRecord, operator: string): void {
  const list = getTransfers();
  list.unshift(transfer);
  localStorage.setItem(KEYS.TRANSFERS, JSON.stringify(list));
  
  // Update student enrollment if exists
  const enrollments = getEnrollments();
  const enrIdx = enrollments.findIndex(e => e.studentId === transfer.studentId && e.status === 'ATIVA');
  if (enrIdx >= 0) {
    if (transfer.transferType === 'TURMA' && transfer.newClassId && transfer.newClassName) {
      enrollments[enrIdx].classId = transfer.newClassId;
      enrollments[enrIdx].className = transfer.newClassName;
    } else if (transfer.transferType === 'TURNO' && transfer.newShift) {
      enrollments[enrIdx].shift = transfer.newShift as any;
    } else if (transfer.transferType === 'CURSO' && transfer.newCourseId && transfer.newCourseName) {
      enrollments[enrIdx].courseId = transfer.newCourseId;
      enrollments[enrIdx].courseName = transfer.newCourseName;
    }
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
  }
  addAuditLog(transfer.id, 'ALUNO', 'EDITADO', operator, `Transferência de ${transfer.transferType} para aluno ${transfer.studentName}. Motivo: ${transfer.reason}`);
}

export function getCancelations(): CancelationRecord[] {
  const data = localStorage.getItem(KEYS.CANCELATIONS);
  return data ? JSON.parse(data) : [];
}

export function cancelStudentEnrollment(cancelation: CancelationRecord, operator: string): void {
  const list = getCancelations();
  list.unshift(cancelation);
  localStorage.setItem(KEYS.CANCELATIONS, JSON.stringify(list));

  // Update enrollment status
  const enrollments = getEnrollments();
  const enrIdx = enrollments.findIndex(e => e.studentId === cancelation.studentId);
  if (enrIdx >= 0) {
    enrollments[enrIdx].status = 'CANCELADA';
    localStorage.setItem(KEYS.ENROLLMENTS, JSON.stringify(enrollments));
  }

  // Financeiro: Cancel future unpaid installments
  if (cancelation.futureInstallmentsCanceled) {
    const installments = getInstallments();
    let canceledCount = 0;
    installments.forEach(inst => {
      if (inst.studentId === cancelation.studentId && inst.status === 'PENDENTE') {
        inst.status = 'CANCELADA';
        inst.notes = `Cancelado por cancelamento de matrícula (${cancelation.reason})`;
        canceledCount++;
      }
    });
    saveInstallments(installments);
    addFinancialAuditLog(operator, 'CANCELAMENTO_MATRICULA_FINANCEIRO', `${canceledCount} parcelas futuras isentadas devido ao cancelamento do aluno ${cancelation.studentName}`);
  }

  addAuditLog(cancelation.id, 'ALUNO', 'EDITADO', operator, `Matrícula cancelada para o aluno ${cancelation.studentName}. Motivo: ${cancelation.reason}`);
}

export function getDependencies(): DependencyEnrollment[] {
  const data = localStorage.getItem(KEYS.DEPENDENCIES);
  return data ? JSON.parse(data) : [];
}

export function saveDependency(dep: DependencyEnrollment, operator: string): void {
  const list = getDependencies();
  list.unshift(dep);
  localStorage.setItem(KEYS.DEPENDENCIES, JSON.stringify(list));

  // Create financial installments automatically
  if (dep.feeValue > 0 && dep.installmentsCount > 0) {
    const valuePerInst = dep.feeValue / dep.installmentsCount;
    const now = new Date();
    
    generateStudentInstallments({
      studentId: dep.studentId,
      studentName: dep.studentName,
      enrollment: dep.enrollmentNumber,
      courseName: dep.courseName,
      className: `Dependência: ${dep.subjectName}`,
      monthlyValue: valuePerInst,
      totalInstallments: dep.installmentsCount,
      firstDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString().substring(0, 10),
      user: operator,
      notes: `Taxa de dependência na disciplina: ${dep.subjectName}`
    });
  }

  addAuditLog(dep.id, 'ALUNO', 'CRIADO', operator, `Dependência na disciplina ${dep.subjectName} cadastrada para ${dep.studentName}`);
}

export function getRequirementConfigs(): DocumentRequirementConfig[] {
  const data = localStorage.getItem(KEYS.REQUIREMENT_CONFIGS);
  if (!data) {
    localStorage.setItem(KEYS.REQUIREMENT_CONFIGS, JSON.stringify(defaultRequirementConfigs));
    return defaultRequirementConfigs;
  }
  return JSON.parse(data);
}

export function saveRequirementConfig(config: DocumentRequirementConfig): void {
  const list = getRequirementConfigs();
  const idx = list.findIndex(c => c.id === config.id);
  if (idx >= 0) list[idx] = config;
  else list.push(config);
  localStorage.setItem(KEYS.REQUIREMENT_CONFIGS, JSON.stringify(list));
}

export function deleteRequirementConfig(id: string): void {
  const list = getRequirementConfigs().filter(c => c.id !== id);
  localStorage.setItem(KEYS.REQUIREMENT_CONFIGS, JSON.stringify(list));
}

export function generateRequirementProtocolNumber(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${year}-${randomNum}`;
}

export function getRequirementRequests(): StudentRequirementRequest[] {
  const data = localStorage.getItem(KEYS.REQUIREMENT_REQUESTS);
  return data ? JSON.parse(data) : [];
}

export function saveRequirementRequest(req: StudentRequirementRequest): void {
  const list = getRequirementRequests();
  const idx = list.findIndex(r => r.id === req.id);
  if (idx >= 0) list[idx] = req;
  else list.unshift(req);
  localStorage.setItem(KEYS.REQUIREMENT_REQUESTS, JSON.stringify(list));
}

export function deleteRequirementRequest(id: string): void {
  const list = getRequirementRequests().filter(r => r.id !== id);
  localStorage.setItem(KEYS.REQUIREMENT_REQUESTS, JSON.stringify(list));
}

export function getOfficialTemplates(): OfficialTemplate[] {
  const data = localStorage.getItem(KEYS.OFFICIAL_TEMPLATES);
  if (!data) {
    localStorage.setItem(KEYS.OFFICIAL_TEMPLATES, JSON.stringify(defaultOfficialTemplates));
    return defaultOfficialTemplates;
  }
  return JSON.parse(data);
}

export function saveOfficialTemplate(template: OfficialTemplate): void {
  const list = getOfficialTemplates();
  const idx = list.findIndex(t => t.id === template.id);
  if (idx >= 0) list[idx] = template;
  else list.push(template);
  localStorage.setItem(KEYS.OFFICIAL_TEMPLATES, JSON.stringify(list));
}

export function deleteOfficialTemplate(id: string): void {
  const list = getOfficialTemplates().filter(t => t.id !== id);
  localStorage.setItem(KEYS.OFFICIAL_TEMPLATES, JSON.stringify(list));
}

export function getEvents(): EventMinicourse[] {
  const data = localStorage.getItem(KEYS.EVENTS);
  if (!data) {
    localStorage.setItem(KEYS.EVENTS, JSON.stringify(defaultEvents));
    return defaultEvents;
  }
  return JSON.parse(data);
}

export function saveEvent(event: EventMinicourse, operator: string): void {
  const list = getEvents();
  const idx = list.findIndex(e => e.id === event.id);
  if (idx >= 0) list[idx] = event;
  else list.unshift(event);
  localStorage.setItem(KEYS.EVENTS, JSON.stringify(list));

  // Auto add to Misc Financial Catalog if fee > 0
  if (event.feeValue > 0) {
    saveMiscPaymentCatalog({
      id: `evt_cat_${event.id}`,
      name: `Taxa Evento/Minicurso: ${event.title}`,
      category: 'OUTROS',
      defaultValue: event.feeValue,
      description: `Inscrição para evento em ${event.date}`,
      active: true,
      blockedActions: []
    }, operator);
    addFinancialAuditLog(operator, 'CRIACAO_TAXA_MINICURSO', `Cobrança diversa criada para o minicurso "${event.title}" no valor de R$ ${event.feeValue.toFixed(2)}`);
  }
}

export function getEventParticipants(eventId?: string): EventParticipant[] {
  const data = localStorage.getItem(KEYS.EVENT_PARTICIPANTS);
  const list: EventParticipant[] = data ? JSON.parse(data) : [];
  if (eventId) {
    return list.filter(p => p.eventId === eventId);
  }
  return list;
}

export function saveEventParticipant(participant: EventParticipant): void {
  const list = getEventParticipants();
  const idx = list.findIndex(p => p.id === participant.id);
  if (idx >= 0) list[idx] = participant;
  else list.push(participant);
  localStorage.setItem(KEYS.EVENT_PARTICIPANTS, JSON.stringify(list));
}

export function removeEventParticipant(participantId: string): void {
  const list = getEventParticipants().filter(p => p.id !== participantId);
  localStorage.setItem(KEYS.EVENT_PARTICIPANTS, JSON.stringify(list));
}

export function getStageReqConfig(): StageRequirementConfig {
  const data = localStorage.getItem(KEYS.STAGE_REQ_CONFIG);
  if (!data) {
    localStorage.setItem(KEYS.STAGE_REQ_CONFIG, JSON.stringify(defaultStageReqConfig));
    return defaultStageReqConfig;
  }
  return JSON.parse(data);
}

export function saveStageReqConfig(cfg: StageRequirementConfig): void {
  localStorage.setItem(KEYS.STAGE_REQ_CONFIG, JSON.stringify(cfg));
}

export function getStageDefinitions(): StageDefinition[] {
  const data = localStorage.getItem(KEYS.STAGE_DEFINITIONS);
  if (!data) {
    localStorage.setItem(KEYS.STAGE_DEFINITIONS, JSON.stringify(defaultStageDefinition));
    return defaultStageDefinition;
  }
  return JSON.parse(data);
}

export function saveStageDefinition(def: StageDefinition): void {
  const list = getStageDefinitions();
  const idx = list.findIndex(d => d.id === def.id);
  if (idx >= 0) list[idx] = def;
  else list.push(def);
  localStorage.setItem(KEYS.STAGE_DEFINITIONS, JSON.stringify(list));
}

export function removeStageDefinition(id: string): void {
  const list = getStageDefinitions().filter(d => d.id !== id);
  localStorage.setItem(KEYS.STAGE_DEFINITIONS, JSON.stringify(list));
}

export function getStageVacancies(): StageVacancy[] {
  const data = localStorage.getItem(KEYS.STAGE_VACANCIES);
  if (!data) {
    localStorage.setItem(KEYS.STAGE_VACANCIES, JSON.stringify(defaultStageVacancies));
    return defaultStageVacancies;
  }
  return JSON.parse(data);
}

export function saveStageVacancy(vac: StageVacancy, operator?: string): void {
  const list = getStageVacancies();
  const idx = list.findIndex(v => v.id === vac.id);
  if (idx >= 0) list[idx] = vac;
  else list.unshift(vac);
  localStorage.setItem(KEYS.STAGE_VACANCIES, JSON.stringify(list));
  if (operator) {
    addAuditLog(vac.id, 'ALUNO', 'CRIADO', operator, `Vaga de estágio cadastrada: ${vac.companyName || vac.stageName || 'Vaga'}`);
  }
}

export function removeStageVacancy(id: string): void {
  const list = getStageVacancies().filter(v => v.id !== id);
  localStorage.setItem(KEYS.STAGE_VACANCIES, JSON.stringify(list));
}

export function getStageEvaluations(vacancyId?: string): StageEvaluation[] {
  const data = localStorage.getItem(KEYS.STAGE_EVALUATIONS);
  const list: StageEvaluation[] = data ? JSON.parse(data) : [];
  if (vacancyId) {
    return list.filter(e => e.vacancyId === vacancyId);
  }
  return list;
}

export function saveStageEvaluation(evalItem: StageEvaluation, operator: string): void {
  const list = getStageEvaluations();
  const idx = list.findIndex(e => e.vacancyId === evalItem.vacancyId && e.studentId === evalItem.studentId);
  if (idx >= 0) list[idx] = evalItem;
  else list.push(evalItem);
  localStorage.setItem(KEYS.STAGE_EVALUATIONS, JSON.stringify(list));
  addAuditLog(evalItem.id, 'ALUNO', 'EDITADO', operator, `Avaliação de estágio para aluno ${evalItem.studentName}: Nota ${evalItem.grade || evalItem.finalGrade || 0}`);
}

export function getStageSchedules(vacancyId?: string): StageScheduleItem[] {
  const data = localStorage.getItem(KEYS.STAGE_SCHEDULES);
  const list: StageScheduleItem[] = data ? JSON.parse(data) : [];
  if (vacancyId) {
    return list.filter(s => s.vacancyId === vacancyId);
  }
  return list;
}

export function saveStageSchedule(scheduleItem: StageScheduleItem): void {
  const list = getStageSchedules();
  const idx = list.findIndex(s => s.id === scheduleItem.id);
  if (idx >= 0) list[idx] = scheduleItem;
  else list.push(scheduleItem);
  localStorage.setItem(KEYS.STAGE_SCHEDULES, JSON.stringify(list));
}

export function getStageTeacherReceipts(): StageTeacherReceipt[] {
  const data = localStorage.getItem(KEYS.STAGE_RECEIPTS);
  return data ? JSON.parse(data) : [];
}

export function saveStageTeacherReceipt(receipt: StageTeacherReceipt, operator: string): void {
  const list = getStageTeacherReceipts();
  const idx = list.findIndex(r => r.id === receipt.id);
  if (idx >= 0) list[idx] = receipt;
  else list.unshift(receipt);
  localStorage.setItem(KEYS.STAGE_RECEIPTS, JSON.stringify(list));
  addFinancialAuditLog(operator, 'GERACAO_RECIBO_PROFESSOR_ESTAGIO', `Recibo do docente ${receipt.teacherName} gerado no valor de R$ ${receipt.totalValue.toFixed(2)} (${receipt.studentsCount} alunos)`);
}

export function markStageTeacherReceiptPaid(receiptId: string, operator: string): void {
  const list = getStageTeacherReceipts();
  const idx = list.findIndex(r => r.id === receiptId);
  if (idx >= 0) {
    list[idx].status = 'PAGO';
    list[idx].paidAt = new Date().toISOString();
    list[idx].paidBy = operator;
    localStorage.setItem(KEYS.STAGE_RECEIPTS, JSON.stringify(list));
    addFinancialAuditLog(operator, 'PAGAMENTO_RECIBO_PROFESSOR_ESTAGIO', `Recibo do professor ${list[idx].teacherName} no valor de R$ ${list[idx].totalValue.toFixed(2)} marcado como PAGO.`);
  }
}

// Aliases for compatibility
export const getTeacherReceipts = getStageTeacherReceipts;
export const saveTeacherReceipt = saveStageTeacherReceipt;
export const addEventParticipant = (eventId: string, participant: EventParticipant, operator: string) => {
  saveEventParticipant(participant);
};

// Stage Fields (Campos de Estágio / Hospitais / Clínicas)
const defaultStageFields: StageField[] = [];

export function getStageFields(): StageField[] {
  const data = localStorage.getItem(KEYS.STAGE_FIELDS);
  if (!data) {
    localStorage.setItem(KEYS.STAGE_FIELDS, JSON.stringify(defaultStageFields));
    return defaultStageFields;
  }
  return JSON.parse(data);
}

export function saveStageField(field: StageField): void {
  const list = getStageFields();
  const idx = list.findIndex(f => f.id === field.id);
  if (idx >= 0) list[idx] = field;
  else list.unshift(field);
  localStorage.setItem(KEYS.STAGE_FIELDS, JSON.stringify(list));
}

export function removeStageField(id: string): void {
  const list = getStageFields().filter(f => f.id !== id);
  localStorage.setItem(KEYS.STAGE_FIELDS, JSON.stringify(list));
}

// Stage Teachers (Professores de Estágio)
const defaultStageTeachers: StageTeacher[] = [];

export function getStageTeachers(): StageTeacher[] {
  const data = localStorage.getItem(KEYS.STAGE_TEACHERS);
  if (!data) {
    localStorage.setItem(KEYS.STAGE_TEACHERS, JSON.stringify(defaultStageTeachers));
    return defaultStageTeachers;
  }
  return JSON.parse(data);
}

export function saveStageTeacher(teacher: StageTeacher): void {
  const list = getStageTeachers();
  const idx = list.findIndex(t => t.id === teacher.id);
  if (idx >= 0) list[idx] = teacher;
  else list.unshift(teacher);
  localStorage.setItem(KEYS.STAGE_TEACHERS, JSON.stringify(list));
}

export function removeStageTeacher(id: string): void {
  const list = getStageTeachers().filter(t => t.id !== id);
  localStorage.setItem(KEYS.STAGE_TEACHERS, JSON.stringify(list));
}

// Stage Cronogramas (Cronograma de Liberação de Estágios)
const defaultStageCronogramas: StageCronograma[] = [];

export function getStageCronogramas(): StageCronograma[] {
  const data = localStorage.getItem(KEYS.STAGE_CRONOGRAMAS);
  if (!data) {
    localStorage.setItem(KEYS.STAGE_CRONOGRAMAS, JSON.stringify(defaultStageCronogramas));
    return defaultStageCronogramas;
  }
  return JSON.parse(data);
}

export function saveStageCronograma(crono: StageCronograma): void {
  const list = getStageCronogramas();
  const idx = list.findIndex(c => c.id === crono.id);
  if (idx >= 0) list[idx] = crono;
  else list.unshift(crono);
  localStorage.setItem(KEYS.STAGE_CRONOGRAMAS, JSON.stringify(list));
}

export function removeStageCronograma(id: string): void {
  const list = getStageCronogramas().filter(c => c.id !== id);
  localStorage.setItem(KEYS.STAGE_CRONOGRAMAS, JSON.stringify(list));
}
