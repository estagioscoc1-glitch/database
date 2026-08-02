/**
 * Storage service for Cadastros extra data (Modules, Evaluation Types, Classrooms, Resolutions, Audit Logs, Detailed Students, Detailed Teachers)
 */

import { 
  AuditLog, DetailedStudent, DetailedTeacher, CourseModule, 
  EvaluationType, Classroom, Resolution 
} from '../types/cadastros';
import { safeLocalStorage } from '../lib/safeStorage';

const STORAGE_KEYS = {
  AUDIT_LOGS: 'gestao_cadastros_audit_logs_v1',
  DETAILED_STUDENTS: 'gestao_cadastros_detailed_students_v1',
  DETAILED_TEACHERS: 'gestao_cadastros_detailed_teachers_v1',
  COURSE_MODULES: 'gestao_cadastros_modules_v1',
  EVALUATION_TYPES: 'gestao_cadastros_eval_types_v3',
  CLASSROOMS: 'gestao_cadastros_classrooms_v1',
  RESOLUTIONS: 'gestao_cadastros_resolutions_v1',
};

// Initial Evaluation Types Seed (Diário de Classe - V1, V2 format)
export const initialEvaluationTypes: EvaluationType[] = [
  { id: 'eval_v1', code: 'V1', name: 'V1 - Verificação 1', description: 'Avaliação 1 do Diário de Classe', maxScore: 10, displayOrder: 1, status: 'ATIVO', isDefault: true },
  { id: 'eval_v2', code: 'V2', name: 'V2 - Verificação 2', description: 'Avaliação 2 do Diário de Classe', maxScore: 10, displayOrder: 2, status: 'ATIVO', isDefault: true },
  { id: 'eval_v3', code: 'V3', name: 'V3 - Verificação 3', description: 'Avaliação 3 do Diário de Classe', maxScore: 10, displayOrder: 3, status: 'ATIVO', isDefault: true },
  { id: 'eval_v4', code: 'V4', name: 'V4 - Verificação 4', description: 'Avaliação 4 do Diário de Classe', maxScore: 10, displayOrder: 4, status: 'ATIVO', isDefault: true },
  { id: 'eval_v5', code: 'V5', name: 'V5 - Verificação 5', description: 'Avaliação 5 do Diário de Classe', maxScore: 10, displayOrder: 5, status: 'ATIVO', isDefault: true },
  { id: 'eval_v6', code: 'V6', name: 'V6 - Verificação 6', description: 'Avaliação 6 do Diário de Classe', maxScore: 10, displayOrder: 6, status: 'ATIVO', isDefault: true },
  { id: 'eval_rec', code: 'REC', name: 'REC - Recuperação', description: 'Prova de Recuperação do Diário', maxScore: 10, displayOrder: 7, status: 'ATIVO', isDefault: true },
  { id: 'eval_ex', code: 'EX', name: 'EX - Exame Final', description: 'Exame Final do Diário de Classe', maxScore: 10, displayOrder: 8, status: 'ATIVO', isDefault: true },
];

// Initial Classrooms Seed
export const initialClassrooms: Classroom[] = [
  { id: 'sala_101', name: 'Sala 101', code: 'SL-101', block: 'Bloco A', floor: '1º Andar', capacity: 40, roomType: 'Sala convencional', status: 'ATIVO', notes: 'Projetor HD e Ar Condicionado' },
  { id: 'sala_102', name: 'Sala 102', code: 'SL-102', block: 'Bloco A', floor: '1º Andar', capacity: 45, roomType: 'Sala convencional', status: 'ATIVO', notes: 'Quadro branco e Ar Condicionado' },
  { id: 'lab_inf_1', name: 'Laboratório de Informática A', code: 'LAB-INF-A', block: 'Bloco B', floor: 'Térreo', capacity: 30, roomType: 'Laboratório', status: 'ATIVO', notes: '30 Computadores Core i5 com acesso à Internet' },
  { id: 'lab_enf_1', name: 'Laboratório de Enfermagem', code: 'LAB-ENF', block: 'Bloco C', floor: 'Térreo', capacity: 25, roomType: 'Clínica', status: 'ATIVO', notes: 'Manequins anatômicos e leitos hospitalares' },
  { id: 'auditorio_1', name: 'Auditório Principal', code: 'AUD-01', block: 'Bloco Central', floor: '2º Andar', capacity: 150, roomType: 'Auditório', status: 'ATIVO', notes: 'Som ambiente e projetor multimídia' },
];

// Initial Course Modules Seed
export const initialCourseModules: CourseModule[] = [
  { id: 'mod_enf_1', courseId: 'ENF', courseName: 'TÉCNICO EM ENFERMAGEM', name: 'Módulo I - Fundamentos da Saúde', order: 1, workload: 400, teachingType: 'Técnico', status: 'ATIVO' },
  { id: 'mod_enf_2', courseId: 'ENF', courseName: 'TÉCNICO EM ENFERMAGEM', name: 'Módulo II - Assistência Clínica e Cirúrgica', order: 2, workload: 400, teachingType: 'Técnico', status: 'ATIVO' },
  { id: 'mod_enf_3', courseId: 'ENF', courseName: 'TÉCNICO EM ENFERMAGEM', name: 'Módulo III - Especialidades e Urgências', order: 3, workload: 400, teachingType: 'Técnico', status: 'ATIVO' },
  { id: 'mod_rad_1', courseId: 'RAD', courseName: 'TÉCNICO EM RADIOLOGIA', name: 'Módulo I - Física e Anatomia Radiológica', order: 1, workload: 400, teachingType: 'Técnico', status: 'ATIVO' },
  { id: 'mod_rad_2', courseId: 'RAD', courseName: 'TÉCNICO EM RADIOLOGIA', name: 'Módulo II - Técnicas e Proteção Radiológica', order: 2, workload: 400, teachingType: 'Técnico', status: 'ATIVO' },
];

// Initial Resolutions Seed
export const initialResolutions: Resolution[] = [
  { 
    id: 'res_enf_1', 
    number: 'Resolução CEE/SP nº 421/2023', 
    type: 'Reconhecimento', 
    courseId: 'ENF', 
    courseName: 'TÉCNICO EM ENFERMAGEM', 
    issuingBody: 'Conselho Estadual de Educação (CEE/SP)', 
    publicationDate: '2023-02-15', 
    startDate: '2023-03-01', 
    endDate: '2028-03-01', 
    validityPeriodYears: 5, 
    referenceYear: 2023, 
    status: 'Vigente', 
    syllabus: 'Autoriza e reconhece o funcionamento do curso Técnico em Enfermagem conforme diretrizes do MEC e COFEN.', 
    notes: 'Resolução mantida em arquivo permanente.' 
  },
  { 
    id: 'res_rad_1', 
    number: 'Resolução CEE/SP nº 108/2022', 
    type: 'Renovação', 
    courseId: 'RAD', 
    courseName: 'TÉCNICO EM RADIOLOGIA', 
    issuingBody: 'Conselho Estadual de Educação (CEE/SP)', 
    publicationDate: '2022-08-10', 
    startDate: '2022-09-01', 
    endDate: '2027-09-01', 
    validityPeriodYears: 5, 
    referenceYear: 2022, 
    status: 'Vigente', 
    syllabus: 'Renovação de reconhecimento do curso Técnico em Radiologia.', 
    notes: 'Adequado às normas da CONTER/CRTR.' 
  }
];

// Initial Audit Logs Seed
function getItemJSON<T>(key: string, defaultValue: T): T {
  try {
    const data = safeLocalStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItemJSON<T>(key: string, value: T): void {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log_init_1',
    entityId: 'ENF',
    entityType: 'CURSO',
    action: 'CRIADO',
    performedBy: 'Administrador do Sistema',
    timestamp: new Date().toISOString(),
    details: 'Curso Técnico em Enfermagem cadastrado no sistema.'
  }
];

export const getAuditLogs = (): AuditLog[] => {
  return getItemJSON<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
};

export const addAuditLog = (
  entityId: string,
  entityType: AuditLog['entityType'],
  action: AuditLog['action'],
  performedBy: string,
  details: string
): AuditLog => {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    entityId,
    entityType,
    action,
    performedBy: performedBy || 'Administrador',
    timestamp: new Date().toISOString(),
    details
  };
  const updated = [newLog, ...logs];
  setItemJSON(STORAGE_KEYS.AUDIT_LOGS, updated);
  return newLog;
};

// Detailed Students
export const getDetailedStudents = (): Record<string, DetailedStudent> => {
  return getItemJSON<Record<string, DetailedStudent>>(STORAGE_KEYS.DETAILED_STUDENTS, {});
};

export const getNextDossierNumber = (existingStudents?: any[]): string => {
  const detailedMap = getDetailedStudents();
  let max = 0;

  // Check detailedMap
  Object.values(detailedMap).forEach(s => {
    if (s.dossierNumber) {
      const num = parseInt(s.dossierNumber.toString().replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > max) {
        max = num;
      }
    }
  });

  // Check existingStudents array if passed
  if (existingStudents && Array.isArray(existingStudents)) {
    existingStudents.forEach(st => {
      const d = detailedMap[st.id];
      const dos = st.dossierNumber || (d && d.dossierNumber);
      if (dos) {
        const num = parseInt(dos.toString().replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > max) {
          max = num;
        }
      }
    });
  }

  return (max + 1).toString();
};

export const saveDetailedStudent = (student: DetailedStudent): void => {
  const students = getDetailedStudents();
  students[student.id] = { ...student, updatedAt: new Date().toISOString() };
  setItemJSON(STORAGE_KEYS.DETAILED_STUDENTS, students);
};

// Detailed Teachers
export const getDetailedTeachers = (): Record<string, DetailedTeacher> => {
  return getItemJSON<Record<string, DetailedTeacher>>(STORAGE_KEYS.DETAILED_TEACHERS, {});
};

export const saveDetailedTeacher = (teacher: DetailedTeacher): void => {
  const teachers = getDetailedTeachers();
  teachers[teacher.id] = { ...teacher, updatedAt: new Date().toISOString() };
  setItemJSON(STORAGE_KEYS.DETAILED_TEACHERS, teachers);
};

// Course Modules
export const getCourseModules = (): CourseModule[] => {
  return getItemJSON<CourseModule[]>(STORAGE_KEYS.COURSE_MODULES, initialCourseModules);
};

export const saveCourseModules = (modules: CourseModule[]): void => {
  setItemJSON(STORAGE_KEYS.COURSE_MODULES, modules);
};

// Evaluation Types
export const getEvaluationTypes = (): EvaluationType[] => {
  return getItemJSON<EvaluationType[]>(STORAGE_KEYS.EVALUATION_TYPES, initialEvaluationTypes);
};

export const saveEvaluationTypes = (types: EvaluationType[]): void => {
  setItemJSON(STORAGE_KEYS.EVALUATION_TYPES, types);
};

// Classrooms
export const getClassrooms = (): Classroom[] => {
  return getItemJSON<Classroom[]>(STORAGE_KEYS.CLASSROOMS, initialClassrooms);
};

export const saveClassrooms = (rooms: Classroom[]): void => {
  setItemJSON(STORAGE_KEYS.CLASSROOMS, rooms);
};

// Resolutions
export const getResolutions = (): Resolution[] => {
  return getItemJSON<Resolution[]>(STORAGE_KEYS.RESOLUTIONS, initialResolutions);
};

export const saveResolutions = (resolutions: Resolution[]): void => {
  setItemJSON(STORAGE_KEYS.RESOLUTIONS, resolutions);
};

// Address lookup helper (ViaCEP)
export async function fetchAddressByCep(cep: string): Promise<{
  address: string;
  neighborhood: string;
  city: string;
  state: string;
} | null> {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      address: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch (err) {
    console.warn('ViaCEP lookup failed', err);
    return null;
  }
}
