import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DetailedTeacher, ProfessionalCouncil, AcademicTitle } from '../../types/cadastros';
import { 
  getDetailedTeachers, saveDetailedTeacher, 
  addAuditLog, getAuditLogs, fetchAddressByCep 
} from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';
import type { User } from '../../types';
import { UserRole } from '../../types';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, X, 
  UserCheck, Award, MapPin, Phone, Mail, FileCheck, 
  ChevronLeft, ChevronRight, AlertCircle, Loader2 
} from 'lucide-react';

export const TeacherRegistration: React.FC = () => {
  const { 
    users, courses, subjects, addUser, updateUser, deleteUser, currentUser 
  } = useApp();

  const [detailedMap, setDetailedMap] = useState<Record<string, DetailedTeacher>>(() => getDetailedTeachers());

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditTeacher, setSelectedAuditTeacher] = useState<DetailedTeacher | null>(null);

  // Form State & Tabs
  const [activeFormTab, setActiveFormTab] = useState<'pessoais' | 'profissional' | 'endereco' | 'contatos'>('pessoais');

  const [name, setName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Outro'>('Masculino');
  const [maritalStatus, setMaritalStatus] = useState<any>('Solteiro(a)');
  const [nationality, setNationality] = useState('Brasileira');
  const [birthCity, setBirthCity] = useState('');
  const [birthState, setBirthState] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [rgIssuer, setRgIssuer] = useState('');
  const [rgUf, setRgUf] = useState('');

  // Professional Fields
  const [professionalRegistry, setProfessionalRegistry] = useState('');
  const [council, setCouncil] = useState<ProfessionalCouncil>('COREN');
  const [councilNumber, setCouncilNumber] = useState('');
  const [councilUf, setCouncilUf] = useState('');
  const [councilValidity, setCouncilValidity] = useState('');
  const [academicTitle, setAcademicTitle] = useState<AcademicTitle>('Especialização');
  const [specialty, setSpecialty] = useState('');
  const [teacherType, setTeacherType] = useState<'SALA_DE_AULA' | 'ESTAGIO' | 'AMBOS'>('AMBOS');

  // Address
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Brasil');

  // Contact & Status
  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO' | 'LICENÇA'>('ATIVO');
  const [notes, setNotes] = useState('');

  const [loadingCep, setLoadingCep] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Teachers list from AppContext
  const teacherUsers = users.filter(u => u.role === UserRole.TEACHER);

  // Search & Filter
  const filteredTeachers = teacherUsers.filter(t => {
    const d: Partial<DetailedTeacher> = detailedMap[t.id] || {};
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.cpf || '').includes(searchTerm) ||
      (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.councilNumber || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || (d.status || (t.active === false ? 'INATIVO' : 'ATIVO')) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage) || 1;
  const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedTeacherId(null);
    setActiveFormTab('pessoais');

    setName('');
    setMotherName('');
    setFatherName('');
    setGender('Masculino');
    setMaritalStatus('Solteiro(a)');
    setNationality('Brasileira');
    setBirthCity('');
    setBirthState('');
    setBirthDate('');
    setCpf('');
    setRg('');
    setRgIssuer('');
    setRgUf('');

    setProfessionalRegistry('');
    setCouncil('COREN');
    setCouncilNumber('');
    setCouncilUf('SP');
    setCouncilValidity('');
    setAcademicTitle('Especialização');
    setSpecialty('');
    setTeacherType('AMBOS');

    setCep('');
    setAddress('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setCountry('Brasil');

    setWhatsapp('');
    setPhone('');
    setEmail('');
    setStatus('ATIVO');
    setNotes('');

    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (teacher: User, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedTeacherId(teacher.id);
    setActiveFormTab('pessoais');

    const d: Partial<DetailedTeacher> = detailedMap[teacher.id] || {};

    setName(teacher.name);
    setMotherName(d.motherName || '');
    setFatherName(d.fatherName || '');
    setGender(d.gender || 'Masculino');
    setMaritalStatus(d.maritalStatus || 'Solteiro(a)');
    setNationality(d.nationality || 'Brasileira');
    setBirthCity(d.birthCity || '');
    setBirthState(d.birthState || '');
    setBirthDate(d.birthDate || '');
    setCpf(teacher.cpf || d.cpf || '');
    setRg(d.rg || '');
    setRgIssuer(d.rgIssuer || '');
    setRgUf(d.rgUf || '');

    setProfessionalRegistry(d.professionalRegistry || '');
    setCouncil(d.council || 'COREN');
    setCouncilNumber(d.councilNumber || '');
    setCouncilUf(d.councilUf || 'SP');
    setCouncilValidity(d.councilValidity || '');
    setAcademicTitle(d.academicTitle || 'Especialização');
    setSpecialty(d.specialty || '');
    setTeacherType(d.teacherType || 'AMBOS');

    setCep(d.cep || '');
    setAddress(d.address || '');
    setNumber(d.number || '');
    setComplement(d.complement || '');
    setNeighborhood(d.neighborhood || '');
    setCity(d.city || '');
    setState(d.state || '');
    setCountry(d.country || 'Brasil');

    setWhatsapp(d.whatsapp || '');
    setPhone(teacher.phone || d.phone || '');
    setEmail(teacher.email || d.email || '');
    setStatus((d.status || (teacher.active === false ? 'INATIVO' : 'ATIVO')) as any);
    setNotes(d.notes || '');

    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleCepBlur = async () => {
    if (!cep) return;
    setLoadingCep(true);
    const result = await fetchAddressByCep(cep);
    setLoadingCep(false);
    if (result) {
      setAddress(result.address);
      setNeighborhood(result.neighborhood);
      setCity(result.city);
      setState(result.state);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome do Professor.' });
      return;
    }
    if (!email.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o E-mail institucional do Professor.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';

    if (modalMode === 'create') {
      const newId = 'tch_' + Date.now();
      const newUser: User = {
        id: newId,
        name: name.trim(),
        username: email.trim(),
        email: email.trim(),
        role: UserRole.TEACHER,
        cpf: cpf.trim(),
        phone: phone.trim() || whatsapp.trim(),
        active: status === 'ATIVO',
        status: status,
        createdAt: new Date().toISOString()
      };

      addUser(newUser);

      const detailed: DetailedTeacher = {
        id: newId,
        name: name.trim(),
        motherName: motherName.trim(),
        fatherName: fatherName.trim(),
        gender,
        maritalStatus,
        nationality: nationality.trim(),
        birthCity: birthCity.trim(),
        birthState: birthState.trim(),
        birthDate,
        cpf: cpf.trim(),
        rg: rg.trim(),
        rgIssuer: rgIssuer.trim(),
        rgUf: rgUf.trim(),
        professionalRegistry: professionalRegistry.trim(),
        council,
        councilNumber: councilNumber.trim(),
        councilUf: councilUf.trim(),
        councilValidity,
        academicTitle,
        specialty: specialty.trim(),
        teacherType,
        cep: cep.trim(),
        address: address.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        whatsapp: whatsapp.trim(),
        phone: phone.trim(),
        email: email.trim(),
        status,
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      saveDetailedTeacher(detailed);
      setDetailedMap(getDetailedTeachers());

      addAuditLog(newId, 'PROFESSOR', 'CRIADO', performer, `Professor "${name}" (${council} ${councilNumber}) cadastrado.`);
      setFeedbackMsg({ type: 'success', text: `Professor "${name}" cadastrado com sucesso!` });

    } else if (modalMode === 'edit' && selectedTeacherId) {
      updateUser(selectedTeacherId, {
        name: name.trim(),
        email: email.trim(),
        cpf: cpf.trim(),
        phone: phone.trim() || whatsapp.trim(),
        status: status,
        active: status === 'ATIVO'
      });

      const detailed: DetailedTeacher = {
        id: selectedTeacherId,
        name: name.trim(),
        motherName: motherName.trim(),
        fatherName: fatherName.trim(),
        gender,
        maritalStatus,
        nationality: nationality.trim(),
        birthCity: birthCity.trim(),
        birthState: birthState.trim(),
        birthDate,
        cpf: cpf.trim(),
        rg: rg.trim(),
        rgIssuer: rgIssuer.trim(),
        rgUf: rgUf.trim(),
        professionalRegistry: professionalRegistry.trim(),
        council,
        councilNumber: councilNumber.trim(),
        councilUf: councilUf.trim(),
        councilValidity,
        academicTitle,
        specialty: specialty.trim(),
        teacherType,
        cep: cep.trim(),
        address: address.trim(),
        number: number.trim(),
        complement: complement.trim(),
        neighborhood: neighborhood.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        whatsapp: whatsapp.trim(),
        phone: phone.trim(),
        email: email.trim(),
        status,
        notes: notes.trim(),
        updatedAt: new Date().toISOString()
      };

      saveDetailedTeacher(detailed);
      setDetailedMap(getDetailedTeachers());

      addAuditLog(selectedTeacherId, 'PROFESSOR', 'EDITADO', performer, `Dados do professor "${name}" atualizados.`);
      setFeedbackMsg({ type: 'success', text: `Professor "${name}" atualizado com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (teacher: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o docente "${teacher.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    deleteUser(teacher.id);
    addAuditLog(teacher.id, 'PROFESSOR', 'EXCLUIDO', performer, `Professor "${teacher.name}" excluído.`);
    alert(`Professor "${teacher.name}" excluído com sucesso.`);
  };

  const handleOpenAudit = (teacher: User) => {
    const detailed = detailedMap[teacher.id] || { id: teacher.id, name: teacher.name };
    setSelectedAuditTeacher(detailed as DetailedTeacher);
    setShowAuditModal(true);
  };

  const getTeacherAuditLogs = () => {
    if (!selectedAuditTeacher) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditTeacher.id && l.entityType === 'PROFESSOR');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, CPF, e-mail ou conselho de classe..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todas as Situações</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
            <option value="LICENÇA">Licença</option>
          </select>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Professor</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Professor / Titulação</th>
                <th className="py-3.5 px-4">Conselho de Classe</th>
                <th className="py-3.5 px-4">Especialidade</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Nenhum professor encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((t) => {
                  const d: Partial<DetailedTeacher> = detailedMap[t.id] || {};
                  const currentStatus = d.status || (t.active === false ? 'INATIVO' : 'ATIVO');

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black shrink-0">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{t.name}</div>
                            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">{d.academicTitle || 'Especialização'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-800 dark:text-slate-200">
                          {d.council || 'COREN'} {d.councilNumber || '---'}
                        </div>
                        <div className="text-[11px] text-slate-400">{t.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-extrabold">
                          {d.specialty || 'Geral'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          currentStatus === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                          currentStatus === 'LICENÇA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditOrView(t, 'view')}
                            title="Visualizar Professor"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditOrView(t, 'edit')}
                            title="Editar Professor"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(t)}
                            title="Histórico de Auditoria"
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            title="Excluir Professor"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
          <div>
            Exibindo {paginatedTeachers.length} de {filteredTeachers.length} professor(es)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT / VIEW MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600/30 text-purple-400 rounded-2xl border border-purple-500/30">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-base">
                  {modalMode === 'create' ? 'Novo Cadastro de Professor' : modalMode === 'edit' ? 'Editar Cadastro de Professor' : 'Visualizar Professor'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/60 p-2 flex overflow-x-auto gap-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveFormTab('pessoais')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'pessoais' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                1. Dados Pessoais
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('profissional')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'profissional' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                2. Dados Profissionais
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('endereco')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'endereco' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                3. Endereço
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('contatos')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'contatos' ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                4. Contato & Status
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {feedbackMsg && (
                <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  feedbackMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* TAB 1: DADOS PESSOAIS */}
              {activeFormTab === 'pessoais' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome Completo *</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Prof. Dr. Ricardo Santos"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">CPF *</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome da Mãe</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Data de Nascimento</label>
                    <input
                      type="date"
                      disabled={modalMode === 'view'}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Sexo</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: DADOS PROFISSIONAIS */}
              {activeFormTab === 'profissional' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Titulação Acadêmica</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={academicTitle}
                      onChange={(e) => setAcademicTitle(e.target.value as AcademicTitle)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Graduação">Graduação</option>
                      <option value="Especialização">Especialização</option>
                      <option value="Mestrado">Mestrado</option>
                      <option value="Doutorado">Doutorado</option>
                      <option value="Pós-Doutorado">Pós-Doutorado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Conselho de Classe</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={council}
                      onChange={(e) => setCouncil(e.target.value as ProfessionalCouncil)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="COREN">COREN (Enfermagem)</option>
                      <option value="CRM">CRM (Medicina)</option>
                      <option value="CREFITO">CREFITO (Fisioterapia)</option>
                      <option value="CRO">CRO (Odontologia)</option>
                      <option value="CRP">CRP (Psicologia)</option>
                      <option value="OAB">OAB (Direito)</option>
                      <option value="MEC">MEC / Registro Docente</option>
                      <option value="Outro">Outro Conselho</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nº no Conselho / UF</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={councilNumber}
                        onChange={(e) => setCouncilNumber(e.target.value)}
                        placeholder="Ex: 123456"
                        className="w-2/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={councilUf}
                        onChange={(e) => setCouncilUf(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="SP"
                        className="w-1/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-center uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Especialidade / Área Principal</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Ex: Enfermagem em UTIP / Cardiologia"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Tipo de Professor *</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={teacherType}
                      onChange={(e) => setTeacherType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="SALA_DE_AULA">Professor de Sala de Aula</option>
                      <option value="ESTAGIO">Professor de Estágio</option>
                      <option value="AMBOS">Ambos (Sala e Estágio)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Validade do Registro Profissional</label>
                    <input
                      type="date"
                      disabled={modalMode === 'view'}
                      value={councilValidity}
                      onChange={(e) => setCouncilValidity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Registro Funcional Interno</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={professionalRegistry}
                      onChange={(e) => setProfessionalRegistry(e.target.value)}
                      placeholder="Ex: DOC-2024-001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: ENDEREÇO */}
              {activeFormTab === 'endereco' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>CEP</span>
                      {loadingCep && <Loader2 className="h-3 w-3 animate-spin text-purple-500" />}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCepBlur}
                        disabled={modalMode === 'view' || loadingCep}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Endereço</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Cidade / UF</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="w-2/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="UF"
                        className="w-1/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none text-center uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CONTATO & STATUS */}
              {activeFormTab === 'contatos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">E-mail Institucional *</label>
                    <input
                      type="email"
                      disabled={modalMode === 'view'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="professor@escola.edu.br"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">WhatsApp / Celular</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Situação Funcional</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                      <option value="LICENÇA">LICENÇA</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Observações Gerais</label>
                    <textarea
                      rows={3}
                      disabled={modalMode === 'view'}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Histórico pedagógico, disponibilidade de horário, observações contratuais..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-extrabold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Salvar Professor</span>
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        logs={getTeacherAuditLogs()}
        title="Histórico de Auditoria do Professor"
        entityName={selectedAuditTeacher?.name}
      />

    </div>
  );
};
