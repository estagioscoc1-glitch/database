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

const defaultEvents: EventMinicourse[] = [
  {
    id: 'evt_01',
    title: 'Minicurso: Suporte Básico de Vida e Reanimação Cardiopulmonar (SBV/RCP)',
    date: '2026-08-15',
    time: '08:00 - 12:00',
    workloadHours: 8,
    location: 'Auditório Principal - Bloco A',
    instructor: 'Enf. Profª. Dra. Mariana Silva',
    description: 'Capacitação prática com manequins de reanimação de alta fidelidade e uso de DEA.',
    feeValue: 35.00,
    certificateTemplateHtml: `<div style="border: 10px double #1e3a8a; padding: 30px; text-align: center; font-family: Georgia, serif;">
      <h1 style="color: #1e3a8a; font-size: 28px;">CERTIFICADO DE PARTICIPAÇÃO</h1>
      <p style="margin-top: 30px; font-size: 16px; line-height: 1.8;">Certificamos que <strong>{NOME_ALUNO}</strong>, matrícula <strong>{MATRICULA}</strong>, participou com êxito do minicurso <strong>{NOME_EVENTO}</strong> realizado em {DATA_EVENTO}, com carga horária total de <strong>{CARGA_HORARIA} horas</strong>.</p>
      <div style="margin-top: 60px; display: flex; justify-content: space-around;">
        <div>___________________________<br>Instrutor(a) Responsável</div>
        <div>___________________________<br>Direção Acadêmica</div>
      </div>
    </div>`,
    createdAt: new Date().toISOString(),
    createdBy: 'Secretaria'
  }
];

const defaultStageDefinition: StageDefinition[] = [
  {
    id: 'stg_def_enf_1',
    courseId: 'c1',
    courseName: 'Técnico em Enfermagem',
    stageName: 'Estágio Supervisão Hospitalar I - Clínica Médica e Cirúrgica',
    workloadHours: 120,
    description: 'Acompanhamento direto no leito, procedimentos invasivos e administração de medicamentos.',
    minPassingGrade: 60,
    maxGrade: 100,
    studentPrice: 150.00,
    teacherPayRate: 45.00,
    paymentMethodInfo: 'Cobrança via Boleto/Pix na matrícula do estágio. Pagamento ao docente via PIX/Recibo por aluno.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stg_def_rad_1',
    courseId: 'c2',
    courseName: 'Técnico em Radiologia',
    stageName: 'Estágio Prático de Radiologia Hospitalar e Tomografia',
    workloadHours: 100,
    description: 'Posicionamento radiográfico, operação de mesa e câmara escura.',
    minPassingGrade: 60,
    maxGrade: 100,
    studentPrice: 180.00,
    teacherPayRate: 50.00,
    paymentMethodInfo: 'Taxa única de estágio supervisionado.',
    createdAt: new Date().toISOString()
  }
];

const defaultStageVacancies: StageVacancy[] = [
  {
    id: 'vac_001',
    vacancyNumber: 'Vaga 001',
    companyName: 'Hospital Geral Oswaldo Cruz',
    sector: 'UTI e Pró-Socorro',
    className: 'Turma ENF-2026-A',
    courseId: 'c1',
    courseName: 'Técnico em Enfermagem',
    stageId: 'stg_def_enf_1',
    stageName: 'Estágio Supervisão Hospitalar I - Clínica Médica e Cirúrgica',
    teacherId: 'usr_t1',
    teacherName: 'Prof. Carlos Eduardo',
    teacherCouncilNumber: 'COREN-PB 184.920',
    maxStudents: 10,
    enrolledStudentIds: ['stu_1', 'stu_2', 'stu_3'],
    studentsAllocated: [
      { studentId: 'stu_1', studentName: 'Carlos Eduardo Silva', enrollmentNumber: '2026.1.ENF.089', status: 'EM_ANDAMENTO' },
      { studentId: 'stu_2', studentName: 'Beatriz Lima Souza', enrollmentNumber: '2026.1.ENF.090', status: 'EM_ANDAMENTO' },
      { studentId: 'stu_3', studentName: 'Juliana Mendes Rocha', enrollmentNumber: '2026.1.ENF.091', status: 'EM_ANDAMENTO' }
    ],
    totalHours: 120,
    hourlyRate: 25.00,
    startDate: '2026-08-01',
    endDate: '2026-09-15',
    scheduleDaysTime: 'Segunda e Quarta - 07:00 às 12:00',
    location: 'Hospital Geral Oswaldo Cruz - Ala Sul',
    status: 'EM_ANDAMENTO',
    evaluationFormTemplateHtml: `<div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="text-align: center;">FICHA DE AVALIAÇÃO DE ESTÁGIO SUPERVISIONADO</h2>
      <p><strong>Aluno:</strong> {NOME_ALUNO} | <strong>Matrícula:</strong> {MATRICULA}</p>
      <p><strong>Estágio:</strong> {NOME_ESTAGIO} | <strong>Local:</strong> {LOCAL}</p>
      <p><strong>Preceptor:</strong> {NOME_PROFESSOR} ({CONSELHO})</p>
      <hr style="margin: 15px 0;">
      <h3>CRITÉRIOS DE AVALIAÇÃO (0 - 100):</h3>
      <ul>
        <li>1. Pontualidade e Assiduidade</li>
        <li>2. Apresentação Pessoal e Postura Ética</li>
        <li>3. Conhecimento Técnico-Científico</li>
        <li>4. Execução de Procedimentos Práticos</li>
        <li>5. Relacionamento Interpessoal e Trabalho em Equipe</li>
      </ul>
    </div>`,
    createdAt: new Date().toISOString()
  }
];

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
const defaultStageFields: StageField[] = [
  {
    id: 'fld_01',
    companyName: 'Hospital Geral Oswaldo Cruz',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Epitácio Pessoa, 1500 - João Pessoa/PB',
    sector: 'UTI, Pronto Socorro e Ala Cirúrgica',
    supervisorName: 'Dra. Cláudia Vasconcelos',
    phone: '(83) 3244-1000',
    email: 'estagios@hospitaloswaldocruz.com.br',
    maxCapacity: 30,
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fld_02',
    companyName: 'Unidade Básica de Saúde Saúde da Família',
    cnpj: '98.765.432/0001-10',
    address: 'Rua das Acácias, 220 - Bairro dos Estados',
    sector: 'Vacinação, Pré-Natal e Triagem',
    supervisorName: 'Enf. Marcus Vinícius',
    phone: '(83) 3218-5050',
    email: 'ubs.saude@prefeitura.gov.br',
    maxCapacity: 15,
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  }
];

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
const defaultStageTeachers: StageTeacher[] = [
  {
    id: 'tch_01',
    name: 'Prof. Carlos Eduardo',
    email: 'carlos.eduardo@oswaldocruz.edu.br',
    phone: '(83) 98888-1122',
    councilNumber: 'COREN-PB 184.920',
    specialty: 'Enfermagem UTI e Emergência',
    pixKey: 'carlos.eduardo@gmail.com',
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'tch_02',
    name: 'Profª. Dra. Mariana Silva',
    email: 'mariana.silva@oswaldocruz.edu.br',
    phone: '(83) 99911-3344',
    councilNumber: 'COREN-PB 210.450',
    specialty: 'Saúde da Família e Infectologia',
    pixKey: '09876543210',
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  }
];

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
const defaultStageCronogramas: StageCronograma[] = [
  {
    id: 'crono_01',
    title: 'Liberação de Vagas de Estágio Hospitalar - 2026.2',
    courseName: 'Técnico em Enfermagem',
    stageName: 'Estágio Supervisão Hospitalar I',
    className: 'Turma ENF-2026-A',
    companyName: 'Hospital Geral Oswaldo Cruz',
    releaseDate: '2026-08-01',
    startDate: '2026-08-10',
    endDate: '2026-09-30',
    shift: 'MANHA',
    vacanciesCount: 15,
    status: 'LIBERADO',
    observations: 'Escolha de vagas disponível via portal do aluno mediante quitação da taxa de estágio e documentação ok.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'crono_02',
    title: 'Liberação de Estágio em Radiologia - Módulo 2',
    courseName: 'Técnico em Radiologia',
    stageName: 'Estágio Prático de Radiologia Hospitalar',
    className: 'Turma RAD-2026-B',
    companyName: 'Centro de Diagnóstico por Imagem',
    releaseDate: '2026-08-20',
    startDate: '2026-09-01',
    endDate: '2026-10-15',
    shift: 'TARDE',
    vacanciesCount: 10,
    status: 'AGUARDANDO_LIBERACAO',
    observations: 'Aguardando validação do termo de convênio e dosímetro individual.',
    createdAt: new Date().toISOString()
  }
];

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
