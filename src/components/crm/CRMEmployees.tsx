import React, { useState } from 'react';
import { CRMEmployee, Lead, CRMTask } from '../../types/crm';
import { 
  Users, Plus, Phone, Mail, UserCheck, Shield, 
  CheckCircle, X, Edit, Trash2, Key, Activity
} from 'lucide-react';

interface CRMEmployeesProps {
  employees: CRMEmployee[];
  leads: Lead[];
  tasks: CRMTask[];
  onAddEmployee: (emp: CRMEmployee) => void;
  onUpdateEmployee: (emp: CRMEmployee) => void;
  onDeleteEmployee: (empId: string) => void;
}

export const CRMEmployees: React.FC<CRMEmployeesProps> = ({
  employees,
  leads,
  tasks,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<CRMEmployee | null>(null);

  const [formData, setFormData] = useState<Partial<CRMEmployee>>({
    name: '',
    role: 'Consultor Comercial',
    phone: '',
    email: '',
    username: '',
    status: 'Ativo'
  });

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      role: 'Consultor Comercial',
      phone: '',
      email: '',
      username: '',
      status: 'Ativo'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: CRMEmployee) => {
    setEditingEmployee(emp);
    setFormData({ ...emp });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        ...formData
      } as CRMEmployee);
    } else {
      const newEmp: CRMEmployee = {
        id: `emp-${Date.now()}`,
        name: formData.name || '',
        role: formData.role || 'Consultor Comercial',
        phone: formData.phone || '',
        email: formData.email || '',
        username: formData.username || formData.email?.split('@')[0] || 'usuario',
        status: (formData.status as 'Ativo' | 'Inativo') || 'Ativo',
        isOnline: true
      };
      onAddEmployee(newEmp);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Equipe & Funcionários Comerciais</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os atendentes e consultores autorizados no módulo CRM.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Novo Funcionário
        </button>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => {
          const empLeads = leads.filter(l => l.responsibleId === emp.id);
          const empTasks = tasks.filter(t => t.responsibleId === emp.id);
          const empMatriculas = empLeads.filter(l => l.status === 'Matriculado').length;

          return (
            <div
              key={emp.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-2xl flex items-center justify-center font-black text-base border border-blue-200 dark:border-blue-800">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    {emp.isOnline && (
                      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{emp.name}</h4>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">{emp.role}</span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  emp.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {emp.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 border-y border-slate-100 dark:border-slate-800 py-3">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {emp.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" /> {emp.phone}
                </p>
                <p className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-slate-400" /> Usuário: <strong>@{emp.username}</strong>
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Leads</span>
                  <strong className="text-slate-900 dark:text-white font-black">{empLeads.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Tarefas</span>
                  <strong className="text-slate-900 dark:text-white font-black">{empTasks.length}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Matrículas</span>
                  <strong className="text-emerald-600 font-black">{empMatriculas}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => handleOpenEdit(emp)}
                  className="p-1.5 text-slate-400 hover:text-blue-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteEmployee(emp.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base">{editingEmployee ? 'Editar' : 'Cadastrar'} Funcionário</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Cargo</label>
                <input
                  type="text"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Usuário do Sistema</label>
                <input
                  type="text"
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-extrabold rounded-xl"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
