import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DetailedStudent, MaritalStatus } from '../../types/cadastros';
import { 
  getDetailedStudents, saveDetailedStudent, getNextDossierNumber,
  addAuditLog, getAuditLogs, fetchAddressByCep 
} from '../../services/cadastrosStorage';
import { AuditLogModal } from './AuditLogModal';
import type { User } from '../../types';
import { UserRole } from '../../types';

import { 
  Plus, Search, Edit3, Trash2, Eye, History, Check, 
  X, Filter, MapPin, Phone, Mail, FileText, CheckSquare, 
  Building, ChevronLeft, ChevronRight, AlertCircle, Sparkles, Loader2, User as UserIcon, FolderArchive
} from 'lucide-react';

const DOCUMENT_OPTIONS = [
  'RG',
  'CPF',
  'Título de Eleitor',
  'Certidão de Nascimento',
  'Certidão de Casamento',
  'Certidão de Averbação',
  'Comprovante de Endereço',
  'Foto 3x4',
  'Reservista',
  'Outros'
];

export const StudentRegistration: React.FC = () => {
  const { 
    users, courses, classes, addUser, updateUser, deleteUser, 
    studentDocuments, updateStudentDocumentStatus, currentUser 
  } = useApp();

  // Load detailed student data stored in local storage
  const [detailedMap, setDetailedMap] = useState<Record<string, DetailedStudent>>(() => getDetailedStudents());

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Audit Log Modal
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAuditStudent, setSelectedAuditStudent] = useState<DetailedStudent | null>(null);

  // Form State
  const [activeFormTab, setActiveFormTab] = useState<'pessoais' | 'endereco' | 'contatos' | 'complementar' | 'documentos'>('pessoais');
  
  const [enrollment, setEnrollment] = useState('');
  const [dossierNumber, setDossierNumber] = useState('1');
  const [name, setName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Outro'>('Masculino');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('Solteiro(a)');
  const [nationality, setNationality] = useState('Brasileira');
  const [birthCity, setBirthCity] = useState('');
  const [birthState, setBirthState] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [rgIssuer, setRgIssuer] = useState('');
  const [rgUf, setRgUf] = useState('');

  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Brasil');

  const [whatsapp, setWhatsapp] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [profession, setProfession] = useState('');
  const [notes, setNotes] = useState('');
  const [courseId, setCourseId] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO' | 'TRANCADO' | 'CONCLUÍDO'>('ATIVO');

  const [deliveredDocs, setDeliveredDocs] = useState<string[]>([]);

  const [loadingCep, setLoadingCep] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // All students from AppContext users
  const studentUsers = users.filter(u => u.role === UserRole.STUDENT);

  // Search & Filtered
  const filteredStudents = studentUsers.filter(st => {
    const d: Partial<DetailedStudent> = detailedMap[st.id] || {};
    const matchesSearch = 
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st.enrollment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st.dossierNumber || d.dossierNumber || '').toString().includes(searchTerm) ||
      (st.cpf || '').includes(searchTerm) ||
      (st.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || (d.status || st.status || 'ATIVO') === statusFilter;
    const matchesCourse = courseFilter === 'ALL' || (d.courseId || st.courseId) === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedStudentId(null);
    setActiveFormTab('pessoais');

    const generatedEnrollment = 'ALU' + Date.now().toString().slice(-6);
    const generatedDossier = getNextDossierNumber(studentUsers);
    setEnrollment(generatedEnrollment);
    setDossierNumber(generatedDossier);
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

    setProfession('');
    setNotes('');
    setCourseId(courses[0]?.id || '');
    setClassId('');
    setStatus('ATIVO');

    setDeliveredDocs(['RG', 'CPF', 'Comprovante de Endereço', 'Foto 3x4']);
    setFeedbackMsg(null);
    setShowModal(true);
  };

  const handleOpenEditOrView = (student: User, mode: 'edit' | 'view') => {
    setModalMode(mode);
    setSelectedStudentId(student.id);
    setActiveFormTab('pessoais');

    const d: Partial<DetailedStudent> = detailedMap[student.id] || {};

    setEnrollment(student.enrollment || d.enrollment || '');
    setDossierNumber(student.dossierNumber || d.dossierNumber || getNextDossierNumber(studentUsers));
    setName(student.name);
    setMotherName(d.motherName || '');
    setFatherName(d.fatherName || '');
    setGender(d.gender || 'Masculino');
    setMaritalStatus(d.maritalStatus || 'Solteiro(a)');
    setNationality(d.nationality || 'Brasileira');
    setBirthCity(d.birthCity || '');
    setBirthState(d.birthState || '');
    setBirthDate(d.birthDate || '');
    setCpf(student.cpf || d.cpf || '');
    setRg(d.rg || '');
    setRgIssuer(d.rgIssuer || '');
    setRgUf(d.rgUf || '');

    setCep(d.cep || '');
    setAddress(d.address || '');
    setNumber(d.number || '');
    setComplement(d.complement || '');
    setNeighborhood(d.neighborhood || '');
    setCity(d.city || '');
    setState(d.state || '');
    setCountry(d.country || 'Brasil');

    setWhatsapp(d.whatsapp || '');
    setPhone(student.phone || d.phone || '');
    setEmail(student.email || d.email || '');

    setProfession(d.profession || '');
    setNotes(d.notes || '');
    setCourseId(d.courseId || student.courseId || courses[0]?.id || '');
    setClassId(d.classId || student.classId || '');
    setStatus((d.status || student.status || 'ATIVO') as any);

    setDeliveredDocs(d.deliveredDocuments || ['RG', 'CPF']);
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

  const toggleDocDelivered = (docName: string) => {
    if (modalMode === 'view') return;
    if (deliveredDocs.includes(docName)) {
      setDeliveredDocs(deliveredDocs.filter(d => d !== docName));
    } else {
      setDeliveredDocs([...deliveredDocs, docName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    if (!name.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o Nome Completo do Aluno.' });
      return;
    }
    if (!email.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Informe o E-mail do Aluno.' });
      return;
    }

    const performer = currentUser?.name || 'Administrador';

    if (modalMode === 'create') {
      const newId = 'std_' + Date.now();
      const newUser: User = {
        id: newId,
        name: name.trim(),
        username: enrollment.trim() || email.trim(),
        email: email.trim(),
        role: UserRole.STUDENT,
        cpf: cpf.trim(),
        phone: phone.trim() || whatsapp.trim(),
        enrollment: enrollment.trim(),
        dossierNumber: dossierNumber.trim() || '1',
        active: status === 'ATIVO',
        status: status,
        courseId: courseId,
        classId: classId,
        createdAt: new Date().toISOString()
      };

      addUser(newUser);

      const detailed: DetailedStudent = {
        id: newId,
        enrollment: enrollment.trim(),
        dossierNumber: dossierNumber.trim() || '1',
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
        profession: profession.trim(),
        notes: notes.trim(),
        courseId,
        classId,
        status,
        deliveredDocuments: deliveredDocs,
        createdAt: new Date().toISOString()
      };

      saveDetailedStudent(detailed);
      setDetailedMap(getDetailedStudents());

      // Sync student documents status in AppContext
      DOCUMENT_OPTIONS.forEach(docName => {
        const docId = `doc_${newId}_${docName}`;
        const isDelivered = deliveredDocs.includes(docName);
        updateStudentDocumentStatus(docId, isDelivered ? 'ENTREGUE' : 'PENDENTE');
      });

      addAuditLog(newId, 'ALUNO', 'CRIADO', performer, `Aluno "${name}" (Matrícula: ${enrollment}) cadastrado no sistema.`);
      setFeedbackMsg({ type: 'success', text: `Aluno "${name}" cadastrado com sucesso!` });

    } else if (modalMode === 'edit' && selectedStudentId) {
      updateUser(selectedStudentId, {
        name: name.trim(),
        email: email.trim(),
        cpf: cpf.trim(),
        phone: phone.trim() || whatsapp.trim(),
        enrollment: enrollment.trim(),
        dossierNumber: dossierNumber.trim() || '1',
        courseId: courseId,
        classId: classId,
        status: status,
        active: status === 'ATIVO'
      });

      const detailed: DetailedStudent = {
        id: selectedStudentId,
        enrollment: enrollment.trim(),
        dossierNumber: dossierNumber.trim() || '1',
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
        profession: profession.trim(),
        notes: notes.trim(),
        courseId,
        classId,
        status,
        deliveredDocuments: deliveredDocs,
        updatedAt: new Date().toISOString()
      };

      saveDetailedStudent(detailed);
      setDetailedMap(getDetailedStudents());

      // Sync student documents status
      DOCUMENT_OPTIONS.forEach(docName => {
        const docId = `doc_${selectedStudentId}_${docName}`;
        const isDelivered = deliveredDocs.includes(docName);
        updateStudentDocumentStatus(docId, isDelivered ? 'ENTREGUE' : 'PENDENTE');
      });

      addAuditLog(selectedStudentId, 'ALUNO', 'EDITADO', performer, `Dados do aluno "${name}" (Matrícula: ${enrollment}) atualizados.`);
      setFeedbackMsg({ type: 'success', text: `Aluno "${name}" atualizado com sucesso!` });
    }

    setTimeout(() => {
      setShowModal(false);
      setFeedbackMsg(null);
    }, 1200);
  };

  const handleDelete = (student: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro do aluno "${student.name}"?`)) return;
    const performer = currentUser?.name || 'Administrador';
    deleteUser(student.id);
    addAuditLog(student.id, 'ALUNO', 'EXCLUIDO', performer, `Aluno "${student.name}" (Matrícula: ${student.enrollment}) excluído.`);
    alert(`Aluno "${student.name}" excluído com sucesso.`);
  };

  const handleOpenAudit = (student: User) => {
    const detailed = detailedMap[student.id] || { id: student.id, name: student.name, enrollment: student.enrollment || '' };
    setSelectedAuditStudent(detailed as DetailedStudent);
    setShowAuditModal(true);
  };

  const getStudentAuditLogs = () => {
    if (!selectedAuditStudent) return [];
    return getAuditLogs().filter(l => l.entityId === selectedAuditStudent.id && l.entityType === 'ALUNO');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, matrícula, CPF ou e-mail..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todas as Situações</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
            <option value="TRANCADO">Trancados</option>
            <option value="CONCLUÍDO">Concluídos</option>
          </select>

          <select
            value={courseFilter}
            onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate"
          >
            <option value="ALL">Todos os Cursos</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Aluno</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Aluno / Dossiê / Matrícula</th>
                <th className="py-3.5 px-4">CPF / Contato</th>
                <th className="py-3.5 px-4">Curso / Turma</th>
                <th className="py-3.5 px-4 text-center">Docs Pendentes</th>
                <th className="py-3.5 px-4 text-center">Situação</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum aluno encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st, idx) => {
                  const d: Partial<DetailedStudent> = detailedMap[st.id] || {};
                  const courseObj = courses.find(c => c.id === (d.courseId || st.courseId));
                  const classObj = classes.find(cl => cl.id === (d.classId || st.classId));
                  
                  // Docs calculation
                  const delivered = d.deliveredDocuments || ['RG', 'CPF'];
                  const pendingCount = Math.max(0, DOCUMENT_OPTIONS.length - delivered.length);

                  const currentStatus = d.status || st.status || 'ATIVO';
                  const currentDossier = d.dossierNumber || st.dossierNumber || (idx + 1).toString();

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0">
                            {st.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{st.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 rounded-md text-[10px] font-black font-mono border border-amber-300/80 dark:border-amber-800/60 inline-flex items-center gap-1">
                                <FolderArchive className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                Dossiê nº {currentDossier}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">Matrícula: {st.enrollment || '---'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-slate-200">{st.cpf || d.cpf || 'Não informado'}</div>
                        <div className="text-[11px] text-slate-400">{st.email || d.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-blue-600 dark:text-blue-400">{courseObj?.name || '---'}</div>
                        <div className="text-[11px] text-slate-400">{classObj?.name || 'Turma não alocada'}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {pendingCount === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <Check className="h-3 w-3" /> Regular
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            <AlertCircle className="h-3 w-3" /> {pendingCount} pendente(s)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          currentStatus === 'ATIVO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                          currentStatus === 'TRANCADO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                          currentStatus === 'CONCLUÍDO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditOrView(st, 'view')}
                            title="Visualizar Aluno"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditOrView(st, 'edit')}
                            title="Editar Aluno"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenAudit(st)}
                            title="Histórico de Auditoria"
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(st)}
                            title="Excluir Aluno"
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
            Exibindo {paginatedStudents.length} de {filteredStudents.length} aluno(s)
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

      {/* CREATE / EDIT / VIEW STUDENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-2xl border border-blue-500/30">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {modalMode === 'create' ? 'Novo Cadastro de Aluno' : modalMode === 'edit' ? 'Editar Cadastro de Aluno' : 'Visualizar Aluno'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Matrícula: <span className="font-mono text-blue-300 font-bold">{enrollment || '---'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Sub-Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/60 p-2 flex overflow-x-auto gap-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveFormTab('pessoais')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'pessoais' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                1. Dados Pessoais
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('endereco')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'endereco' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                2. Endereço
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('contatos')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'contatos' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                3. Contatos
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('complementar')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'complementar' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                4. Curso & Informações
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('documentos')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  activeFormTab === 'documentos' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                5. Documentos Entregues
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
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
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FolderArchive className="h-3.5 w-3.5 text-amber-500" />
                      Nº do Dossiê (Pasta) *
                    </label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={dossierNumber}
                      onChange={(e) => setDossierNumber(e.target.value)}
                      placeholder="Ex: 1"
                      className="w-full px-3.5 py-2.5 bg-amber-50/50 dark:bg-amber-950/20 font-mono text-amber-900 dark:text-amber-300 rounded-xl text-xs font-black border border-amber-200 dark:border-amber-800/60 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Código gerado para a pasta física e arquivamento de documentos e contratos do aluno.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Matrícula</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={enrollment}
                      onChange={(e) => setEnrollment(e.target.value)}
                      placeholder="Ex: ALU123456"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">Código interno de matrícula escolar.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">CPF *</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome Completo *</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva de Oliveira"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome da Mãe</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="Nome da mãe"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nome do Pai</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Nome do pai"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Data de Nascimento</label>
                    <input
                      type="date"
                      disabled={modalMode === 'view'}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Sexo</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Estado Civil</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                      <option value="União estável">União estável</option>
                      <option value="Emancipado(a)">Emancipado(a)</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Nacionalidade</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="Ex: Brasileira"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">RG</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      placeholder="Número do RG"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Órgão Emissor / UF</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={rgIssuer}
                        onChange={(e) => setRgIssuer(e.target.value)}
                        placeholder="Ex: SSP"
                        className="w-2/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={rgUf}
                        onChange={(e) => setRgUf(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="UF"
                        className="w-1/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Naturalidade (Cidade / UF)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={birthCity}
                        onChange={(e) => setBirthCity(e.target.value)}
                        placeholder="Cidade de nascimento"
                        className="w-2/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={birthState}
                        onChange={(e) => setBirthState(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="UF"
                        className="w-1/3 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-center uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ENDEREÇO */}
              {activeFormTab === 'endereco' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>CEP</span>
                      {loadingCep && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        disabled={modalMode === 'view'}
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCepBlur}
                        disabled={modalMode === 'view' || loadingCep}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Endereço / Logradouro</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua, Avenida, Alameda..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Número</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Ex: 123"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Complemento</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Apto, Bloco, Casa..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Bairro</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Cidade</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Cidade"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Estado (UF)</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      maxLength={2}
                      placeholder="UF"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">País</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Brasil"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: CONTATOS */}
              {activeFormTab === 'contatos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">E-mail de Acesso *</label>
                    <input
                      type="email"
                      disabled={modalMode === 'view'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aluno@email.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">WhatsApp</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Telefone Fixo / Recado</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 0000-0000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: CURSO & INFORMAÇÕES */}
              {activeFormTab === 'complementar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Curso Vinculado</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Nenhum curso selecionado</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Turma Ativa</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione uma turma...</option>
                      {classes
                        .filter(cl => !courseId || cl.courseId === courseId)
                        .map(cl => (
                          <option key={cl.id} value={cl.id}>{cl.name} ({cl.shift})</option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Situação Acadêmica</label>
                    <select
                      disabled={modalMode === 'view'}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                      <option value="TRANCADO">TRANCADO</option>
                      <option value="CONCLUÍDO">CONCLUÍDO</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Profissão</label>
                    <input
                      type="text"
                      disabled={modalMode === 'view'}
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder="Ex: Auxiliar de Enfermagem"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Observações Gerais</label>
                    <textarea
                      rows={3}
                      disabled={modalMode === 'view'}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações pedagógicas ou administrativas sobre o estudante..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: DOCUMENTOS ENTREGUES */}
              {activeFormTab === 'documentos' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 font-medium">
                    <strong className="font-extrabold block mb-1">Regra de Validação de Documentos:</strong>
                    Marque os documentos físicos entregues pelo aluno. Documentos marcados como entregues serão considerados <strong>REGULARES</strong>. Os não marcados ficarão automaticamente listados como <strong>PENDENTES</strong> para upload no Portal do Aluno.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {DOCUMENT_OPTIONS.map((docName) => {
                      const isDelivered = deliveredDocs.includes(docName);

                      return (
                        <label
                          key={docName}
                          onClick={() => toggleDocDelivered(docName)}
                          className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isDelivered
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
                              : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={modalMode === 'view'}
                            checked={isDelivered}
                            onChange={() => {}}
                            className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                          />
                          <div className="text-xs font-bold">{docName}</div>
                          {isDelivered ? (
                            <span className="ml-auto text-[10px] font-black bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                              ENTREGUE
                            </span>
                          ) : (
                            <span className="ml-auto text-[10px] font-black bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 px-2 py-0.5 rounded-full">
                              PENDENTE
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-extrabold text-xs cursor-pointer"
                >
                  Cancelar
                </button>

                {modalMode !== 'view' && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Salvar Cadastro</span>
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
        logs={getStudentAuditLogs()}
        title="Histórico de Auditoria do Aluno"
        entityName={selectedAuditStudent?.name}
      />

    </div>
  );
};
