/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TELA DE LOGIN — UMA PORTA SÓ
 *
 * Antes existiam três abas: Aluno, Professor e Administração. Quem entrava
 * escolhia o próprio perfil antes de digitar a senha. Isso foi removido.
 *
 * Motivos:
 *
 * 1. Confundia. A pessoa errava a aba e recebia "usuário ou senha incorretos"
 *    mesmo digitando tudo certo. A mensagem culpava a senha por um erro que
 *    era de aba.
 *
 * 2. Contava o que não devia. Errando a aba de propósito, dava para descobrir
 *    se um login existe e qual é o papel dele — informação que ajuda quem
 *    tenta invadir.
 *
 * 3. Era enfeite. O papel sempre veio do banco. A escolha na tela nunca
 *    concedeu poder nenhum: era conferida contra o registro e descartada.
 *
 * Agora: usuário e senha. O sistema busca no banco quem é a pessoa e abre a
 * tela do papel dela. Ninguém escolhe o próprio papel.
 *
 * TAMBÉM FOI REMOVIDO DAQUI o modal "Redefinição Única do Admin". Ele oferecia
 * trocar a senha do administrador protegido apenas por uma caixinha de
 * "confirmo que sou o proprietário" — sem senha, sem e-mail, sem nada. E o
 * botão "Liberar Nova Redefinição" reabria essa porta quantas vezes quisesse.
 * O código por trás já tinha sido desativado; a tela continuava anunciando um
 * caminho que não existia mais. Recuperação de senha agora é com a secretaria.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LogIn, ShieldAlert, KeyRound, ArrowRight, BookOpen, User as UserIcon, HelpCircle, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { sanitizeInput } from '../utils/security';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarAjudaSenha, setMostrarAjudaSenha] = useState(false);

  const aoEntrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    const usuarioLimpo = sanitizeInput(usuario.trim());
    const senhaLimpa = senha;

    if (!usuarioLimpo) {
      setErro('Informe seu usuário ou matrícula.');
      return;
    }
    if (!senhaLimpa) {
      setErro('Informe sua senha.');
      return;
    }

    // O BLOQUEIO POR TENTATIVAS erradas agora é conferido no SERVIDOR
    // (tabela `tentativas_login`, dentro da função `login` do contexto).
    // Havia uma checagem só no navegador aqui antes — resetava sozinha ao
    // recarregar a página, e mascarava a proteção real. Removida.

    setCarregando(true);
    try {
      const entrou = await login(usuarioLimpo, senhaLimpa);
      if (!entrou) {
        // Na prática este caminho não deve ocorrer: toda falha de login vem
        // com uma mensagem do servidor e cai no catch abaixo. Mantido só
        // como rede de segurança.
        setErro('Usuário ou senha incorretos.');
      }
    } catch (err: any) {
      // MENSAGEM DO SERVIDOR, DE PROPÓSITO.
      //
      // Pode ser "usuário ou senha incorretos" (mensagem única, não revela
      // se o login existe) ou o aviso real de bloqueio por tentativas —
      // esse sim gravado no banco, sobrevive a um F5 ou trocar de navegador.
      setErro(err?.message || 'Não foi possível falar com o servidor. Verifique sua internet.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div id="login-screen-root" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-12 min-h-[600px] border border-slate-100 dark:border-slate-800">

        {/* Lado esquerdo: marca */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-600/30 rounded-full blur-3xl"></div>

          <div className="relative z-10 flex items-center justify-start">
            <Logo size="sm" light />
          </div>

          <div className="relative z-10 my-8">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight mb-4 text-white">
              Sistema de<br />Gerenciamento<br />Escolar
            </h2>
            <div className="h-1.5 w-12 bg-blue-400 rounded-full mb-6"></div>
            <p className="text-sm text-blue-100 leading-relaxed max-w-sm">
              Bem-vindo ao Portal Acadêmico Integrado. Acesse seus diários de notas, frequências, boletins e indicadores institucionais em tempo real.
            </p>
          </div>

          <div className="relative z-10 pt-4 border-t border-white/10 text-xs text-blue-300 flex justify-between items-center">
            <span>Versão 1.0</span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Educação Técnica
            </span>
          </div>
        </div>

        {/* Lado direito: formulário */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Portal Acadêmico</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Entre com seu usuário e senha</p>
            </div>

            {erro && (
              <div id="login-error-alert" className="p-4 mb-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs sm:text-sm flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            <form onSubmit={aoEntrar} className="space-y-4">
              <div>
                <label htmlFor="login-username-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Usuário ou Matrícula
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <UserIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    id="login-username-input"
                    autoComplete="username"
                    autoFocus
                    required
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Digite seu usuário ou matrícula"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Senha
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <input
                    type="password"
                    id="login-password-input"
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => setMostrarAjudaSenha(true)}
                  className="text-xs text-blue-700 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={carregando}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-800/50 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 text-sm font-sans"
              >
                {carregando ? (
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Acessar Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2 leading-relaxed">
                No primeiro acesso o sistema pede que você troque a senha entregue pela secretaria.
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Ajuda: esqueci minha senha */}
      {mostrarAjudaSenha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <KeyRound className="h-5 w-5" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Esqueci minha senha</h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarAjudaSenha(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Procure a <strong>secretaria da escola</strong>. Ela gera uma senha nova para
                você na hora e te entrega pessoalmente.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ao entrar com essa senha, o portal vai pedir que você escolha uma senha
                pessoal. A partir daí, só você a conhece — nem a secretaria consegue vê-la.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A recuperação não é por e-mail porque alunos e professores entram por
                  matrícula ou usuário, e a maioria não tem e-mail cadastrado no sistema.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarAjudaSenha(false)}
              className="w-full mt-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Entendi
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
