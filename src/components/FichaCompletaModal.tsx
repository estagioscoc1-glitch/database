import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import type { User } from '../types';
import { X, Save, MapPin, Users2, FileText, GraduationCap } from 'lucide-react';

interface FichaCompletaModalProps {
  pessoa: User;
  papel: 'ALUNO' | 'PROFESSOR';
  onClose: () => void;
}

const campo = 'w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none text-xs text-slate-800 dark:text-white';
const rotulo = 'block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5';

// FICHA COMPLETA — endereço, filiação, documentos e (só professor) conselho
// de classe. Modal SEPARADO do formulário rápido de editar usuário (que já
// existia e continua exatamente igual) — pra não deixar aquele formulário
// gigante, e pra não arriscar quebrar nada que já funciona. Grava direto no
// banco através da mesma `updateUser` de sempre.
export const FichaCompletaModal: React.FC<FichaCompletaModalProps> = ({ pessoa, papel, onClose }) => {
  const { updateUser, mostrarAviso } = useApp();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [dados, setDados] = useState({
    motherName: pessoa.motherName || '',
    fatherName: pessoa.fatherName || '',
    maritalStatus: pessoa.maritalStatus || '',
    nationality: pessoa.nationality || 'Brasileira',
    birthDate: pessoa.birthDate || '',
    birthCity: pessoa.birthCity || '',
    birthState: pessoa.birthState || '',
    rg: pessoa.rg || '',
    rgIssuer: pessoa.rgIssuer || '',
    rgUf: pessoa.rgUf || '',
    phone: pessoa.phone || '',
    whatsapp: pessoa.whatsapp || '',
    zipCode: pessoa.zipCode || '',
    address: pessoa.address || '',
    addressNumber: pessoa.addressNumber || '',
    complement: pessoa.complement || '',
    neighborhood: pessoa.neighborhood || '',
    city: pessoa.city || '',
    state: pessoa.state || '',
    country: pessoa.country || 'Brasil',
    observations: pessoa.observations || '',
    // Só aluno
    dossierNumber: pessoa.dossierNumber || '',
    profession: pessoa.profession || '',
    // Só professor
    professionalCouncil: pessoa.professionalCouncil || '',
    councilNumber: pessoa.councilNumber || '',
    councilUf: pessoa.councilUf || '',
    councilValidity: pessoa.councilValidity || '',
    academicTitle: pessoa.academicTitle || '',
    specialty: pessoa.specialty || '',
  });

  const set = (campo: keyof typeof dados) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDados(prev => ({ ...prev, [campo]: e.target.value }));

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    const resultado = await updateUser(pessoa.id, dados as any);
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.erro || 'Não foi possível salvar.');
      return;
    }
    mostrarAviso('Ficha completa salva', `Os dados completos de ${pessoa.name} foram atualizados.`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Ficha Completa</h3>
            <p className="text-[11px] text-slate-500">{pessoa.name} · {papel === 'ALUNO' ? 'Aluno' : 'Professor'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {erro && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs font-bold">
              ⚠️ {erro}
            </div>
          )}

          {/* Filiação e nascimento */}
          <div>
            <h4 className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              <Users2 className="h-3.5 w-3.5" /> Filiação e Nascimento
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div><label className={rotulo}>Nome da Mãe</label><input className={campo} value={dados.motherName} onChange={set('motherName')} /></div>
              <div><label className={rotulo}>Nome do Pai</label><input className={campo} value={dados.fatherName} onChange={set('fatherName')} /></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div><label className={rotulo}>Data Nascimento</label><input type="date" className={campo} value={dados.birthDate} onChange={set('birthDate')} /></div>
              <div><label className={rotulo}>Naturalidade (Cidade)</label><input className={campo} value={dados.birthCity} onChange={set('birthCity')} /></div>
              <div><label className={rotulo}>UF Nascimento</label><input className={campo} maxLength={2} value={dados.birthState} onChange={set('birthState')} /></div>
              <div><label className={rotulo}>Nacionalidade</label><input className={campo} value={dados.nationality} onChange={set('nationality')} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className={rotulo}>Estado Civil</label>
                <select className={campo} value={dados.maritalStatus} onChange={set('maritalStatus')}>
                  <option value="">-</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
              {papel === 'ALUNO' && (
                <div className="col-span-2"><label className={rotulo}>Profissão</label><input className={campo} value={dados.profession} onChange={set('profession')} /></div>
              )}
            </div>
          </div>

          {/* Documentos */}
          <div>
            <h4 className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              <FileText className="h-3.5 w-3.5" /> Documentos
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={rotulo}>RG</label><input className={campo} value={dados.rg} onChange={set('rg')} /></div>
              <div><label className={rotulo}>Órgão Emissor</label><input className={campo} placeholder="Ex: SSP" value={dados.rgIssuer} onChange={set('rgIssuer')} /></div>
              <div><label className={rotulo}>UF do RG</label><input className={campo} maxLength={2} value={dados.rgUf} onChange={set('rgUf')} /></div>
            </div>
            {papel === 'ALUNO' && (
              <div className="mt-2"><label className={rotulo}>Número do Dossiê</label><input className={campo} value={dados.dossierNumber} onChange={set('dossierNumber')} /></div>
            )}
          </div>

          {/* Endereço */}
          <div>
            <h4 className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              <MapPin className="h-3.5 w-3.5" /> Endereço
            </h4>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div><label className={rotulo}>CEP</label><input className={campo} value={dados.zipCode} onChange={set('zipCode')} /></div>
              <div className="col-span-2"><label className={rotulo}>Logradouro</label><input className={campo} value={dados.address} onChange={set('address')} /></div>
              <div><label className={rotulo}>Número</label><input className={campo} value={dados.addressNumber} onChange={set('addressNumber')} /></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div><label className={rotulo}>Complemento</label><input className={campo} value={dados.complement} onChange={set('complement')} /></div>
              <div><label className={rotulo}>Bairro</label><input className={campo} value={dados.neighborhood} onChange={set('neighborhood')} /></div>
              <div><label className={rotulo}>Cidade</label><input className={campo} value={dados.city} onChange={set('city')} /></div>
              <div><label className={rotulo}>UF</label><input className={campo} maxLength={2} value={dados.state} onChange={set('state')} /></div>
            </div>
          </div>

          {/* Contato adicional */}
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Contato</h4>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={rotulo}>Telefone</label><input className={campo} value={dados.phone} onChange={set('phone')} /></div>
              <div><label className={rotulo}>WhatsApp</label><input className={campo} value={dados.whatsapp} onChange={set('whatsapp')} /></div>
            </div>
          </div>

          {/* Só professor — conselho e titulação */}
          {papel === 'PROFESSOR' && (
            <div>
              <h4 className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                <GraduationCap className="h-3.5 w-3.5" /> Conselho de Classe e Titulação
              </h4>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div><label className={rotulo}>Conselho</label><input className={campo} placeholder="Ex: COREN" value={dados.professionalCouncil} onChange={set('professionalCouncil')} /></div>
                <div><label className={rotulo}>Número</label><input className={campo} value={dados.councilNumber} onChange={set('councilNumber')} /></div>
                <div><label className={rotulo}>UF</label><input className={campo} maxLength={2} value={dados.councilUf} onChange={set('councilUf')} /></div>
                <div><label className={rotulo}>Validade</label><input type="date" className={campo} value={dados.councilValidity} onChange={set('councilValidity')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={rotulo}>Titulação</label><input className={campo} placeholder="Ex: Especialista, Mestre..." value={dados.academicTitle} onChange={set('academicTitle')} /></div>
                <div><label className={rotulo}>Especialidade</label><input className={campo} value={dados.specialty} onChange={set('specialty')} /></div>
              </div>
            </div>
          )}

          <div>
            <label className={rotulo}>Observações</label>
            <textarea className={campo} rows={2} value={dados.observations} onChange={set('observations')} />
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
            <Save className="h-3.5 w-3.5" /> {salvando ? 'Salvando...' : 'Salvar Ficha Completa'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
