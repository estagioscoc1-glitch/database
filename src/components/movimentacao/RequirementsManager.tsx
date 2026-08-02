import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  DocumentRequirementConfig, StudentRequirementRequest, RequirementCondition 
} from '../../types/movimentacao';
import { 
  getRequirementConfigs, saveRequirementConfig, deleteRequirementConfig,
  getRequirementRequests, saveRequirementRequest, deleteRequirementRequest,
  generateRequirementProtocolNumber, getEnrollments, getCancelations, getStageEvaluations
} from '../../services/movimentacaoStorage';
import { getInstallments } from '../../services/financeiroStorage';
import { 
  FileText, Plus, CheckCircle2, Clock, DollarSign, ShieldAlert, 
  Search, UploadCloud, AlertCircle, Edit3, Trash2, XCircle, Printer,
  UserCheck, Calendar, Filter, Check, X, FileCheck, Info, RefreshCw
} from 'lucide-react';

interface RequirementsManagerProps {
  currentUser: string;
}

export const RequirementsManager: React.FC<RequirementsManagerProps> = ({ currentUser }) => {
  const { users } = useApp();
  const [configs, setConfigs] = useState<DocumentRequirementConfig[]>([]);
  const [requests, setRequests] = useState<StudentRequirementRequest[]>([]);
  const [enrollmentsList, setEnrollmentsList] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'SOLICITACOES' | 'REQUERER' | 'CONFIGURACOES'>('SOLICITACOES');

  // New / Edit Config Form
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [cfgName, setCfgName] = useState<string>('');
  const [cfgType, setCfgType] = useState<'Declaração' | 'Histórico' | 'Transferência' | 'Diploma' | 'Certificado' | 'Outros'>('Declaração');
  const [cfgDays, setCfgDays] = useState<number>(3);
  const [cfgFee, setCfgFee] = useState<number>(15.00);
  const [cfgMandatoryFee, setCfgMandatoryFee] = useState<boolean>(true);
  const [cfgConditions, setCfgConditions] = useState<RequirementCondition[]>([]);
  const [newConditionName, setNewConditionName] = useState<string>('');
  const [newConditionReq, setNewConditionReq] = useState<boolean>(true);

  // Requerer para Aluno Form
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [reqDate, setReqDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reqDays, setReqDays] = useState<number>(3);
  const [reqFee, setReqFee] = useState<number>(0);
  const [reqFeePaid, setReqFeePaid] = useState<boolean>(false);
  const [reqAdminNotes, setReqAdminNotes] = useState<string>('');
  const [conditionsStatus, setConditionsStatus] = useState<{ conditionId: string; name: string; fulfilled: boolean; notes?: string }[]>([]);

  // Filter & Search in Requests Fila
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [printRequest, setPrintRequest] = useState<StudentRequirementRequest | null>(null);
  const [editRequest, setEditRequest] = useState<StudentRequirementRequest | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const loadedConfigs = getRequirementConfigs();
    setConfigs(loadedConfigs);
    setRequests(getRequirementRequests());
    const enrs = getEnrollments();
    setEnrollmentsList(enrs);
  };

  // Automated Condition Check when Student or Config changes in Requerer Form
  useEffect(() => {
    if (!selectedConfigId || !selectedStudent) {
      setConditionsStatus([]);
      return;
    }

    const cfg = configs.find(c => c.id === selectedConfigId);
    if (!cfg) return;

    setReqDays(cfg.deliveryDays);
    setReqFee(cfg.feeValue);
    setReqFeePaid(!cfg.isFeeMandatory || cfg.feeValue === 0);

    // Get student details
    const studentEnrs = enrollmentsList.filter(e => e.studentId === selectedStudent.id || e.studentName === selectedStudent.name);
    const primaryEnr = studentEnrs[0];
    
    // Check financial overdue
    const allInsts = getInstallments();
    const studentInsts = allInsts.filter(i => i.studentId === selectedStudent.id || i.studentName === selectedStudent.name || (primaryEnr && i.enrollment === primaryEnr.enrollmentNumber));
    const today = new Date().toISOString().split('T')[0];
    const hasOverdue = studentInsts.some(i => i.status === 'ATRASADA' || (i.status === 'PENDENTE' && i.dueDate < today));
    
    // Check cancelation
    const cancelations = getCancelations();
    const isCanceled = cancelations.some(c => c.studentId === selectedStudent.id || c.studentName === selectedStudent.name);

    // Check stages
    const stageEvals = getStageEvaluations();
    const studentStageEvals = stageEvals.filter(e => e.studentId === selectedStudent.id || e.studentName === selectedStudent.name);
    const stagesCompleted = studentStageEvals.length > 0 && studentStageEvals.every(e => e.approved || (e.grade && e.grade >= 7));

    // Check document checkitems
    const docsDelivered = primaryEnr?.documentChecklist?.every((d: any) => d.delivered) ?? true;

    // Build conditions list
    const condList: RequirementCondition[] = cfg.customConditions || [
      { id: 'default_1', name: 'Sem Mensalidades ou Débitos em Atraso', key: 'NO_OVERDUE', required: cfg.rules.requireNoOverdueInstallments },
      { id: 'default_2', name: 'Matrícula Ativa no Período', key: 'ACTIVE_ENROLLMENT', required: cfg.rules.requireActiveEnrollment },
      { id: 'default_3', name: 'Taxa do Requerimento Quitada', key: 'FEE_PAID', required: cfg.rules.requireFeePaid }
    ];

    const mappedStatus = condList.map(cond => {
      let fulfilled = true;
      let notes = 'Atendido';

      if (cond.key === 'NO_OVERDUE') {
        fulfilled = !hasOverdue;
        notes = hasOverdue ? 'Atenção: Existem mensalidades em atraso' : 'Nenhuma parcela pendente';
      } else if (cond.key === 'ACTIVE_ENROLLMENT') {
        fulfilled = !isCanceled && (primaryEnr ? primaryEnr.status === 'ATIVA' : true);
        notes = isCanceled ? 'Matrícula cancelada/trancada' : 'Matrícula ativa';
      } else if (cond.key === 'FEE_PAID') {
        fulfilled = reqFeePaid;
        notes = reqFeePaid ? 'Taxa quitada' : 'Aguardando pagamento da taxa';
      } else if (cond.key === 'STAGES_COMPLETED') {
        fulfilled = stagesCompleted;
        notes = stagesCompleted ? 'Estágios concluídos com êxito' : 'Pendência em estágios supervisionados';
      } else if (cond.key === 'DOCS_DELIVERED') {
        fulfilled = docsDelivered;
        notes = docsDelivered ? 'Documentos de matrícula entregues' : 'Documentos de matrícula pendentes';
      } else if (cond.key === 'CANCELED_ENROLLMENT') {
        fulfilled = isCanceled;
        notes = isCanceled ? 'Cancelamento formalizado' : 'Requer matrícula trancada/cancelada';
      }

      return {
        conditionId: cond.id,
        name: cond.name,
        fulfilled,
        notes
      };
    });

    setConditionsStatus(mappedStatus);

  }, [selectedConfigId, selectedStudent, enrollmentsList, reqFeePaid]);

  // Calculate delivery deadline date from requested date + delivery days
  const calculateDeadline = (startDateStr: string, days: number) => {
    const start = new Date(startDateStr);
    let count = 0;
    const current = new Date(start);
    while (count < days) {
      current.setDate(current.getDate() + 1);
      // Skip weekends
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        count++;
      }
    }
    return current.toISOString().split('T')[0];
  };

  // Handlers for Requirements Config
  const handleEditConfig = (cfg: DocumentRequirementConfig) => {
    setEditingConfigId(cfg.id);
    setCfgName(cfg.name);
    setCfgType(cfg.type);
    setCfgDays(cfg.deliveryDays);
    setCfgFee(cfg.feeValue);
    setCfgMandatoryFee(cfg.isFeeMandatory);
    setCfgConditions(cfg.customConditions || [
      { id: 'c1', name: 'Sem parcelas vencidas no financeiro', key: 'NO_OVERDUE', required: cfg.rules.requireNoOverdueInstallments },
      { id: 'c2', name: 'Taxa do requerimento quitada', key: 'FEE_PAID', required: cfg.rules.requireFeePaid },
      { id: 'c3', name: 'Matrícula ativa no curso', key: 'ACTIVE_ENROLLMENT', required: cfg.rules.requireActiveEnrollment }
    ]);
    setActiveTab('CONFIGURACOES');
  };

  const handleCancelEditConfig = () => {
    setEditingConfigId(null);
    setCfgName('');
    setCfgType('Declaração');
    setCfgDays(3);
    setCfgFee(15.00);
    setCfgMandatoryFee(true);
    setCfgConditions([]);
    setNewConditionName('');
  };

  const handleAddCustomCondition = () => {
    if (!newConditionName.trim()) return;
    const newCond: RequirementCondition = {
      id: `cond_${Date.now()}`,
      name: newConditionName.trim(),
      key: 'CUSTOM',
      required: newConditionReq
    };
    setCfgConditions(prev => [...prev, newCond]);
    setNewConditionName('');
  };

  const handleRemoveCondition = (id: string) => {
    setCfgConditions(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgName.trim()) return;

    const isEdit = !!editingConfigId;
    const newCfg: DocumentRequirementConfig = {
      id: editingConfigId || `req_cfg_${Date.now()}`,
      name: cfgName.trim(),
      type: cfgType,
      deliveryDays: cfgDays,
      feeValue: cfgFee,
      isFeeMandatory: cfgMandatoryFee,
      rules: {
        requireNoOverdueInstallments: cfgConditions.some(c => c.key === 'NO_OVERDUE' && c.required),
        requireFeePaid: cfgConditions.some(c => c.key === 'FEE_PAID' && c.required),
        requireActiveEnrollment: cfgConditions.some(c => c.key === 'ACTIVE_ENROLLMENT' && c.required)
      },
      customConditions: cfgConditions,
      createdAt: new Date().toISOString()
    };

    saveRequirementConfig(newCfg);
    setConfigs(getRequirementConfigs());
    handleCancelEditConfig();
    setNotification({ 
      type: 'success', 
      message: isEdit ? 'Requerimento atualizado com sucesso!' : 'Tipo de Requerimento cadastrado com sucesso!' 
    });
  };

  const handleDeleteConfig = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o tipo de requerimento "${name}"?`)) {
      deleteRequirementConfig(id);
      setConfigs(getRequirementConfigs());
      if (editingConfigId === id) handleCancelEditConfig();
      setNotification({ type: 'success', message: `Tipo de requerimento "${name}" excluído com sucesso!` });
    }
  };

  // Handler to Create Requirement for Student
  const handleCreateStudentRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedConfigId) {
      setNotification({ type: 'error', message: 'Selecione o aluno e o tipo de requerimento.' });
      return;
    }

    const cfg = configs.find(c => c.id === selectedConfigId);
    if (!cfg) return;

    const deadline = calculateDeadline(reqDate, reqDays);
    const protocol = generateRequirementProtocolNumber();

    const primaryEnr = enrollmentsList.find(e => e.studentId === selectedStudent.id || e.studentName === selectedStudent.name);

    const newReq: StudentRequirementRequest = {
      id: `req_req_${Date.now()}`,
      protocolNumber: protocol,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name || selectedStudent.studentName,
      enrollmentNumber: primaryEnr?.enrollmentNumber || selectedStudent.enrollmentNumber || '2026.1.001',
      courseName: primaryEnr?.courseName || 'Curso Técnico',
      className: primaryEnr?.className || 'Turma A',
      configId: cfg.id,
      documentName: cfg.name,
      type: cfg.type,
      requestedAt: reqDate,
      deliveryDays: reqDays,
      deliveryDeadline: deadline,
      feeValue: reqFee,
      feePaid: reqFeePaid,
      status: 'PENDENTE',
      conditionsCheck: conditionsStatus,
      adminNotes: reqAdminNotes,
      createdBy: currentUser
    };

    saveRequirementRequest(newReq);
    refreshData();

    // Reset Form
    setSelectedStudent(null);
    setStudentSearch('');
    setSelectedConfigId('');
    setReqAdminNotes('');
    setNotification({ type: 'success', message: `Requerimento ${protocol} gerado com sucesso!` });
    setPrintRequest(newReq); // Abrir Ficha/Comprovante automaticamente para impressão/visualização
  };

  // Update Status / Delete / Save Request Changes
  const handleUpdateStatus = (req: StudentRequirementRequest, newStatus: StudentRequirementRequest['status'], adminNotes?: string) => {
    const updated: StudentRequirementRequest = {
      ...req,
      status: newStatus,
      adminNotes: adminNotes || req.adminNotes,
      completedAt: newStatus === 'CONCLUIDO' ? new Date().toISOString() : req.completedAt
    };
    saveRequirementRequest(updated);
    refreshData();
    setNotification({ type: 'success', message: `Status da solicitação ${req.protocolNumber || req.id} alterado para ${newStatus}` });
  };

  const handleDeleteRequest = (req: StudentRequirementRequest) => {
    if (window.confirm(`Tem certeza que deseja excluir o requerimento ${req.protocolNumber || req.documentName} do aluno ${req.studentName}?`)) {
      deleteRequirementRequest(req.id);
      refreshData();
      setNotification({ type: 'success', message: 'Requerimento excluído com sucesso.' });
    }
  };

  const handleSaveEditRequestModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRequest) return;

    saveRequirementRequest(editRequest);
    refreshData();
    setEditRequest(null);
    setNotification({ type: 'success', message: `Ficha do Requerimento ${editRequest.protocolNumber} atualizada!` });
  };

  // Filter Student Users
  const studentList = users.filter(u => u.role === ('student' as any) || (u.role as string) === 'STUDENT' || (u as any).role === 'ALUNO');
  // Combine users and enrollments for comprehensive search
  const allStudents = [
    ...studentList.map(s => ({ id: s.id, name: s.name, enrollmentNumber: (s as any).enrollmentNumber || '' })),
    ...enrollmentsList.map(e => ({ id: e.studentId, name: e.studentName, enrollmentNumber: e.enrollmentNumber }))
  ].filter((v, i, a) => a.findIndex(t => t.name === v.name) === i); // unique by name

  const filteredStudents = allStudents.filter(s => {
    if (!studentSearch.trim()) return false;
    const term = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.enrollmentNumber.toLowerCase().includes(term);
  });

  const filteredRequests = requests.filter(r => {
    if (statusFilter !== 'TODOS' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.studentName.toLowerCase().includes(term) || 
        r.documentName.toLowerCase().includes(term) || 
        r.enrollmentNumber.toLowerCase().includes(term) ||
        (r.protocolNumber && r.protocolNumber.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Central de Requerimentos e Solicitações</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Emissão de requerimentos para alunos, validação de situações/prerrequisitos e gestão de taxas.
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 p-1 bg-white/10 rounded-2xl backdrop-blur-md">
            <button
              onClick={() => setActiveTab('SOLICITACOES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SOLICITACOES' ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:text-white'
              }`}
            >
              <FileCheck className="h-4 w-4" /> Fila de Pedidos ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('REQUERER')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'REQUERER' ? 'bg-emerald-600 text-white shadow' : 'text-blue-200 hover:text-white'
              }`}
            >
              <Plus className="h-4 w-4" /> Requerer para Aluno
            </button>
            <button
              onClick={() => setActiveTab('CONFIGURACOES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'CONFIGURACOES' ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:text-white'
              }`}
            >
              <ShieldAlert className="h-4 w-4" /> Tipos e Situações ({configs.length})
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {notification.message}
          </div>
          <button onClick={() => setNotification(null)} className="cursor-pointer opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Request Queue */}
      {activeTab === 'SOLICITACOES' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por protocolo, aluno ou documento..."
                className="px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl w-72"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {['TODOS', 'PENDENTE', 'EM_ANALISE', 'CONCLUIDO', 'REJEITADO'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer transition-all ${
                    statusFilter === st ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma solicitação de requerimento encontrada na fila.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(req => (
                <div
                  key={req.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row justify-between md:items-center gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black rounded-lg text-[10px]">
                        {req.protocolNumber || 'REQ-OFICIAL'}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{req.studentName}</span>
                      <span className="font-mono text-slate-500 font-bold">({req.enrollmentNumber})</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        req.status === 'CONCLUIDO' ? 'bg-emerald-500/20 text-emerald-700' :
                        req.status === 'REJEITADO' ? 'bg-rose-500/20 text-rose-700' : 'bg-amber-500/20 text-amber-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Documento: <span className="text-blue-600 dark:text-blue-400">{req.documentName}</span> ({req.type})
                    </p>

                    <div className="flex flex-wrap gap-x-4 text-[11px] text-slate-500">
                      <span>Data do Pedido: <strong>{new Date(req.requestedAt).toLocaleDateString('pt-BR')}</strong></span>
                      <span>Prazo: <strong>{req.deliveryDays || 3} dias úteis</strong></span>
                      <span>Entrega Prevista: <strong className="text-slate-800 dark:text-slate-200">{req.deliveryDeadline}</strong></span>
                      <span>Taxa: <strong className={req.feePaid ? 'text-emerald-600' : 'text-amber-600'}>
                        R$ {req.feeValue.toFixed(2)} ({req.feePaid ? 'Paga' : 'Pendente'})
                      </strong></span>
                    </div>

                    {req.adminNotes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-100 dark:bg-slate-900/50 p-2 rounded-xl mt-1">
                        Obs: {req.adminNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setPrintRequest(req)}
                      title="Imprimir / Visualizar Ficha de Requerimento"
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-extrabold rounded-xl text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Printer className="h-3.5 w-3.5" /> Ficha
                    </button>

                    <button
                      onClick={() => setEditRequest(req)}
                      title="Editar Dados da Ficha"
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-700 dark:text-blue-300 font-extrabold rounded-xl text-[11px] cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Editar
                    </button>

                    {req.status === 'PENDENTE' && (
                      <button
                        onClick={() => handleUpdateStatus(req, 'EM_ANALISE')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-[11px] cursor-pointer"
                      >
                        Analisar
                      </button>
                    )}

                    {req.status !== 'CONCLUIDO' && (
                      <button
                        onClick={() => handleUpdateStatus(req, 'CONCLUIDO')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] cursor-pointer"
                      >
                        Concluir
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteRequest(req)}
                      title="Excluir Requerimento"
                      className="p-1.5 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Requerer para Aluno */}
      {activeTab === 'REQUERER' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" /> Requerer Documento para Aluno
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pesquise o aluno, selecione o documento desejado e verifique automaticamente as situações de liberação exigidas.
            </p>
          </div>

          <form onSubmit={handleCreateStudentRequirement} className="space-y-6">
            
            {/* Step 1: Select Student & Document */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Student Search */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  1. Pesquisar e Selecionar Aluno *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setSelectedStudent(null);
                    }}
                    placeholder="Digite o nome ou matrícula do aluno..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="h-4 w-4 text-slate-400 absolute right-3 top-3" />
                </div>

                {filteredStudents.length > 0 && !selectedStudent && (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-lg divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredStudents.map(st => (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setStudentSearch(`${st.name} (${st.enrollmentNumber || 'S/M'})`);
                        }}
                        className="p-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer text-xs flex justify-between items-center"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-100">{st.name}</span>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-extrabold">{st.enrollmentNumber}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedStudent && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-black text-emerald-900 dark:text-emerald-200 block">{selectedStudent.name}</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 text-[11px]">Matrícula: {selectedStudent.enrollmentNumber || 'Ativa'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setStudentSearch('');
                      }}
                      className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 font-bold text-[11px] cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                )}
              </div>

              {/* Requirement Type */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                  2. Selecionar Tipo de Requerimento *
                </label>
                <select
                  required
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 dark:text-white"
                >
                  <option value="">-- Escolha o Documento / Requerimento --</option>
                  {configs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type}) • Prazo: {c.deliveryDays}d • Taxa: R$ {c.feeValue.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Step 2: Verification of Conditions & Prerequisites */}
            {selectedConfigId && (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-blue-600" /> Validação de Situações Exigidas para Liberação
                  </h4>
                  <span className="text-[11px] text-slate-500">Checagem automatizada pelo sistema</span>
                </div>

                {conditionsStatus.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma situação de liberação cadastrada para este documento.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {conditionsStatus.map((cond, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex justify-between items-center transition-all ${
                          cond.fulfilled 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200' 
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <span className="font-bold block">{cond.name}</span>
                          <span className="text-[10px] opacity-80 block">{cond.notes || (cond.fulfilled ? 'Atendido' : 'Pendente')}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            // Toggle manually if admin wants to force override
                            setConditionsStatus(prev => prev.map((c, i) => i === idx ? { ...c, fulfilled: !c.fulfilled } : c));
                          }}
                          className={`px-2.5 py-1 rounded-lg font-black text-[10px] cursor-pointer flex items-center gap-1 shrink-0 ${
                            cond.fulfilled ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}
                        >
                          {cond.fulfilled ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {cond.fulfilled ? 'Cumprido' : 'Pendente'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Dates, Fees, and Customization */}
            {selectedConfigId && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Solicitação
                  </label>
                  <input
                    type="date"
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prazo (Dias Úteis)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={reqDays}
                    onChange={(e) => setReqDays(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor da Taxa (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={reqFee}
                    onChange={(e) => setReqFee(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={reqFeePaid}
                      onChange={(e) => setReqFeePaid(e.target.checked)}
                      className="rounded h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    Taxa Já Quitada / Isenta
                  </label>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Observações e Anotações da Ficha
                  </label>
                  <input
                    type="text"
                    value={reqAdminNotes}
                    onChange={(e) => setReqAdminNotes(e.target.value)}
                    placeholder="Instruções adicionais ou detalhes do requerimento..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!selectedStudent || !selectedConfigId}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <FileCheck className="h-4 w-4" /> Gerar Requerimento e Criar Ficha
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Tab 3: Configs & Situations */}
      {activeTab === 'CONFIGURACOES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Config Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {editingConfigId ? 'Editar Tipo de Requerimento' : 'Cadastrar Tipo de Requerimento'}
              </h3>
              {editingConfigId && (
                <button
                  onClick={handleCancelEditConfig}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Documento</label>
                <input
                  type="text"
                  required
                  value={cfgName}
                  onChange={(e) => setCfgName(e.target.value)}
                  placeholder="Ex: Histórico Escolar Oficial"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={cfgType}
                    onChange={(e) => setCfgType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-white"
                  >
                    <option value="Declaração">Declaração</option>
                    <option value="Histórico">Histórico</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Certificado">Certificado</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prazo (Dias Úteis)</label>
                  <input
                    type="number"
                    value={cfgDays}
                    onChange={(e) => setCfgDays(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Taxa do Serviço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cfgFee}
                  onChange={(e) => setCfgFee(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold text-slate-800 dark:text-white"
                />
              </div>

              {/* Managing Conditions / Prerequisites */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-3">
                <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="h-4 w-4 text-blue-600" /> Situações / Prerrequisitos Exigidos:
                </p>

                <div className="space-y-1.5">
                  {cfgConditions.map((cond) => (
                    <div key={cond.id} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{cond.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(cond.id)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <input
                    type="text"
                    value={newConditionName}
                    onChange={(e) => setNewConditionName(e.target.value)}
                    placeholder="Adicionar nova situação (ex: 'Estágios Concluídos')..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newConditionReq}
                        onChange={(e) => setNewConditionReq(e.target.checked)}
                        className="rounded"
                      />
                      Obrigatória
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCustomCondition}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      + Adicionar Situação
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow cursor-pointer transition-all"
                >
                  {editingConfigId ? 'Atualizar Requerimento' : 'Salvar Tipo de Requerimento'}
                </button>
              </div>
            </form>
          </div>

          {/* Config Catalog List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
              Catálogo de Requerimentos e Situações Configurados ({configs.length})
            </h3>

            <div className="space-y-3">
              {configs.map(c => {
                const isBeingEdited = editingConfigId === c.id;
                return (
                  <div 
                    key={c.id} 
                    className={`p-4 rounded-2xl border transition-all text-xs space-y-2 ${
                      isBeingEdited 
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{c.name}</h4>
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] rounded-full">
                            {c.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Prazo de Entrega: <strong>{c.deliveryDays} dias úteis</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-blue-600 text-sm">R$ {c.feeValue.toFixed(2)}</span>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => handleEditConfig(c)}
                            title="Editar Requerimento e Situações"
                            className="p-1.5 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 text-blue-700 dark:text-blue-300 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfig(c.id, c.name)}
                            title="Excluir Requerimento"
                            className="p-1.5 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block">
                        Situações de Liberação Exigidas:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(c.customConditions || []).map((cond, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] rounded-md font-semibold">
                            ✔ {cond.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Modal: Ficha / Comprovante do Requerimento para Impressão */}
      {printRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-400" /> Ficha de Requerimento Oficial ({printRequest.protocolNumber || 'Protocolo'})
              </h3>
              <button onClick={() => setPrintRequest(null)} className="cursor-pointer p-1 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200 text-xs" id="printable-requirement-sheet">
              
              {/* Printable Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 text-center space-y-1">
                <h2 className="font-black text-base uppercase tracking-wider text-slate-900 dark:text-white">
                  INSTITUIÇÃO DE ENSINO OSWALDO CRUZ
                </h2>
                <p className="text-[10px] font-mono text-slate-500">CENTRAL DE ATENDIMENTO E MOVIMENTAÇÃO ACADÊMICA</p>
                <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-black text-xs text-blue-600 mt-2">
                  PROTOCOLO DE REQUERIMENTO: {printRequest.protocolNumber || printRequest.id}
                </div>
              </div>

              {/* Student and Request Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Aluno Requerente</span>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white block">{printRequest.studentName}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 block mt-0.5">Matrícula: {printRequest.enrollmentNumber}</span>
                  <span className="text-slate-600 dark:text-slate-400 block">Curso: {printRequest.courseName || 'Técnico'}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Documento Requerido</span>
                  <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400 block">{printRequest.documentName}</span>
                  <span className="text-slate-600 dark:text-slate-400 block mt-0.5">Tipo: {printRequest.type}</span>
                  <span className="text-slate-600 dark:text-slate-400 block">
                    Taxa: R$ {printRequest.feeValue.toFixed(2)} ({printRequest.feePaid ? 'Paga' : 'Aguardando Pagamento'})
                  </span>
                </div>
              </div>

              {/* Dates & Deadlines */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-center">
                <div>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold block">Data da Solicitação</span>
                  <span className="font-black text-slate-900 dark:text-white text-xs">{new Date(printRequest.requestedAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold block">Prazo de Entrega</span>
                  <span className="font-black text-slate-900 dark:text-white text-xs">{printRequest.deliveryDays || 3} Dias Úteis</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold block">Data Prevista</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 text-xs">{printRequest.deliveryDeadline}</span>
                </div>
              </div>

              {/* Verified Conditions */}
              <div className="space-y-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white block uppercase border-b pb-1">
                  Situações de Liberação e Checagem
                </span>
                <div className="space-y-1">
                  {(printRequest.conditionsCheck || []).map((cond, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <span className="font-bold">{cond.name}</span>
                      <span className={`font-black ${cond.fulfilled ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {cond.fulfilled ? '✔ Cumprida' : '✘ Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {printRequest.adminNotes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-900 dark:text-amber-200">
                  <span className="font-extrabold block text-[10px] uppercase">Observações da Secretaria:</span>
                  <p>{printRequest.adminNotes}</p>
                </div>
              )}

              {/* Signature Blocks */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] border-t border-slate-300 dark:border-slate-700 mt-6">
                <div>
                  <div className="border-t border-slate-400 dark:border-slate-500 pt-1 font-bold">
                    Assinatura do Aluno Requerente
                  </div>
                  <span className="text-[10px] text-slate-500">{printRequest.studentName}</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 dark:border-slate-500 pt-1 font-bold">
                    Secretaria / Atendimento Acadêmico
                  </div>
                  <span className="text-[10px] text-slate-500">Visto e Recebimento</span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
              <button
                onClick={() => setPrintRequest(null)}
                className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Imprimir Ficha de Requerimento
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Editar Ficha do Requerimento */}
      {editRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Edit3 className="h-4 w-4" /> Editar Ficha do Requerimento ({editRequest.protocolNumber})
              </h3>
              <button onClick={() => setEditRequest(null)} className="cursor-pointer p-1 text-white opacity-80 hover:opacity-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRequestModal} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Aluno Requerente</label>
                <input
                  type="text"
                  value={editRequest.studentName}
                  onChange={(e) => setEditRequest({ ...editRequest, studentName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data da Solicitação</label>
                  <input
                    type="date"
                    value={editRequest.requestedAt.split('T')[0]}
                    onChange={(e) => setEditRequest({ ...editRequest, requestedAt: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Prevista de Entrega</label>
                  <input
                    type="text"
                    value={editRequest.deliveryDeadline}
                    onChange={(e) => setEditRequest({ ...editRequest, deliveryDeadline: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor da Taxa (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editRequest.feeValue}
                    onChange={(e) => setEditRequest({ ...editRequest, feeValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status do Pedido</label>
                  <select
                    value={editRequest.status}
                    onChange={(e) => setEditRequest({ ...editRequest, status: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-bold"
                  >
                    <option value="PENDENTE">PENDENTE</option>
                    <option value="EM_ANALISE">EM ANÁLISE</option>
                    <option value="APROVADO">APROVADO</option>
                    <option value="CONCLUIDO">CONCLUÍDO</option>
                    <option value="REJEITADO">REJEITADO</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={editRequest.feePaid}
                    onChange={(e) => setEditRequest({ ...editRequest, feePaid: e.target.checked })}
                    className="rounded h-4 w-4 text-emerald-600"
                  />
                  Taxa do Requerimento Quitada / Paga
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações da Secretaria</label>
                <textarea
                  rows={3}
                  value={editRequest.adminNotes || ''}
                  onChange={(e) => setEditRequest({ ...editRequest, adminNotes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                />
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl space-y-2">
                <span className="font-extrabold block text-xs">Situações de Liberação (Clique para alterar):</span>
                <div className="space-y-1">
                  {(editRequest.conditionsCheck || []).map((cond, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <span className="font-bold">{cond.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedConds = [...(editRequest.conditionsCheck || [])];
                          updatedConds[i].fulfilled = !updatedConds[i].fulfilled;
                          setEditRequest({ ...editRequest, conditionsCheck: updatedConds });
                        }}
                        className={`px-2 py-0.5 rounded font-black text-[10px] cursor-pointer ${
                          cond.fulfilled ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {cond.fulfilled ? 'Cumprido' : 'Pendente'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRequest(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow cursor-pointer"
                >
                  Salvar Alterações na Ficha
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
