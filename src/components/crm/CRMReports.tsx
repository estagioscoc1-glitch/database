import React from 'react';
import { Lead, CRMTask, CRMEmployee } from '../../types/crm';
import { 
  PieChart, BarChart, TrendingUp, Users, Award, 
  Download, Printer, DollarSign, Target, CheckCircle2
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid 
} from 'recharts';

interface CRMReportsProps {
  leads: Lead[];
  employees: CRMEmployee[];
  tasks: CRMTask[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

export const CRMReports: React.FC<CRMReportsProps> = ({
  leads,
  employees,
  tasks
}) => {
  // Conversão por Origem
  const originsMap: Record<string, number> = {};
  leads.forEach(l => {
    originsMap[l.origin] = (originsMap[l.origin] || 0) + 1;
  });
  const originsData = Object.keys(originsMap).map(key => ({
    name: key,
    value: originsMap[key]
  }));

  // Conversão por Curso
  const courseMap: Record<string, { total: number; matriculados: number }> = {};
  leads.forEach(l => {
    if (!courseMap[l.interestCourse]) {
      courseMap[l.interestCourse] = { total: 0, matriculados: 0 };
    }
    courseMap[l.interestCourse].total += 1;
    if (l.status === 'Matriculado') {
      courseMap[l.interestCourse].matriculados += 1;
    }
  });
  const courseData = Object.keys(courseMap).map(key => ({
    name: key.replace('Técnico em ', 'Téc. '),
    Total: courseMap[key].total,
    Matriculados: courseMap[key].matriculados
  }));

  // Desempenho por Consultor
  const employeeData = employees.map(emp => {
    const empLeads = leads.filter(l => l.responsibleId === emp.id);
    const matriculas = empLeads.filter(l => l.status === 'Matriculado').length;
    const taxa = empLeads.length > 0 ? Math.round((matriculas / empLeads.length) * 100) : 0;
    return {
      name: emp.name.split(' ')[0],
      Leads: empLeads.length,
      Matriculas: matriculas,
      Taxa: taxa
    };
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = "ID,Nome,Telefone,Curso,Origem,Status,Responsavel,DataCriacao\n";
    const rows = leads.map(l => 
      `"${l.id}","${l.name}","${l.phone}","${l.interestCourse}","${l.origin}","${l.status}","${l.responsibleName}","${l.createdAt}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-crm-leads-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Relatórios & Indicadores do CRM</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Análise detalhada de taxas de conversão, eficácia por canal e produtividade da equipe comercial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Origem dos Leads */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="h-4 w-4 text-blue-600" /> Distribuição de Leads por Origem
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={originsData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {originsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversão por Curso */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart className="h-4 w-4 text-emerald-600" /> Leads vs. Matrículas por Curso
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={courseData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Matriculados" fill="#10b981" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Desempenho dos Consultores */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" /> Produção & Conversão da Equipe Comercial
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={employeeData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Matriculas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
