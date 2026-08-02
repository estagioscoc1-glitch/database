import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Sparkles, X, Send, HelpCircle, MessageSquare, 
  CheckCircle, Calendar, MapPin, Briefcase, UserCheck, 
  FileText, Database, ShieldAlert, ArrowRight, RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { responderAssistente } from '../lib/assistente';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

export default function HelperBot() {
  const { currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasNewAlert(false);
    }
  }, [messages, isOpen]);

  // Set initial role-specific helper messages
  useEffect(() => {
    if (!currentUser) return;

    let initialText = '';
    if (currentUser.role === UserRole.ADMIN) {
      initialText = `### Bem-vindo à Central de Ajuda LYNX!

Olá, **Administrador**! Sou o LYNX Assistente, seu assistente inteligente de gestão.

Estou aqui para ajudar você a dominar todos os recursos do portal acadêmico. Como administrador, você possui controle absoluto de registros, turmas, diários e segurança.

Digite sua dúvida sobre o sistema no chat abaixo e eu responderei imediatamente!`;
    } else if (currentUser.role === UserRole.TEACHER) {
      initialText = `### Bem-vindo à Central de Ajuda LYNX!

Olá, **Professor(a) ${currentUser.name}**! Sou o LYNX Assistente, estou aqui para otimizar sua rotina pedagógica.

Posso te orientar sobre o preenchimento de diários de classe, lançamentos rápidos de notas e faltas na planilha, registro de aulas dadas e sobre os prazos de fechamento dos bimestres para evitar bloqueios automáticos do sistema.

Digite sua dúvida no chat abaixo e eu responderei imediatamente!`;
    } else {
      initialText = `### Bem-vindo à Central de Ajuda LYNX!

Olá, **Aluno(a) ${currentUser.name}**! Sou o LYNX Assistente, seu guia oficial dentro do colégio.

Estou aqui para ajudar você a acompanhar suas notas, ver sua frequência geral acumulada, emitir declarações escolares digitais oficiais prontas para impressão na hora, e controlar suas horas de estágio curricular.

Digite sua dúvida no chat abaixo e eu responderei imediatamente!`;
    }

    setMessages([
      {
        sender: 'bot',
        text: initialText,
        timestamp: new Date()
      }
    ]);
  }, [currentUser]);

  if (!currentUser) return null;

  // Submit query to Helper API endpoint
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Add user message to state
    const newUserMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // O ASSISTENTE RODA AQUI, NO NAVEGADOR
      //
      // Antes ele perguntava ao servidor (/api/helper-bot). Isso fazia sentido
      // quando havia uma IA do outro lado. Hoje as respostas são texto pronto,
      // comparado por palavra-chave — não há motivo para uma ida ao servidor.
      //
      // E havia um custo real: hospedado no Cloudflare, que serve só arquivos,
      // a chamada falhava e o assistente ficava mudo. Rodando aqui, ele
      // funciona em qualquer lugar, inclusive sem internet.
      //
      // Se um dia a IA voltar, basta tentar o servidor primeiro e cair aqui
      // quando ele não responder.
      const texto = responderAssistente(textToSend, currentUser.role.toLowerCase() as any);
      await new Promise(r => setTimeout(r, 350));   // respiro, para não parecer travado
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: texto,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error(error);
      // Graceful local error response fallback
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `⚠️ **Ops! Encontrei uma pequena instabilidade na conexão.**\n\nPorém, não se preocupe! Como assistente local, posso te adiantar o seguinte:\n- Se precisar saber sobre **lançamento de notas e faltas**, certifique-se de preencher a planilha de notas na aba correspondente e clicar em **"Salvar Alterações"** antes do prazo final.\n- Para **Estágios Curriculares**, itens pendentes de alocação de local ou de nota aparecerão em laranja como **"PENDENTE"**.\n- Para emissão de **declarações de matrícula**, use a aba de declarações oficiais para gerar o PDF assinado.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Render text helper with custom Markdown styling
  const renderMessageText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-[11px] sm:text-xs leading-relaxed select-text">
        {lines.map((line, index) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={index} className="font-extrabold text-xs sm:text-[13px] text-slate-800 dark:text-white mt-4 mb-2 uppercase tracking-wide border-b border-slate-150 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>{line.replace('### ', '')}</span>
              </h4>
            );
          }

          let renderedLine: React.ReactNode = line;
          if (line.includes('**')) {
            const parts = line.split('**');
            renderedLine = parts.map((part, pIdx) => {
              if (pIdx % 2 === 1) {
                return (
                  <strong 
                    key={pIdx} 
                    className="font-black text-slate-900 dark:text-white bg-amber-500/10 dark:bg-amber-400/10 px-1 py-0.5 rounded text-[10px] sm:text-[11px]"
                  >
                    {part}
                  </strong>
                );
              }
              return part;
            });
          }

          // bullet lists
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
              <div key={index} className="flex items-start gap-2 pl-2">
                <span className="text-amber-500 mt-1 shrink-0 text-[10px]">✦</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{line.trim().substring(2)}</span>
              </div>
            );
          }

          // numbered lists
          const numMatch = line.trim().match(/^(\d+)\.\s(.*)/);
          if (numMatch) {
            return (
              <div key={index} className="flex items-start gap-2 pl-2">
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 dark:text-slate-400 rounded shrink-0">{numMatch[1]}</span>
                <span className="text-slate-600 dark:text-slate-350 font-medium">{numMatch[2]}</span>
              </div>
            );
          }

          if (line.trim() === '') {
            return <div key={index} className="h-1.5" />;
          }

          return <p key={index} className="text-slate-600 dark:text-slate-300 font-medium">{renderedLine}</p>;
        })}
      </div>
    );
  };

  return (
    <div id="lynx-helper-bot-container" className="no-print">
      
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
        <AnimatePresence>
          {hasNewAlert && !isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              onClick={() => setIsOpen(true)}
              className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-2xl shadow-lg shadow-amber-500/20 border border-amber-400 flex items-center gap-1.5 cursor-pointer hover:bg-amber-400 transition-all active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Dúvidas? Fale comigo!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer select-none transition-all active:scale-95 duration-300 relative group ${
            isOpen 
              ? 'bg-slate-900 border-slate-850 text-white shadow-slate-950/20' 
              : 'bg-gradient-to-tr from-amber-500 to-amber-400 border-amber-300 text-slate-950 shadow-amber-500/20 hover:scale-105'
          }`}
          title="Central de Ajuda LYNX"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <div className="relative">
              <Bot className="h-6 w-6 animate-bounce" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-amber-400 animate-ping" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border border-amber-400" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-10rem)] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden z-50 transition-colors duration-300"
          >
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 p-4 shrink-0 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 border border-amber-300 flex items-center justify-center text-slate-950 shadow-md">
                  <Bot className="h-5.5 w-5.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white uppercase tracking-wider">LYNX Assistente</h3>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">SISTEMA</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Seu Guia Acadêmico Integrado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="bg-amber-500 text-slate-950 text-[9px] font-black px-4 py-1.5 uppercase tracking-widest flex items-center justify-between select-none shrink-0">
              <span>Sessão Ativa: {currentUser.role}</span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-slate-950 rounded-full animate-ping" />
                <span>LYNX-BOT ONLINE</span>
              </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
              
              {/* Message Feed */}
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm border ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none'
                        : 'bg-white dark:bg-slate-850/80 text-slate-800 dark:text-slate-250 border-slate-150 dark:border-slate-800 rounded-tl-none'
                    }`}>
                      {msg.sender === 'bot' ? (
                        renderMessageText(msg.text)
                      ) : (
                        <p className="text-xs font-semibold leading-relaxed whitespace-pre-wrap select-text">{msg.text}</p>
                      )}
                      <span className="block text-[8px] text-right mt-1.5 font-bold opacity-60 tracking-wider">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-150 dark:border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
                        LYNX está pensando...
                      </span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

            </div>

            {/* Input Footer */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-150 dark:border-slate-800 shrink-0 flex items-center gap-2 select-none"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escreva sua dúvida sobre o portal..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-white placeholder-slate-400 pl-4 pr-2 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  inputText.trim() && !isTyping
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
