export type CRMSubTab = 
  | 'dashboard' 
  | 'leads' 
  | 'funil' 
  | 'tarefas' 
  | 'agenda' 
  | 'atendimento' 
  | 'funcionarios' 
  | 'relatorios';

export type LeadOrigin = 
  | 'Site' 
  | 'WhatsApp' 
  | 'Instagram' 
  | 'Facebook' 
  | 'Google' 
  | 'Indicação' 
  | 'Telefone' 
  | 'Evento' 
  | 'Visita presencial' 
  | 'Outros';

export type LeadStatus = 
  | 'Novo' 
  | 'Primeiro contato' 
  | 'Em negociação' 
  | 'Aguardando retorno' 
  | 'Documentação' 
  | 'Pré-matrícula' 
  | 'Matriculado' 
  | 'Perdido' 
  | 'Cancelar';

export type LeadPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  interestCourse: string;
  origin: LeadOrigin;
  createdAt: string;
  responsibleId: string;
  responsibleName: string;
  status: LeadStatus;
  notes: string;
  tags: string[];
  priority: LeadPriority;
  city?: string;
  value?: number;
  lastContactDate?: string;
  nextFollowUpDate?: string;
}

export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';
export type TaskStatus = 'Pendente' | 'Em andamento' | 'Concluída' | 'Cancelada' | 'Atrasada';

export interface CRMTaskComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CRMTaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface CRMTask {
  id: string;
  title: string;
  description: string;
  responsibleId: string;
  responsibleName: string;
  createdAt: string;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: string;
  leadId?: string;
  leadName?: string;
  comments?: CRMTaskComment[];
  attachments?: CRMTaskAttachment[];
}

export type EventType = 
  | 'Compromisso' 
  | 'Retorno' 
  | 'Visita' 
  | 'Legação' 
  | 'Reunião' 
  | 'Prazo de documentos' 
  | 'Prazo de matrícula';

export interface CRMScheduleEvent {
  id: string;
  title: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  leadId?: string;
  leadName?: string;
  responsibleId?: string;
  responsibleName: string;
  notes?: string;
}

export interface CRMEmployee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  username: string;
  status: 'Ativo' | 'Inativo';
  isOnline: boolean;
  avatarUrl?: string;
}

export type TimelineType = 
  | 'Legação' 
  | 'Mensagem' 
  | 'Visita' 
  | 'Observação' 
  | 'Mudança de status' 
  | 'Documento enviado' 
  | 'Arquivo' 
  | 'Áudio' 
  | 'Foto';

export interface CRMTimelineItem {
  id: string;
  leadId: string;
  type: TimelineType;
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
  attachments?: { name: string; url: string; type: string }[];
  audioDuration?: string;
}

export interface CRMAuditLog {
  id: string;
  user: string;
  timestamp: string;
  action: string;
  details: string;
  ip: string;
}

export interface CRMNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'task' | 'lead' | 'reminder' | 'message' | 'document' | 'alert';
  targetUserId?: string;
}

export interface CRMAutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  description: string;
}
