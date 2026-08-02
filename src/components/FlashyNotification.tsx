/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { BellRing, AlertTriangle, MessageSquare, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { UserRole } from '../types';

interface FlashyNotificationProps {
  onOpenChat: (senderId: string) => void;
}

export const FlashyNotification: React.FC<FlashyNotificationProps> = ({ onOpenChat }) => {
  const { currentUser, notifications, users, clearNotifications } = useApp();
  
  // Track notifications that the user manually closed during this active session
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Find unread notifications for the active user that haven't been dismissed
  const activeUnread = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(
      n => n.userId === currentUser.id && !n.read && !dismissedIds.includes(n.id)
    );
  }, [notifications, currentUser, dismissedIds]);

  // Take the most recent unread notification
  const latestNotification = activeUnread[0];

  // Map the sender of the notification based on text content
  const mappedSender = useMemo(() => {
    if (!latestNotification) return null;
    const text = latestNotification.content.toUpperCase();
    
    // Find a user whose name is mentioned in the notification content
    // e.g., "MENSAGEM DE PROFESSORA ANA: ..." or "DE ADMIN:"
    return users.find(u => {
      if (u.name && text.includes(u.name.toUpperCase())) return true;
      return false;
    }) || null;
  }, [latestNotification, users]);

  const handleOpenConversation = () => {
    if (!latestNotification) return;

    // Mark as read first
    if (currentUser) {
      clearNotifications(currentUser.id);
    }
    
    // Attempt to open chat with the mapped sender, or just open general messaging
    if (mappedSender) {
      onOpenChat(mappedSender.id);
    } else {
      // Fallback: search for first teacher or admin that sent the message, or just open message center
      const firstTeacher = users.find(u => u.role === UserRole.TEACHER);
      onOpenChat(firstTeacher?.id || '');
    }
  };

  const handleDismiss = () => {
    if (!latestNotification) return;
    setDismissedIds(prev => [...prev, latestNotification.id]);
    if (currentUser) {
      clearNotifications(currentUser.id);
    }
  };

  if (!latestNotification || !currentUser) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-[100] max-w-sm sm:max-w-md w-full no-print font-sans select-none">
        <motion.div
          // Dramatic shaking entry effect
          initial={{ opacity: 0, scale: 0.8, y: 50, rotate: -2 }}
          animate={{ 
            opacity: 1, 
            scale: [1, 1.05, 0.98, 1.02, 1], // pulse zoom
            y: 0, 
            rotate: [0, -3, 3, -3, 3, 0], // shake/wobble
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative bg-gradient-to-r from-rose-600 via-amber-500 to-orange-600 dark:from-rose-700 dark:via-amber-600 dark:to-orange-700 p-1 rounded-3xl shadow-[0_0_35px_rgba(239,68,68,0.75)] dark:shadow-[0_0_45px_rgba(239,68,68,0.95)] animate-none overflow-hidden"
        >
          {/* Pulsing visual neon ring glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-yellow-400 opacity-30 animate-pulse rounded-3xl pointer-events-none"></div>
          
          {/* Inner box */}
          <div className="bg-white dark:bg-slate-950 p-5 rounded-[22px] relative z-10 flex flex-col gap-3.5 border border-white/10">
            
            {/* Flashing Title & Badge Row */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 animate-bounce text-rose-500 shrink-0" />
                  MENSAGEM URGENTE RECEBIDA
                </span>
              </div>
              <span className="px-2 py-0.5 text-[8px] bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold rounded-full uppercase tracking-wider animate-pulse border border-amber-500/20">
                Urgente
              </span>
            </div>

            {/* Notification Text Body */}
            <div className="flex gap-3">
              <div className="p-3 bg-gradient-to-tr from-rose-500 to-orange-500 text-white rounded-2xl shadow-md flex-shrink-0 flex items-center justify-center h-12 w-12 animate-pulse">
                <BellRing className="h-6 w-6 animate-bounce" />
              </div>
              <div className="text-left space-y-1">
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase leading-tight">
                  {mappedSender ? `Remetente: ${mappedSender.name}` : 'Aviso Escolar Crítico'}
                </h4>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-h-[80px] overflow-y-auto uppercase border-l-2 border-rose-500 pl-2">
                  {latestNotification.content}
                </p>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Dispensar
              </button>
              <button
                type="button"
                onClick={handleOpenConversation}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md hover:shadow-rose-600/20 transition-all cursor-pointer border border-transparent animate-pulse"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Abrir Conversa
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
