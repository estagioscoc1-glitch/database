/**
 * Types for the Cadastros (Registrations) Module
 */

export interface AuditLog {
  id: string;
  entityId: string;
  entityType: 'ALUNO' | 'CURSO' | 'DISCIPLINA' | 'MODULO' | 'PROFESSOR' | 'TIPO_AVALIACAO' | 'SALA' | 'RESOLUCAO' | 'PESQUISA_ALUNO' | 'PESQUISA_FINANCEIRO' | 'PESQUISA_ESTAGIO' | 'PESQUISA_PROFESSOR' | 'PESQUISA_MATRICULA';
  action: 'CRIADO' | 'EDITADO' | 'EXCLUIDO' | 'CONSULTADO';
  performedBy: string;
  timestamp: string; // ISO string
  details: string;
}

export type MaritalStatus = 
  | 'Solteiro(a)' 
  | 'Casado(a)' 
  | 'Divorciado(a)' 
  | 'Viúvo(a)' 
  | 'União estável' 
  | 'Emancipado(a)' 
  | 'Outro';

export interface DetailedStudent {
  id: string;
  enrollment: string;
  dossierNumber?: string; // Número do Dossiê do Aluno (Pasta física/arquivamento)
  name: string;
  motherName?: string;
  fatherName?: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro';
  maritalStatus?: MaritalStatus;
  nationality?: string;
  birthCity?: string;
  birthState?: string;
  birthDate?: string;
  cpf?: string;
  rg?: string;
  rgIssuer?: string;
  rgUf?: string;
  
  // Endereço
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;

  // Contatos
  whatsapp?: string;
  phone?: string;
  email?: string;

  // Informações Complementares
  profession?: string;
  notes?: string;

  // Vinculação
  courseId?: string;
  classId?: string;
  status?: 'ATIVO' | 'INATIVO' | 'TRANCADO' | 'CONCLUÍDO';

  // Documentos entregues (array com nomes dos documentos que foram marcados como entregues)
  deliveredDocuments?: string[];

  createdAt?: string;
  updatedAt?: string;
}

export type ProfessionalCouncil = 'COREN' | 'CRM' | 'CREFITO' | 'CRO' | 'CRP' | 'OAB' | 'MEC' | 'OUTRO';
export type AcademicTitle = 'Graduação' | 'Especialização' | 'Mestrado' | 'Doutorado' | 'Pós-Doutorado';

export interface DetailedTeacher {
  id: string;
  enrollment?: string;
  name: string;
  motherName?: string;
  fatherName?: string;
  cpf?: string;
  rg?: string;
  rgIssuer?: string;
  rgUf?: string;
  birthDate?: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro';
  maritalStatus?: MaritalStatus;
  nationality?: string;
  birthCity?: string;
  birthState?: string;

  // Endereço
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;

  // Contatos
  whatsapp?: string;
  phone?: string;
  email?: string;

  // Informações Complementares
  notes?: string;

  // Profissional / Conselho
  professionalRegistry?: string;
  council?: ProfessionalCouncil;
  councilType?: ProfessionalCouncil;
  councilNumber?: string;
  councilUf?: string;
  councilValidity?: string;
  academicTitle?: AcademicTitle;
  specialty?: string;
  teacherType?: 'SALA_DE_AULA' | 'ESTAGIO' | 'AMBOS';

  // Vinculação de disciplinas / cursos
  subjectIds?: string[];
  courseIds?: string[];

  status?: 'ATIVO' | 'INATIVO' | 'LICENÇA';
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  courseName?: string;
  name: string;
  order: number;
  workload: number;
  teachingType: 'Regular' | 'EJA' | 'Técnico' | 'Especialização' | 'Outro';
  status: 'ATIVO' | 'INATIVO';
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationType {
  id: string;
  code?: string; // Sigla/Código (ex: AV1, REC S1, S1)
  name: string;
  description?: string;
  maxScore?: number; // Limite de valor da avaliação (ex: 10.0 ou 100)
  displayOrder: number;
  status: 'ATIVO' | 'INATIVO';
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  block?: string;
  floor?: string;
  capacity: number;
  roomType: 'Sala convencional' | 'Laboratório' | 'Auditório' | 'Clínica' | 'Sala prática' | 'Outro';
  status: 'ATIVO' | 'MANUTENÇÃO' | 'INATIVO';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Resolution {
  id: string;
  number: string;
  type: 'Autorização' | 'Reconhecimento' | 'Renovação' | 'Outro';
  courseId: string;
  courseName?: string;
  issuingBody: string;
  publicationDate: string;
  startDate: string;
  endDate: string;
  validityPeriodYears?: number;
  referenceYear: number;
  status: 'Vigente' | 'Expirada' | 'Revogada' | 'Em Renovação';
  syllabus?: string;
  notes?: string;
  documentUrl?: string;
  documentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CadastrosSubTab = 
  | 'alunos' 
  | 'cursos' 
  | 'disciplinas' 
  | 'modulos' 
  | 'professores' 
  | 'tipos_avaliacao' 
  | 'salas' 
  | 'resolucoes';
