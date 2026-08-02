import React, { useState } from 'react';
import { CRMTask, TaskPriority, TaskStatus, CRMEmployee, Lead } from '../../types/crm';
import { 
  CheckSquare, Plus, Clock, User, AlertCircle, Filter, 
  MessageSquare, Paperclip, CheckCircle2, X, Edit, Trash2, Calendar
} from 'lucide-react';

interface CRMTasksProps {
  tasks: CRMTask[];
  employees: CRMEmployee[];
  leads: Lead[];
  onAddTask: (task: CRMTask) => void;
  onUpdateTask: (task: CRMTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export const CRMTasks: React.FC<CRMTasksProps> = ({
  tasks,
  employees,
  leads,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}) => {
  const [filterEmployee, setFilterEmployee] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterPriority, setFilterPriority] = useState<string>('todos');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<CRMTask | null>(null);
  const [activeTaskDetail, setActiveTaskDetail] = useState<CRMTask | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<CRMTask>>({
    title: '',
    description: '',
    responsibleId: employees[0]?.id || '',
    dueDate: '2026-07-26',
    dueTime: '10:00',
    priority: 'Média',
    status: 'Pendente',
    category: 'Ligação',
    leadId: ''
  });

  const [commentText, setCommentText] = useState<string>('');

  const filteredTasks = tasks.filter(t => {
    if (filterEmployee !== 'todos' && t.responsibleId !== filterEmployee) return false;
    if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
    if (filterPriority !== 'todos' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      responsibleId: employees[0]?.id || '',
      dueDate: new Date().toISOString().substring(0, 10),
      dueTime: '10:00',
      priority: 'Média',
      status: 'Pendente',
      category: 'Ligação',
      leadId: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Informe o título da tarefa.');
      return;
    }

    const respEmp = employees.find(e => e.id === formData.responsibleId);
    const respName = respEmp ? respEmp.name : 'Consultor';

    const selectedLead = leads.find(l => l.id === formData.leadId);

    if (editingTask) {
      const updated: CRMTask = {
        ...editingTask,
        ...formData,
        responsibleName: respName,
        leadName: selectedLead ? selectedLead.name : editingTask.leadName
      } as CRMTask;
      onUpdateTask(updated);
    } else {
      const newTask: CRMTask = {
        id: `task-${Date.now()}`,
        title: formData.title || '',
        description: formData.description || '',
        responsibleId: formData.responsibleId || employees[0]?.id || '',
        responsibleName: respName,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        dueDate: formData.dueDate || new Date().toISOString().substring(0, 10),
        dueTime: formData.dueTime || '10:00',
        priority: (formData.priority as TaskPriority) || 'Média',
        status: (formData.status as TaskStatus) || 'Pendente',
        category: formData.category || 'Atendimento',
        leadId: formData.leadId,
        leadName: selectedLead ? selectedLead.name : undefined,
        comments: []
      };
      onAddTask(newTask);
    }

    setIsModalOpen(false);
  };

  const handleAddComment = (task: CRMTask) => {
    if (!commentText.trim()) return;
    const newComment = {
      id: `c-${Date.now()}`,
      author: 'Usuário Ativo',
      text: commentText.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    const updated = {
      ...task,
      comments: [...(task.comments || []), newComment]
    };
    onUpdateTask(updated);
    setActiveTaskDetail(updated);
    setCommentText('');
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Urgente':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-black';
      case 'Alta':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold';
      case 'Média':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold';
      case 'Baixa':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            <span>Gerenciamento de Tarefas</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe prazos, atividades de follow-up e tarefas da equipe comercial.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Nova Tarefa
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-300">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Filtrar Tarefas:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-1.5 font-bold"
          >
            <option value="todos">Responsável: Todos</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-1.5 font-bold"
          >
            <option value="todos">Status: Todos</option>
            <option value="Pendente">Pendente</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Concluída">Concluída</option>
            <option value="Atrasada">Atrasada</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border rounded-xl px-3 py-1.5 font-bold"
          >
            <option value="todos">Prioridade: Todas</option>
            <option value="Urgente">Urgente</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full ${getPriorityBadge(task.priority)}`}>
                  {task.priority}
                </span>
                <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {task.category}
                </span>
              </div>

              <h4 
                onClick={() => setActiveTaskDetail(task)}
                className="font-black text-sm text-slate-900 dark:text-white hover:text-blue-600 cursor-pointer"
              >
                {task.title}
              </h4>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {task.description}
              </p>

              {task.leadName && (
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  Lead: {task.leadName}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-bold">
                  <User className="h-3.5 w-3.5 text-slate-400" /> {task.responsibleName.split(' ')[0]}
                </span>
                <span className="flex items-center gap-1 font-extrabold text-rose-600 dark:text-rose-400">
                  <Clock className="h-3.5 w-3.5" /> {task.dueDate} {task.dueTime}
                </span>
              </div>

              {/* Status Select & Actions */}
              <div className="flex items-center justify-between pt-1">
                <select
                  value={task.status}
                  onChange={(e) => onUpdateTask({ ...task, status: e.target.value as TaskStatus })}
                  className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluída">Concluída</option>
                  <option value="Cancelada">Cancelada</option>
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTaskDetail(task)}
                    className="p-1.5 text-slate-400 hover:text-blue-600"
                    title="Detalhes / Comentários"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    title="Excluir Tarefa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Add Task */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Criar Nova Tarefa</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Retornar ligação para confirmação..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Responsável</label>
                  <select
                    value={formData.responsibleId || ''}
                    onChange={(e) => setFormData({ ...formData, responsibleId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={formData.priority || 'Média'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data Limite</label>
                  <input
                    type="date"
                    value={formData.dueDate || ''}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                  <input
                    type="time"
                    value={formData.dueTime || ''}
                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vincular a um Lead (Opcional)</label>
                <select
                  value={formData.leadId || ''}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  <option value="">Nenhum lead</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} - {l.interestCourse}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-extrabold rounded-xl shadow-md"
                >
                  Salvar Tarefa
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Task Details & Comments Modal */}
      {activeTaskDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{activeTaskDetail.title}</h3>
              <button onClick={() => setActiveTaskDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">{activeTaskDetail.description}</p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Comentários e Histórico da Tarefa</h4>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(activeTaskDetail.comments || []).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum comentário ainda.</p>
                ) : (
                  activeTaskDetail.comments?.map(c => (
                    <div key={c.id} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>{c.author}</span>
                        <span>{c.createdAt}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 font-medium">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escrever comentário..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(activeTaskDetail); }}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                />
                <button
                  onClick={() => handleAddComment(activeTaskDetail)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-extrabold rounded-xl"
                >
                  Enviar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
