/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { KeyRound, ShieldAlert, CheckCircle, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

export const FirstLoginPasswordChange: React.FC = () => {
  const { currentUser, updatePassword } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Password visibility states
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!currentUser) return null;

  // Validation criteria
  const isLengthValid = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword);
  // Para o aluno a senha inicial é a matrícula; para os demais é a senha
  // temporária entregue pela secretaria. Nos dois casos a nova precisa ser
  // diferente da inicial.
  const isDifferentFromEnrollment =
    newPassword !== currentUser.enrollment && newPassword.toLowerCase() !== 'senha123';
  const isMatchValid = newPassword === confirmPassword && confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLengthValid) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!isDifferentFromEnrollment) {
      setError('A nova senha não pode ser igual à sua matrícula.');
      return;
    }

    if (!isMatchValid) {
      setError('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    setLoading(true);

    try {
      // A senha vai com hash para o servidor (Supabase Auth). Ela não é
      // guardada no cadastro nem no navegador — era assim que acabava exposta.
      await updatePassword(currentUser.id, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar a nova senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="first-login-root" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 p-8 sm:p-10"
      >
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-4">
            <Logo size="sm" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Primeiro Acesso</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {currentUser.role === UserRole.STUDENT
              ? 'Você entrou com sua matrícula como senha. Defina uma senha pessoal para continuar.'
              : 'Você entrou com a senha temporária entregue pela secretaria. Defina uma senha pessoal para continuar.'}
          </p>
        </div>

        {error && (
          <div id="password-change-error" className="p-4 mb-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 border border-red-100 dark:border-red-900/30">
            <ShieldAlert className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 space-y-4"
          >
            <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-10 w-10 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 dark:text-white text-base">Senha Alterada!</h3>
              <p className="text-xs text-slate-400">Sua senha foi redefinida com sucesso. Redirecionando para o seu painel...</p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* MOSTRA O LOGIN, NÃO A MATRÍCULA.
                Esta tela exibia a matrícula sob o rótulo "Sua Matrícula" — e
                para o professor esses dois valores são DIFERENTES. Um professor
                cujo login é "prof_eu" via aqui o número 1004 e concluía,
                razoavelmente, que era com 1004 que ele entrava no portal.
                Nunca conseguiria. Aqui a pessoa precisa saber com o que ela
                acessa o sistema, e isso é `username`. */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Seu usuário de acesso
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-mono font-bold select-none">
                <Lock className="h-4 w-4 text-slate-400" />
                <span>{currentUser.username || currentUser.enrollment}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                É com este usuário que você entra no portal. Anote-o.
              </p>
            </div>

            {/* New Password input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nova Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Defina sua nova senha"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Security Checklist Requirements */}
            <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl space-y-2 text-[11px] border border-slate-100/50 dark:border-slate-800/50">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Requisitos de Segurança</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${isLengthValid ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <span className={isLengthValid ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>Pelo menos 8 caracteres, com letra e número</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${isDifferentFromEnrollment && newPassword !== '' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <span className={(isDifferentFromEnrollment && newPassword !== '') ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>Diferente da senha atual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${isMatchValid ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <span className={isMatchValid ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400 font-medium'}>Ambos os campos devem ser idênticos</span>
              </div>
            </div>

            <button
              type="submit"
              id="save-new-password-btn"
              disabled={loading || !isLengthValid || !isDifferentFromEnrollment || !isMatchValid}
              className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 text-xs cursor-pointer"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Salvar Nova Senha</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

      </motion.div>
    </div>
  );
};
