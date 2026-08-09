import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StaffMember, StaffPermissions, PermissionModule } from '../types';
import { PERMISSION_MODULES, getDefaultStaffPermissions } from '../utils/permissionUtils';
import { Users, UserPlus, Shield, Key, Copy, Check, Search, Edit2, Trash2, Lock, Eye, PlusCircle, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { criarAcesso } from '../lib/supabase';
import { criarAcessoDeUmDocente, definirAcessoDaConta } from '../lib/repositorios';

export const StaffManager: React.FC = () => {
  const { staffMembers, addStaffMember, updateStaffMember, deleteStaffMember, updateStaffPermissions } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [permissionsModalStaff, setPermissionsModalStaff] = useState<StaffMember | null>(null);

  // Created Credentials Popup State
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; pass: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('Secretário Acadêmico');
  const [active, setActive] = useState(true);
  const [permissions, setPermissions] = useState<StaffPermissions>(getDefaultStaffPermissions(true));

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [criandoAcesso, setCriandoAcesso] = useState(false);

  /**
   * Monta o nome de usuário a partir do nome da pessoa: `func_maria.dores`.
   *
   * Mesma regra do cadastro de professor. Se dois nomes derem no mesmo login,
   * quem resolve é o servidor, acrescentando 2, 3, 4 no fim — conferir pela
   * lista do navegador daria falso negativo.
   */
  const montarLogin = (nomeCompleto: string) => {
    const semAcento = (s: string) =>
      s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
    const primeiro = semAcento(partes[0] || 'funcionario');
    const ultimo = partes.length > 1 ? semAcento(partes[partes.length - 1]) : '';
    return `func_${ultimo ? `${primeiro}.${ultimo}` : primeiro}`;
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setCpf('');
    setPhone('');
    setEmail('');
    setPosition('Secretário Acadêmico');
    setActive(true);
    setPermissions(getDefaultStaffPermissions(true));
    setShowAddModal(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setName(staff.name);
    setCpf(staff.cpf);
    setPhone(staff.phone || '');
    setEmail(staff.email || '');
    setPosition(staff.position || 'Auxiliar Administrativo');
    setActive(staff.active);
    setPermissions(staff.permissions || getDefaultStaffPermissions(true));
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !cpf.trim() || !email.trim()) {
      setFeedback({ type: 'error', text: 'Por favor, preencha os campos obrigatórios (Nome, CPF e E-mail).' });
      return;
    }

    if (editingStaff) {
      const updated: StaffMember = {
        ...editingStaff,
        name: name.trim(),
        cpf: cpf.trim(),
        phone: phone.trim(),
        email: email.trim(),
        position: position.trim(),
        active,
        permissions
      };
      updateStaffMember(updated);

      // ATIVO/INATIVO PRECISA VALER NO SERVIDOR, NÃO SÓ NA LISTA.
      //
      // Marcar um funcionário como INATIVO mexia apenas no navegador. A conta
      // continuava ativa em `usuarios` e a pessoa entrava normalmente no dia
      // seguinte, com permissão de secretaria.
      if (editingStaff.active !== active && editingStaff.username) {
        const r = await definirAcessoDaConta(editingStaff.username, active);
        if (!r.ok) {
          setFeedback({
            type: 'error',
            text: `Os dados foram atualizados, mas o ACESSO de ${name} NÃO foi ${active ? 'reativado' : 'bloqueado'} no servidor. A pessoa ${active ? 'ainda não consegue' : 'ainda consegue'} entrar. Motivo: ${r.erro}`,
          });
          return;
        }
      }

      setFeedback({ type: 'success', text: `Dados de ${name} atualizados com sucesso!` });
      setTimeout(() => {
        setShowAddModal(false);
        setFeedback(null);
      }, 1200);
    } else {
      // A CONTA DE ACESSO PRECISA EXISTIR NO SERVIDOR, NÃO SÓ NA TELA.
      //
      // Antes, esta tela apenas guardava a pessoa na lista e mostrava um
      // usuário e a senha `Func@2026`. Nenhuma conta era criada no banco: a
      // secretária recebia os dados, tentava entrar e não conseguia. Para quem
      // cadastrou não aparecia erro nenhum — o problema só aparecia do outro
      // lado, no dia seguinte, e parecia senha errada.
      //
      // O botão dizia "Cadastrar Funcionário e Gerar Login" e o login não era
      // gerado em lugar nenhum.
      //
      // Agora usamos o mesmo caminho já testado do cadastro de secretaria:
      // papel SECRETARIA (que o portal traduz para funcionário, não para
      // administrador) e senha forte gerada pelo servidor.
      const login = montarLogin(name.trim());

      setCriandoAcesso(true);
      let resultado: { ok: boolean; senhaInicial?: string; loginUsado?: string; erro?: string };
      try {
        resultado = await criarAcessoDeUmDocente(criarAcesso, {
          fichaId: '',                       // funcionário não tem ficha em tabela própria
          nome: name.trim(),
          login,
          email: email.trim(),
          papel: 'SECRETARIA',
          senha: undefined,                  // em branco = o servidor gera uma forte
        });
      } catch (err: any) {
        resultado = { ok: false, erro: err?.message || String(err) };
      } finally {
        setCriandoAcesso(false);
      }

      if (!resultado.ok) {
        // Nada é salvo pela metade: sem conta, sem cadastro. Um funcionário na
        // lista que não consegue entrar é pior do que nenhum funcionário.
        setFeedback({
          type: 'error',
          text: `A conta de acesso NÃO foi criada, então o cadastro não foi salvo. Motivo: ${resultado.erro}`,
        });
        return;
      }

      const res = addStaffMember({
        name: name.trim(),
        cpf: cpf.trim(),
        phone: phone.trim(),
        email: email.trim(),
        position: position.trim(),
        active,
        permissions,
        username: resultado.loginUsado || login,
      });

      setCreatedCredentials({
        name: res.staff.name,
        username: resultado.loginUsado || login,
        // A senha mostrada é a que o servidor realmente gravou. Antes era um
        // texto fixo na tela, que não correspondia a conta nenhuma.
        pass: resultado.senhaInicial || res.initialPassword,
      });

      setShowAddModal(false);
    }
  };

  const togglePermissionAction = (mod: PermissionModule, action: 'view' | 'create' | 'edit' | 'delete' | 'print' | 'export') => {
    setPermissions(prev => {
      const currentMod = prev[mod] || { view: false, create: false, edit: false, delete: false, print: false, export: false };
      return {
        ...prev,
        [mod]: {
          ...currentMod,
          [action]: !currentMod[action]
        }
      };
    });
  };

  const toggleAllModuleActions = (mod: PermissionModule, grantAll: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [mod]: {
        view: grantAll,
        create: grantAll,
        edit: grantAll,
        delete: grantAll,
        print: grantAll,
        export: grantAll
      }
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStaff = staffMembers.filter(s =>
    (s.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cpf.includes(searchTerm) ||
    (s.username ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.position ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="staff-manager-root" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-400/20">
              <Shield className="h-3.5 w-3.5" /> Gestão da Equipe Interna & RBAC
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Funcionários do Sistema</h2>
            <p className="text-sm text-indigo-200 mt-1 max-w-2xl leading-relaxed">
              Cadastre funcionários administrativos, gerencie logins automáticos e defina 
              <strong> controle de permissões granular</strong> por módulo (visualizar, criar, editar, excluir, imprimir, exportar).
            </p>
          </div>
          <button
            type="button"
            id="btn-cadastrar-funcionario"
            onClick={handleOpenAdd}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <UserPlus className="h-5 w-5" /> Cadastrar Funcionário
          </button>
        </div>
      </div>

      {/* Credentials Banner Alert if newly created */}
      {createdCredentials && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl border border-emerald-700 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase tracking-wider">
                Novo Login Gerado
              </span>
              <h3 className="text-lg font-bold">Credenciais de Acesso de {createdCredentials.name}</h3>
              <p className="text-xs text-emerald-200">
                Passe estas credenciais ao funcionário para que ele acesse o Portal Acadêmico.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-emerald-950 p-3 rounded-2xl border border-emerald-800">
              <div className="text-xs font-mono space-y-1">
                <div>Usuário: <strong className="text-emerald-300 font-bold">{createdCredentials.username}</strong></div>
                <div>Senha Inicial: <strong className="text-emerald-300 font-bold">{createdCredentials.pass}</strong></div>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(`Usuário: ${createdCredentials.username}\nSenha: ${createdCredentials.pass}`)}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="text-emerald-300 hover:text-white text-xs underline"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      )}

      {/* Search & Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome, CPF, cargo ou usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
          Total de Funcionários Ativos: <span className="text-indigo-600 dark:text-indigo-400 text-sm font-extrabold">{staffMembers.filter(s => s.active).length}</span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Funcionário</th>
                <th className="px-6 py-4">CPF / Contato</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Login de Acesso</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações & Permissões</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="font-bold">Nenhum funcionário encontrado.</p>
                    <p className="text-xs mt-1">Clique em "Cadastrar Funcionário" para adicionar um novo membro da equipe.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-white text-sm">{staff.name}</div>
                      <div className="text-slate-400 text-xs">{staff.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 dark:text-slate-300 font-mono">{staff.cpf}</div>
                      <div className="text-slate-400 text-xs">{staff.phone || 'Sem telefone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-xs">
                        {staff.position}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <Key className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{staff.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        staff.active 
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                      }`}>
                        {staff.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(staff)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Deseja remover o funcionário ${staff.name}?\n\nO acesso dele ao portal será bloqueado.`)) return;

                            // BLOQUEIA O ACESSO ANTES DE TIRAR DA LISTA.
                            //
                            // Nesta ordem de propósito: se a gravação falhar, a
                            // pessoa continua na lista e a secretaria vê o
                            // problema. Ao contrário, o funcionário sumiria da
                            // tela e continuaria entrando no portal — sem
                            // ninguém para notar.
                            if (staff.username) {
                              const r = await definirAcessoDaConta(staff.username, false);
                              if (!r.ok) {
                                alert(
                                  `O funcionário NÃO foi removido.\n\n` +
                                  `Não foi possível bloquear o acesso de ${staff.name} no servidor, ` +
                                  `e removê-lo da lista deixaria a conta ativa sem ninguém vendo.\n\n` +
                                  `Motivo: ${r.erro}`
                                );
                                return;
                              }
                            }
                            deleteStaffMember(staff.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Cadastrar / Editar Funcionário + Permissões */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">
                      {editingStaff ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Preencha os dados e defina as permissões de acesso
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                >
                  ✕
                </button>
              </div>

              {feedback && (
                <div className={`p-4 mb-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                }`}>
                  {feedback.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Dados Pessoais */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    1. Dados Pessoais e Institucionais
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Nome Completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Maria das Dores"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        CPF <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        E-mail de Contato <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="funcionario@colegio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Telefone / WhatsApp
                      </label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Cargo
                      </label>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      >
                        <option value="Secretário Acadêmico">Secretário Acadêmico</option>
                        <option value="Auxiliar Administrativo">Auxiliar Administrativo</option>
                        <option value="Assistente de Alunos">Assistente de Alunos</option>
                        <option value="Coordenador Pedagógico">Coordenador Pedagógico</option>
                        <option value="Tesoureiro / Financeiro">Tesoureiro / Financeiro</option>
                        <option value="Diretor / Gestor">Diretor / Gestor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Situação
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="active-status"
                            checked={active}
                            onChange={() => setActive(true)}
                            className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ATIVO</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="active-status"
                            checked={!active}
                            onChange={() => setActive(false)}
                            className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">INATIVO</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissões RBAC */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        2. Controle de Permissões de Acesso (RBAC)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Marque quais ações este funcionário pode realizar em cada módulo. Se a ação "Visualizar" for desmarcada, a tela nem aparecerá para ele.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40">
                    {PERMISSION_MODULES.map((mod) => {
                      const modPerm = permissions[mod.id] || { view: false, create: false, edit: false, delete: false, print: false, export: false };
                      const isAllChecked = modPerm.view && modPerm.create && modPerm.edit && modPerm.delete && modPerm.print && modPerm.export;

                      return (
                        <div key={mod.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {mod.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAllModuleActions(mod.id, !isAllChecked)}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {isAllChecked ? 'Desmarcar Tudo' : 'Marcar Tudo'}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
                            {(['view', 'create', 'edit', 'delete', 'print', 'export'] as const).map((act) => {
                              const labels = {
                                view: 'Visualizar',
                                create: 'Criar',
                                edit: 'Editar',
                                delete: 'Excluir',
                                print: 'Imprimir',
                                export: 'Exportar'
                              };
                              return (
                                <label key={act} className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={!!modPerm[act]}
                                    onChange={() => togglePermissionAction(mod.id, act)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                  />
                                  <span>{labels[act]}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={criandoAcesso}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-wait rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>
                      {criandoAcesso
                        ? 'Criando a conta no servidor...'
                        : editingStaff ? 'Salvar Alterações' : 'Cadastrar Funcionário e Gerar Login'}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
