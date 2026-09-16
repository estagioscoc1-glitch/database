import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, X } from 'lucide-react';
import { type CalendarioEscolarRegistro, totalDiasLetivos } from '../../lib/calendarioEscolar';
import { CalendarioGradeVisual } from './CalendarioGradeVisual';

// ===========================================================================
//  CALENDÁRIO ESCOLAR — visualização (coordenador)
//
//  Só é chamado quando já existe um calendário com publicado = true (ver
//  carregarCalendarioPublicado em src/lib/calendarioEscolar.ts). Somente
//  leitura — quem preenche é a direção, na tela de edição.
// ===========================================================================

interface Props {
  registro: CalendarioEscolarRegistro;
  onClose: () => void;
}

export const CalendarioEscolarView: React.FC<Props> = ({ registro, onClose }) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">
              Calendário Escolar {registro.ano}/{registro.semestre}
            </span>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {registro.dados.meses.map(m => (
              <div key={m.mes} className="border border-slate-150 dark:border-slate-800 rounded-2xl p-3">
                <CalendarioGradeVisual ano={m.ano} mes={m.mes} diasMarcados={m.diasMarcados} />
                <p className="mt-1.5 text-[10px] font-bold text-slate-400 uppercase">
                  {m.diasLetivos} dias letivos
                </p>
              </div>
            ))}
          </div>

          {registro.dados.anotacoes.length > 0 && (
            <div className="border border-slate-150 dark:border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase mb-2">Anotações</h4>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {registro.dados.anotacoes.map((a, i) => (
                  <li key={i}>{a.texto}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            {registro.dados.fraseRodape && (
              <p className="text-xs italic text-slate-400">{registro.dados.fraseRodape}</p>
            )}
            <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">
              Total: <span className="text-blue-600">{totalDiasLetivos(registro.dados)}</span> dias
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
