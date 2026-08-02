import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CancelationRecord } from '../../types/movimentacao';
import { getCancelations, cancelStudentEnrollment, getEnrollments } from '../../services/movimentacaoStorage';
import { 
  XCircle, Search, AlertTriangle, CheckCircle2, History, ShieldAlert, DollarSign 
} from 'lucide-react';

interface CancelationManagerProps {
  currentUser: string;
}

export const CancelationManager: React.FC<CancelationManagerProps> = ({ currentUser }) => {
  const [cancelations, setCancelations] = useState<CancelationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [reason, setReason] = useState<string>('Trancamento / Desistência por motivos pessoais');
  const [cancelFutureFinance, setCancelFutureFinance] = useState<boolean>(true);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setCancelations(getCancelations());
  }, []);

  const enrollments = getEnrollments();
  const activeEnrollmentList = enrollments.filter(e => e.status === 'ATIVA');

  const filteredEnrollments = activeEnrollmentList.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.studentName.toLowerCase().includes(term) || e.enrollmentNumber.toLowerCase().includes(term);
  });

  const selectedEnrollment = activeEnrollmentList.find(e => e.studentId === selectedStudentId);

  const handleConfirmCancelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) {
      setNotification({ type: 'error', message: 'Selecione o aluno para efetuar o cancelamento.' });
      return;
    }
    if (!reason.trim()) {
      setNotification({ type: 'error', message: 'Informe a justificativa do cancelamento.' });
      return;
    }

    if (!confirm(`Tem certeza que deseja cancelar a matrícula do aluno ${selectedEnrollment.studentName}? As parcelas futuras não quitadas serão baixadas.`)) {
      return;
    }

    const cancelation: CancelationRecord = {
      id: `cnc_${Date.now()}`,
      studentId: selectedEnrollment.studentId,
      studentName: selectedEnrollment.studentName,
      enrollmentNumber: selectedEnrollment.enrollmentNumber,
      courseId: selectedEnrollment.courseId,
      courseName: selectedEnrollment.courseName,
      classId: selectedEnrollment.classId,
      className: selectedEnrollment.className,
      reason: reason.trim(),
      canceledBy: currentUser,
      canceledAt: new Date().toISOString(),
      futureInstallmentsCanceled: cancelFutureFinance
    };

    cancelStudentEnrollment(cancelation, currentUser);
    setCancelations(getCancelations());
    setNotification({
      type: 'success',
      message: `Matrícula do aluno ${selectedEnrollment.studentName} alterada para CANCELADO. Lançamentos bloqueados no diário e financeiro atualizado.`
    });

    setSelectedStudentId('');
    setReason('Trancamento / Desistência por motivos pessoais');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-rose-500/20 rounded-2xl border border-rose-400/30 text-rose-300">
              <XCircle className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Cancelamento de Matrícula</h2>
              <p className="text-xs text-rose-200 mt-0.5">
                Inativação da matrícula, bloqueio de diários e baixa automática de parcelas futuras.
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {notification.message}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" /> Registrar Cancelamento Oficial
            </h3>
          </div>

          <form onSubmit={handleConfirmCancelation} className="space-y-4">
            
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                1. Pesquisar Aluno com Matrícula Ativa *
              </label>
              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome ou matrícula..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">-- Selecione o Aluno ({filteredEnrollments.length}) --</option>
                {filteredEnrollments.map(e => (
                  <option key={e.studentId} value={e.studentId}>
                    {e.studentName} (#{e.enrollmentNumber}) - {e.courseName} [{e.className}]
                  </option>
                ))}
              </select>
            </div>

            {selectedEnrollment && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-extrabold">Atenção ao Cancelar:</p>
                <p>Aluno: <strong>{selectedEnrollment.studentName}</strong> (#{selectedEnrollment.enrollmentNumber})</p>
                <p>Curso: <strong>{selectedEnrollment.courseName}</strong> ({selectedEnrollment.className})</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                2. Justificativa Oficial do Cancelamento *
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o motivo detalhado do cancelamento..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-800 dark:text-white"
              />
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  Cancelar e isentar parcelas futuras não quitadas no Financeiro
                </span>
              </div>
              <input
                type="checkbox"
                checked={cancelFutureFinance}
                onChange={(e) => setCancelFutureFinance(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <XCircle className="h-4 w-4" /> Confirmar Cancelamento da Matrícula
              </button>
            </div>

          </form>
        </div>

        {/* History Column */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-rose-600" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Histórico de Cancelamentos ({cancelations.length})
            </h3>
          </div>

          {cancelations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum cancelamento efetuado.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {cancelations.map(cnc => (
                <div
                  key={cnc.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-slate-900 dark:text-white">{cnc.studentName}</h4>
                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] rounded-full">
                      CANCELADO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">Matrícula #{cnc.enrollmentNumber} • {cnc.courseName}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 italic">"{cnc.reason}"</p>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                    <span>Op: {cnc.canceledBy}</span>
                    <span>{new Date(cnc.canceledAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
