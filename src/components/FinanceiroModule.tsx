import React, { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Layers, Lock, Award, GraduationCap, 
  FileText, CreditCard, PieChart, XCircle, Calendar, ShieldCheck, FileCheck2, 
  ShieldAlert, History, Printer 
} from 'lucide-react';

import { CashRegisterManager } from './financeiro/CashRegisterManager';
import { IncomesManager } from './financeiro/IncomesManager';
import { ExpensesManager } from './financeiro/ExpensesManager';
import { GenerateInstallmentsManager } from './financeiro/GenerateInstallmentsManager';
import { MiscPaymentsCatalogManager } from './financeiro/MiscPaymentsCatalogManager';
import { ScholarshipsManager } from './financeiro/ScholarshipsManager';
import { CoursePricesManager } from './financeiro/CoursePricesManager';
import { FinancialNotesManager } from './financeiro/FinancialNotesManager';
import { PaymentMethodsManager } from './financeiro/PaymentMethodsManager';
import { FinancialReportsManager } from './financeiro/FinancialReportsManager';
import { CancelationsManager } from './financeiro/CancelationsManager';
import { DueDateManager } from './financeiro/DueDateManager';
import { ExemptionsManager } from './financeiro/ExemptionsManager';
import { IncomeTaxDeclarationManager } from './financeiro/IncomeTaxDeclarationManager';
import { ReprintReceiptsManager } from './financeiro/ReprintReceiptsManager';
import { getFinancialAuditLogs } from '../services/financeiroStorage';
import { FinancialAuditLog } from '../types/financeiro';

interface FinanceiroModuleProps {
  currentUser?: string;
  allStudentUsers?: any[];
  courses?: any[];
  classes?: any[];
  isAdmin?: boolean;
}

export const FinanceiroModule: React.FC<FinanceiroModuleProps> = ({
  currentUser = 'Administração Financeira',
  allStudentUsers = [],
  courses = [],
  classes = [],
  isAdmin = true
}) => {
  const [activeSubMenu, setActiveSubMenu] = useState<number>(1);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);

  const subMenus = [
    { id: 1, label: 'Caixa', icon: Wallet, desc: 'Abertura, fechamento e fluxo de caixa' },
    { id: 2, label: 'Entradas', icon: TrendingUp, desc: 'Recebimento de mensalidades e recibos' },
    { id: 3, label: 'Saídas', icon: TrendingDown, desc: 'Lançamento de despesas e pagamentos' },
    { id: 4, label: 'Gerar Parcelas', icon: Layers, desc: 'Geração individual ou em lote' },
    { id: 5, label: 'Pagamentos Diversos', icon: Lock, desc: 'Taxas, apostilas e condicionamentos' },
    { id: 6, label: 'Bolsas', icon: Award, desc: 'Bolsas de estudo e descontos' },
    { id: 7, label: 'Valores dos Cursos', icon: GraduationCap, desc: 'Tabela de preços e mensalidades' },
    { id: 8, label: 'Observações Financeiras', icon: FileText, desc: 'Registro de acordos e ocorrências' },
    { id: 9, label: 'Formas de Pagamento', icon: CreditCard, desc: 'Configuração de modalidades' },
    { id: 10, label: 'Relatórios', icon: PieChart, desc: 'Relatórios de caixa e DRE' },
    { id: 11, label: 'Cancelamentos', icon: XCircle, desc: 'Estornos e alteração de forma' },
    { id: 12, label: 'Alteração Vencimentos', icon: Calendar, desc: 'Repactuação de datas' },
    { id: 13, label: 'Abonos', icon: ShieldCheck, desc: 'Concessão de abonos parciais/totais' },
    { id: 14, label: 'Declaração IRPF', icon: FileCheck2, desc: 'Comprovante anual para imposto de renda' },
    { id: 15, label: 'Reimprimir Recibo', icon: Printer, desc: 'Reimpressão de 2ª via de recibos dados baixa' },
  ];

  const handleOpenAudit = () => {
    setAuditLogs(getFinancialAuditLogs());
    setShowAuditModal(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-900/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl text-[10px] font-black uppercase tracking-wider">
              Módulo Gestão Escolar
            </span>
            <span className="text-xs text-slate-400">15 Submenus Integrados</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-white">
            Módulo Financeiro
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Gestão financeira integral com auditoria, controle de caixa, emissão de recibos, parcelamentos, bolsas e condicionamento de serviços.
          </p>
        </div>

        <button
          onClick={handleOpenAudit}
          className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white font-extrabold text-xs rounded-2xl border border-blue-400/30 shadow-lg backdrop-blur-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 uppercase tracking-wide"
        >
          <History className="h-4 w-4" /> Logs de Auditoria
        </button>
      </div>

      {/* Submenus Navigation Grid / Scroll Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {subMenus.map((sub) => {
            const Icon = sub.icon;
            const isActive = activeSubMenu === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setActiveSubMenu(sub.id)}
                className={`p-3 rounded-2xl transition-all cursor-pointer flex flex-col items-center text-center space-y-1.5 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 font-black'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 hover:bg-blue-50 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                <span className="text-[11px] leading-tight font-extrabold">{sub.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBMENU CONTENT RENDERER */}
      <div className="transition-all">
        {activeSubMenu === 1 && <CashRegisterManager currentUser={currentUser} />}
        {activeSubMenu === 2 && <IncomesManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
        {activeSubMenu === 3 && <ExpensesManager currentUser={currentUser} />}
        {activeSubMenu === 4 && <GenerateInstallmentsManager currentUser={currentUser} allStudentUsers={allStudentUsers} courses={courses} classes={classes} />}
        {activeSubMenu === 5 && <MiscPaymentsCatalogManager currentUser={currentUser} />}
        {activeSubMenu === 6 && <ScholarshipsManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
        {activeSubMenu === 7 && <CoursePricesManager currentUser={currentUser} courses={courses} />}
        {activeSubMenu === 8 && <FinancialNotesManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
        {activeSubMenu === 9 && <PaymentMethodsManager currentUser={currentUser} />}
        {activeSubMenu === 10 && <FinancialReportsManager currentUser={currentUser} />}
        {activeSubMenu === 11 && <CancelationsManager currentUser={currentUser} isAdmin={isAdmin} />}
        {activeSubMenu === 12 && <DueDateManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
        {activeSubMenu === 13 && <ExemptionsManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
        {activeSubMenu === 14 && <IncomeTaxDeclarationManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
        {activeSubMenu === 15 && <ReprintReceiptsManager currentUser={currentUser} allStudentUsers={allStudentUsers} />}
      </div>

      {/* AUDIT LOG MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" /> Trilha de Auditoria Financeira
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Operação</th>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Detalhamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">Nenhum log gravado.</td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                        <td className="p-3 font-mono text-slate-500">{new Date(log.date).toLocaleString('pt-BR')}</td>
                        <td className="p-3 font-bold text-blue-600 uppercase">{log.action}</td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{log.user}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-5 py-2 bg-slate-900 text-white font-extrabold text-xs rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
