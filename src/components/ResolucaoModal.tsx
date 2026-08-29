import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import type { Resolution } from '../types';
import { X, Save } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCriada?: (resolutionId: string) => void;
}

const campo = 'w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none text-xs text-slate-800 dark:text-white';
const rotulo = 'block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5';

// Cadastro de Resolução — o ato legal (MEC/CEE) que autoriza um curso a
// funcionar. Cresce quando a secretaria precisar, sem precisar de SQL novo.
export const ResolucaoModal: React.FC<Props> = ({ onClose, onCriada }) => {
  const { salvarResolucaoContexto, mostrarAviso } = useApp();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [numero, setNumero] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const salvar = async () => {
    if (!numero.trim()) {
      setErro('Informe o número da resolução.');
      return;
    }
    setSalvando(true);
    setErro(null);
    const resolution: Resolution = {
      id: `resolucao_${Date.now()}`,
      number: numero.trim(),
      issuingBody: issuingBody.trim() || undefined,
      publicationDate: publicationDate || undefined,
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const resultado = await salvarResolucaoContexto(resolution);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro || 'Não foi possível salvar.');
      return;
    }
    mostrarAviso('Resolução cadastrada', `Resolução ${resolution.number} cadastrada com sucesso.`);
    onCriada?.(resolution.id);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-800 dark:text-white">Nova Resolução</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {erro && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold">
              ⚠️ {erro}
            </div>
          )}
          <div>
            <label className={rotulo}>Número da Resolução</label>
            <input className={campo} placeholder="Ex: Resolução CEE/GO nº 421/2023" value={numero} onChange={e => setNumero(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={rotulo}>Órgão Emissor</label>
              <input className={campo} placeholder="Ex: CEE/GO" value={issuingBody} onChange={e => setIssuingBody(e.target.value)} />
            </div>
            <div>
              <label className={rotulo}>Data de Publicação</label>
              <input type="date" className={campo} value={publicationDate} onChange={e => setPublicationDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={rotulo}>Descrição</label>
            <textarea rows={2} className={campo} placeholder="Síntese do teor publicado..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className={rotulo}>Observações</label>
            <textarea rows={2} className={campo} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-150 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all">
            Cancelar
          </button>
          <button
            type="button" disabled={salvando} onClick={salvar}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> {salvando ? 'Salvando...' : 'Salvar Resolução'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
