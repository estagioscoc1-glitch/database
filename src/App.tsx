/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { UserRole } from './types';
import { LoginScreen } from './components/LoginScreen';
import { FirstLoginPasswordChange } from './components/FirstLoginPasswordChange';
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const TeacherDashboard = React.lazy(() => import('./components/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const StudentDashboard = React.lazy(() => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard })));

const DashboardLoadingFallback = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400"></div>
      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">Carregando Painel...</p>
    </div>
  </div>
);
import { Logo } from './components/Logo';
import { PrintModal } from './components/PrintModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  LogOut, Sun, Moon, Lock, ShieldCheck,
  MessageSquare, Database, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCenter } from './components/MessageCenter';
import { FlashyNotification } from './components/FlashyNotification';
import { safeLocalStorage } from './lib/safeStorage';
import { motivoDaUltimaFalha } from './lib/nuvem';
import HelperBot from './components/HelperBot';

function MainAppLayout() {
  const { currentUser, logout, notifications, isLoading, cloudBackupStatus, precisaTrocarSenha, aviso, fecharAviso } = useApp();

  // Messaging center state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return safeLocalStorage.getItem('oc_dark_mode') === 'true';
  });

  // NÃO EXISTE MAIS "MODO SIMULAÇÃO".
  //
  // O administrador tinha, no topo da tela, botões para ver o portal como
  // PROFESSOR ou como ALUNO. Isso foi removido a pedido da escola, e o efeito
  // colateral é bem-vindo: enquanto o admin navegava "como aluno", o portal
  // gravava dados usando a sessão do admin, mas com as telas e os identificadores
  // do aluno simulado. Registro criado nesse estado ficava com autoria trocada.
  //
  // Agora cada pessoa vê exatamente a visão do próprio papel.
  const handleLogout = () => {
    logout();
  };

  // Auto-logout after 5 minutes of inactivity (300,000 ms)
  /**
   * Quanto tempo parado antes de o sistema deslogar sozinho.
   *
   * Eram 5 minutos, e isso atrapalhava trabalho real: uma importação de mapas
   * leva vários minutos gravando sem ninguém mexer no mouse, e a sessão caía no
   * meio — a gravação parava pela metade. O mesmo valia para o professor
   * conferindo uma planilha de notas grande, ou para quem atende no balcão
   * enquanto o portal fica aberto.
   *
   * 30 minutos é o que se usa em sistema acadêmico: protege um computador
   * esquecido aberto na secretaria sem interromper quem está trabalhando.
   */
  const TEMPO_ATE_SAIR_SOZINHO = 30 * 60 * 1000;

  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        handleLogout();
      }, TEMPO_ATE_SAIR_SOZINHO);
    };

    // Events to detect user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initialize timer
    resetTimer();

    // Setup event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser]);

  // Sync dark class on document root
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      safeLocalStorage.setItem('oc_dark_mode', 'true');
    } else {
      root.classList.remove('dark');
      safeLocalStorage.setItem('oc_dark_mode', 'false');
    }
  }, [darkMode]);

  if (isLoading) {
    return (
      <div id="portal-loading-viewport" className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="flex flex-col items-center max-w-sm text-center px-6 py-8 space-y-6">
          {/* Elegant Circular Spinner with internal pulse logo */}
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 border-4 border-slate-100 dark:border-slate-900 rounded-full animate-spin border-t-blue-700 dark:border-t-blue-400"></div>
            <div className="absolute w-10 h-10 bg-blue-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
              <span className="text-[9px] font-black text-blue-700 dark:text-blue-400 animate-pulse">LYNX</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Carregando Portal Acadêmico</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[280px]">
              Sincronizando registros acadêmicos e diários com os servidores de nuvem...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Troca de senha obrigatória no primeiro acesso.
  //
  // Antes isto era decidido comparando a senha guardada com a matrícula — e a
  // senha não é mais guardada no navegador. Agora quem manda é o campo
  // 'trocar_senha' do banco, que o servidor liga ao criar a conta.
  if (precisaTrocarSenha) {
    return <FirstLoginPasswordChange />;
  }

  // A visão é sempre a do papel registrado no banco. Não há como trocar.
  const activeDisplayRole = currentUser.role;

  return (
    <div id="app-root-viewport" className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 h-16 px-6 sm:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 select-none no-print">
        <Logo size="sm" />

        <div className="flex items-center gap-4">
          
          {/* Chat / Message Center Trigger Button */}
          <button
            onClick={() => setIsChatOpen(true)}
            type="button"
            id="chat-center-trigger-btn"
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-300 transition-all border border-slate-150/40 dark:border-slate-850 shadow-sm relative flex items-center justify-center cursor-pointer"
            title="Abrir Central de Mensagens"
          >
            <MessageSquare className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
            {notifications.filter(n => n.userId === currentUser.id && !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] text-white font-extrabold items-center justify-center">
                  {notifications.filter(n => n.userId === currentUser.id && !n.read).length}
                </span>
              </span>
            )}
          </button>

          {/* Theme Mode Button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            type="button"
            id="theme-mode-switch"
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-300 transition-all border border-slate-150/40 dark:border-slate-850 shadow-sm"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400 animate-pulse" /> : <Moon className="h-4.5 w-4.5 text-blue-700" />}
          </button>

          {/* Security Padlock Widget */}
          <div className="relative group no-print">
            <button
              type="button"
              id="security-padlock-hub"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-400 border border-emerald-150/40 dark:border-emerald-900/30 transition-all text-[10px] font-black shadow-sm"
              title="Acesso Seguro Homologado"
            >
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span className="hidden md:inline tracking-wider uppercase">Conexão Segura</span>
            </button>
            
            {/* Popover Hover Info Drawer */}
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl p-4 hidden group-hover:block z-50 transition-all animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-extrabold text-xs text-slate-950 dark:text-white uppercase tracking-wider">Centro de Segurança</h4>
              </div>
              <ul className="space-y-2 text-[10px] text-slate-500 dark:text-slate-400">
                {/* Estas afirmações refletem o que o sistema REALMENTE faz.
                    As anteriores ("AES de 256 bits", "Filtro WAF e Anti-XSS",
                    "bloqueio por 30s após 3 erros") não correspondiam a
                    nenhuma proteção existente no código. */}
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Conexão criptografada:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Todo o tráfego usa HTTPS (TLS).</p>
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Senha protegida:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Guardada com hash no servidor, nunca no navegador.</p>
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Acesso por perfil:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Regras aplicadas no banco de dados, não no navegador.</p>
                  </div>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">Registro de alterações:</strong>
                    <p className="text-slate-400 dark:text-slate-500">Mudanças de nota e frequência ficam auditadas.</p>
                  </div>
                </li>
              </ul>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md inline-block">
                  Ambiente Protegido
                </span>
              </div>
            </div>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-850">
            <div className="hidden sm:block text-right select-none">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 block max-w-[180px] truncate leading-tight">
                {currentUser.name}
              </p>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black tracking-wider block uppercase leading-none mt-0.5">
                {currentUser.role === UserRole.ADMIN && 'Administração'}
                {currentUser.role === UserRole.STAFF && 'Secretaria'}
                {currentUser.role === UserRole.TEACHER && 'Professor'}
                {currentUser.role === UserRole.STUDENT && 'Aluno'}
              </span>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              id="header-logout-session"
              className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400 transition-all border border-red-150/50 dark:border-red-950/30"
              title="Encerrar Sessão"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Aviso de gravação pendente.
          Antes este aviso só aparecia no caso específico de cota do Firestore.
          Agora aparece em QUALQUER falha de gravação — era justamente a falha
          silenciosa que fazia o professor achar que tinha salvo as notas. */}
      {(cloudBackupStatus === 'quota_exceeded' || cloudBackupStatus === 'error') && (
        <div id="firestore-quota-alert-banner" className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/30 p-4 select-none no-print">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-950/55 rounded-xl text-amber-700 dark:text-amber-400 shrink-0">
                <Database className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 animate-bounce" /> Alterações ainda não salvas no servidor
                </h4>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  Não foi possível gravar no banco de dados agora. Suas alterações estão guardadas
                  neste navegador e serão enviadas assim que a conexão voltar.
                  <strong> Não feche o navegador nem limpe os dados do site até este aviso sumir.</strong>
                </p>
                {/* O motivo exato, para não precisar abrir o console do navegador.
                    Quando nenhum caminho registrou motivo, o aviso NÃO fica mudo:
                    um aviso sem explicação é indistinguível de um aviso quebrado,
                    e a secretaria não tem como saber se deve parar de trabalhar
                    ou seguir em frente. Dizer "não sabemos qual" é informação. */}
                <p className="text-[11px] text-amber-700 dark:text-amber-500 bg-amber-100/60 dark:bg-amber-950/40 rounded-lg px-2.5 py-1.5 mt-1.5 font-mono leading-snug">
                  <strong className="font-sans font-bold not-italic">Motivo: </strong>
                  {motivoDaUltimaFalha() ||
                    'não informado por esta parte do sistema. Recarregue a página (F5): se o aviso não voltar, era uma falha passageira.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-[10px] font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all text-center shrink-0 cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Main Workspace */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDisplayRole}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <React.Suspense fallback={<DashboardLoadingFallback />}>
              {activeDisplayRole === UserRole.ADMIN && <AdminDashboard />}
              {activeDisplayRole === UserRole.TEACHER && <TeacherDashboard />}
              {activeDisplayRole === UserRole.STUDENT && (
                <StudentDashboard studentId={currentUser.id} />
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Corporate Footer */}
      <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 font-bold select-none no-print">
        <p>© 2026 LYnx EDU Sistemas Escolares Inteligentes • Sistema de Gerenciamento Escolar</p>
      </footer>

      {/* Messaging Drawer Panel */}
      <MessageCenter 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        selectedContactId={selectedContactId}
        setSelectedContactId={setSelectedContactId}
      />

      {/* Extreme Flashy Notification Popover */}
      <FlashyNotification 
        onOpenChat={(senderId) => {
          setSelectedContactId(senderId);
          setIsChatOpen(true);
        }}
      />

      {/* AVISO DO SISTEMA
          Substitui o alert() do navegador. O alert congela a página inteira e
          desaparece ao primeiro Enter — e era nele que a senha gerada de
          professor e aluno aparecia. Aqui ela fica visível e pode ser copiada. */}
      {aviso && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">{aviso.titulo}</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {aviso.mensagem}
              </p>
              {aviso.destaque && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/40">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    Anote agora — não será mostrado de novo
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm font-bold text-slate-900 dark:text-white break-all select-all">
                      {aviso.destaque}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(aviso.destaque || '')}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/40 flex justify-end gap-2">
              {aviso.aoConfirmar && (
                <button
                  type="button"
                  id="cancelar-aviso-sistema"
                  onClick={fecharAviso}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                id="fechar-aviso-sistema"
                onClick={() => { const acao = aviso.aoConfirmar; fecharAviso(); acao?.(); }}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
              >
                {aviso.aoConfirmar ? 'Confirmar' : 'Entendi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSISTENTE FLUTUANTE DESLIGADO POR ORA.
          Decisão da escola até a entrada em produção: o balão "Dúvidas? Fale
          comigo!" cobre a coluna de ações do diário — os botões de Notas e
          Faltas de uma das linhas ficam atrás dele.
          Nada foi apagado: o componente segue em src/components/HelperBot.tsx
          e volta descomentando a linha abaixo. */}
      {/* <HelperBot /> */}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
