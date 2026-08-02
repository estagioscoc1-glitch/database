/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Send, User as UserIcon, Users, MessageSquare, 
  ArrowLeft, Check, CheckCheck, MessageCircle, Sparkles, SendHorizontal, GraduationCap,
  ChevronRight, FileText, Image as ImageIcon, Mic, Download
} from 'lucide-react';

interface MessageCenterProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContactId: string | null;
  setSelectedContactId: (id: string | null) => void;
}

export const MessageCenter: React.FC<MessageCenterProps> = ({
  isOpen,
  onClose,
  selectedContactId,
  setSelectedContactId
}) => {
  const { currentUser, users, messages, sendMessage, notifications, clearNotifications } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [typedMessage, setTypedMessage] = useState('');
  
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [multiTypedMessage, setMultiTypedMessage] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSendMultiMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!multiTypedMessage.trim() || !currentUser || selectedRecipientIds.length === 0) return;
    
    // Send message to each selected recipient
    selectedRecipientIds.forEach(id => {
      sendMessage(currentUser.name, currentUser.role, id, multiTypedMessage.trim());
    });
    
    setMultiTypedMessage('');
    setSelectedRecipientIds([]);
    setIsMultiSelect(false);
  };

  // Clear unread notifications when message center is opened
  useEffect(() => {
    if (isOpen && currentUser) {
      clearNotifications(currentUser.id);
    }
  }, [isOpen, currentUser, clearNotifications]);

  // Find the selected user details
  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return users.find(u => u.id === selectedContactId) || null;
  }, [selectedContactId, users]);

  // Filter out current user, and filter by search and role
  const filteredUsers = useMemo(() => {
    if (!currentUser) return [];
    
    return users.filter(u => {
      // Don't show current user
      if (u.id === currentUser.id) return false;

      // Filter by role (we only care about STUDENT and TEACHER, but admins can also be listed if they exist)
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // Search matches
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const nameMatch = u.name.toLowerCase().includes(query);
      const enrollmentMatch = u.enrollment?.toLowerCase().includes(query) || false;
      const emailMatch = u.email?.toLowerCase().includes(query) || false;
      const cpfMatch = u.cpf?.toLowerCase().includes(query) || false;
      const roleMatch = u.role.toLowerCase().includes(query);

      return nameMatch || enrollmentMatch || emailMatch || cpfMatch || roleMatch;
    });
  }, [users, currentUser, searchQuery, roleFilter]);

  // Filter messages exchanged with the selected user
  const activeConversationMessages = useMemo(() => {
    if (!currentUser || !selectedContact) return [];

    return messages
      .filter(m => {
        const isCurrentSender = m.senderName.toUpperCase() === currentUser.name.toUpperCase() && m.recipientId === selectedContact.id;
        const isCurrentRecipient = m.recipientId === currentUser.id && m.senderName.toUpperCase() === selectedContact.name.toUpperCase();
        
        // Handle coordinates/broadcasts (e.g. ALL_TEACHERS sent by admins)
        const isAdminToAllTeachers = selectedContact.role === UserRole.ADMIN && currentUser.role === UserRole.TEACHER && m.recipientId === 'ALL_TEACHERS' && m.senderName.toUpperCase() === selectedContact.name.toUpperCase();
        
        return isCurrentSender || isCurrentRecipient || isAdminToAllTeachers;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [messages, currentUser, selectedContact]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationMessages, selectedContactId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedMessage.trim() || !currentUser || !selectedContact) return;

    sendMessage(currentUser.name, currentUser.role, selectedContact.id, typedMessage.trim());
    setTypedMessage('');
  };

  if (!isOpen || !currentUser) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end no-print font-sans select-none">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        />

        {/* Sidebar Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full sm:w-[480px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 bg-gradient-to-r from-blue-700 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                <MessageSquare className="h-5 w-5 text-blue-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Central de Mensagens</h3>
                <p className="text-[10px] text-blue-200/80 font-bold">LYNX EDU SISTEMAS INTELIGENTES</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-all outline-none focus:ring-2 focus:ring-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {!selectedContact ? (
                /* USER SEARCH & LIST VIEW */
                <motion.div
                  key="search-list"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex-1 flex flex-col overflow-hidden p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Buscar Alunos ou Professores
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMultiSelect(!isMultiSelect);
                        setSelectedRecipientIds([]);
                      }}
                      className={`px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        isMultiSelect
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                      }`}
                    >
                      {isMultiSelect ? '✓ Seleção Ativa' : '⚙ Seleção Múltipla'}
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, matrícula ou e-mail..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-medium transition-all shadow-sm"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-md text-slate-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider">
                    <button
                      onClick={() => setRoleFilter('ALL')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
                        roleFilter === 'ALL'
                          ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-100 dark:border-slate-700/50'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setRoleFilter(UserRole.TEACHER)}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
                        roleFilter === UserRole.TEACHER
                          ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-100 dark:border-slate-700/50'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Professores
                    </button>
                    <button
                      onClick={() => setRoleFilter(UserRole.STUDENT)}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
                        roleFilter === UserRole.STUDENT
                          ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-sm border border-slate-100 dark:border-slate-700/50'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      Alunos
                    </button>
                  </div>

                  {/* Users List */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const isSelected = selectedRecipientIds.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            onClick={() => {
                              if (isMultiSelect) {
                                if (isSelected) {
                                  setSelectedRecipientIds(selectedRecipientIds.filter(id => id !== user.id));
                                } else {
                                  setSelectedRecipientIds([...selectedRecipientIds, user.id]);
                                }
                              } else {
                                setSelectedContactId(user.id);
                              }
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-sm hover:scale-[1.01] ${
                              isSelected
                                ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-300 dark:border-blue-900'
                                : 'bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${
                                user.role === UserRole.TEACHER 
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' 
                                  : 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                              }`}>
                                {user.role === UserRole.TEACHER ? <Users className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                              </div>
                              <div className="text-left">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase leading-tight">
                                  {user.name}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                  {user.role === UserRole.TEACHER ? 'Professor' : 'Aluno'} 
                                  {user.enrollment && ` • Matrícula: ${user.enrollment}`}
                                  {user.cpf && ` • CPF: ${user.cpf}`}
                                </p>
                                <span className="text-[9px] text-slate-400 block truncate max-w-[200px]">
                                  {user.email || 'SEM E-MAIL CADASTRADO'}
                                </span>
                              </div>
                            </div>
                            
                            {isMultiSelect ? (
                              <div className={`h-5 w-5 rounded-lg border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 dark:border-slate-700 bg-transparent'
                              }`}>
                                {isSelected && <Check className="h-3 w-3 font-extrabold" />}
                              </div>
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <span className="text-xs font-semibold">Nenhum aluno ou professor encontrado</span>
                        <span className="text-[10px] text-slate-400">Verifique a grafia ou o filtro selecionado</span>
                      </div>
                    )}
                  </div>

                  {/* Multi-Select Sending Panel */}
                  {isMultiSelect && selectedRecipientIds.length > 0 && (
                    <motion.form
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      onSubmit={handleSendMultiMessage}
                      className="p-3 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-3 shrink-0"
                    >
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-blue-750 dark:text-blue-300">
                        <span>Destinatários selecionados: {selectedRecipientIds.length}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRecipientIds([])}
                          className="text-red-500 hover:underline cursor-pointer font-bold"
                        >
                          Limpar tudo
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={`ENVIAR PARA OS ${selectedRecipientIds.length} SELECIONADOS (MAIÚSCULO)...`}
                          value={multiTypedMessage}
                          onChange={(e) => setMultiTypedMessage(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-black uppercase shadow-sm placeholder:normal-case placeholder:font-semibold"
                        />
                        <button
                          type="submit"
                          disabled={!multiTypedMessage.trim()}
                          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:dark:bg-slate-850 text-white disabled:text-slate-400 rounded-xl shadow-md disabled:shadow-none hover:shadow-blue-600/20 transition-all shrink-0 cursor-pointer flex items-center justify-center border border-transparent disabled:border-slate-200 disabled:dark:border-slate-800"
                        >
                          <SendHorizontal className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </motion.form>
                  )}
                </motion.div>
              ) : (
                /* CHAT VIEW */
                <motion.div
                  key="chat-history"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Chat Top Nav */}
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedContactId(null)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-all outline-none"
                    >
                      <ArrowLeft className="h-4.5 w-4.5" />
                    </button>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-slate-800 dark:text-white uppercase truncate max-w-[240px]">
                          {selectedContact.name}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide ${
                          selectedContact.role === UserRole.TEACHER 
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' 
                            : selectedContact.role === UserRole.STUDENT
                              ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {selectedContact.role === UserRole.TEACHER ? 'PROFESSOR' : selectedContact.role === UserRole.STUDENT ? 'ALUNO' : 'ADM'}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">
                        {selectedContact.enrollment ? `Matrícula: ${selectedContact.enrollment}` : selectedContact.email}
                      </p>
                    </div>
                  </div>

                  {/* Chat History Messages */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-3">
                    {activeConversationMessages.length > 0 ? (
                      activeConversationMessages.map((msg) => {
                        const isMe = msg.senderName.toUpperCase() === currentUser.name.toUpperCase();
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 px-1.5">
                              {isMe ? 'Você' : msg.senderName}
                            </div>
                            <div
                              className={`p-3 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed shadow-sm relative space-y-2 ${
                                isMe
                                  ? 'bg-blue-600 text-white rounded-tr-none'
                                  : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-150 dark:border-slate-800'
                              }`}
                            >
                              {msg.content && (
                                <p className="break-words select-text uppercase">{msg.content}</p>
                              )}
                              
                              {msg.attachmentUrl && (
                                <div className={`p-2 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] ${
                                  isMe 
                                    ? 'bg-blue-700/60 border border-blue-500/30 text-white' 
                                    : 'bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                                }`}>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`p-1 rounded shrink-0 ${
                                      isMe ? 'bg-blue-800/40 text-blue-200' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                                    }`}>
                                      {msg.attachmentType === 'pdf' ? (
                                        <FileText className="h-3.5 w-3.5" />
                                      ) : msg.attachmentType === 'image' ? (
                                        <ImageIcon className="h-3.5 w-3.5" />
                                      ) : (
                                        <Mic className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    <span className="font-bold truncate max-w-[120px] sm:max-w-[150px]">
                                      {msg.attachmentName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                                    {msg.attachmentType === 'audio' && (
                                      <audio src={msg.attachmentUrl} controls className="h-6 w-[120px]" />
                                    )}
                                    {msg.attachmentType === 'image' && (
                                      <img src={msg.attachmentUrl} alt="Anexo" referrerPolicy="no-referrer" className="h-6 w-6 rounded object-cover border border-slate-200/35" />
                                    )}
                                    <a
                                      href={msg.attachmentUrl}
                                      download={msg.attachmentName || 'arquivo'}
                                      className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-0.5 transition-all select-none ${
                                        isMe 
                                          ? 'bg-white text-blue-700 hover:bg-slate-100' 
                                          : 'bg-blue-600 text-white hover:bg-blue-700'
                                      }`}
                                    >
                                      <Download className="h-2.5 w-2.5" /> Baixar
                                    </a>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-70">
                                <span>{new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && <CheckCheck className="h-3 w-3" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <MessageCircle className="h-10 w-10 text-slate-300 dark:text-slate-800 animate-pulse" />
                        <span className="text-xs font-semibold">Nenhuma mensagem ainda</span>
                        <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                          Escreva sua mensagem abaixo para iniciar uma conversa segura.
                        </p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Send Message Input Form */}
                  <form
                    onSubmit={handleSendMessage}
                    className="p-3 sm:p-4 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="ESCREVA SUA MENSAGEM AQUI (SERÁ AUTOMATICAMENTE FORMATADA EM MAIÚSCULA)..."
                      value={typedMessage}
                      onChange={(e) => setTypedMessage(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 text-xs text-slate-800 dark:text-white font-black transition-all shadow-sm uppercase placeholder:normal-case placeholder:font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={!typedMessage.trim()}
                      className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:dark:bg-slate-850 text-white disabled:text-slate-400 rounded-xl shadow-md disabled:shadow-none hover:shadow-blue-600/20 transition-all shrink-0 cursor-pointer flex items-center justify-center border border-transparent disabled:border-slate-200 disabled:dark:border-slate-800"
                    >
                      <SendHorizontal className="h-4.5 w-4.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
