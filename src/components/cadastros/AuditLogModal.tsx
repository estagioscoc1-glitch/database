import React from 'react';
import { AuditLog } from '../../types/cadastros';
import { History, X, User, Calendar, Tag, Info } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
  title?: string;
  entityName?: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  title = 'Histórico de Auditoria',
  entityName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">{title}</h3>
              {entityName && (
                <p className="text-xs text-slate-300 font-medium">
                  Registro: <span className="font-bold text-blue-300">{entityName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Info className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold">Nenhum registro de alteração localizado.</p>
              <p className="text-xs">As ações neste cadastro serão registradas automaticamente.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6">
              {logs.map((log) => {
                const isCreate = log.action === 'CRIADO';
                const isEdit = log.action === 'EDITADO';
                const isDelete = log.action === 'EXCLUIDO';

                return (
                  <div key={log.id} className="relative pl-6">
                    {/* Circle marker */}
                    <div className={`absolute -left-2.5 top-0.5 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-black ${
                      isCreate ? 'bg-emerald-500 text-white' :
                      isEdit ? 'bg-amber-500 text-white' :
                      'bg-rose-500 text-white'
                    }`}>
                      {isCreate ? '+' : isEdit ? '✎' : '✕'}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCreate ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          isEdit ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {log.action}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                        {log.details}
                      </p>

                      <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium border-t border-slate-200/60 dark:border-slate-700/60">
                        <User className="h-3.5 w-3.5 text-blue-500" />
                        <span>Realizado por: <strong className="text-slate-700 dark:text-slate-300">{log.performedBy}</strong></span>
                        <Tag className="h-3 w-3 ml-auto text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-mono">{log.entityType}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
