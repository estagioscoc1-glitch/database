/**
 * Formulário "Cadastrar Docente / Administrador".
 *
 * POR QUE ISTO SAIU DO AdminDashboard
 *
 * O painel administrativo é um único componente de 5 mil linhas que desenha
 * ~11 mil elementos, entre eles 1.200 ícones e uma lista com 586 turmas. Os
 * campos de texto guardavam o que era digitado no estado DESSE componente — e
 * no React, mudar o estado redesenha o componente inteiro.
 *
 * Resultado medido no sistema rodando: **635 ms de travamento por tecla**.
 * Digitar "MARIA DA SILVA" levava mais de 8 segundos, com a tela congelada
 * entre uma letra e outra.
 *
 * Aqui o texto digitado vive dentro deste componente pequeno. Digitar redesenha
 * só o formulário; o painel atrás não é tocado. O `React.memo` garante que ele
 * também não seja redesenhado à toa quando o painel se atualizar por outro
 * motivo — para isso a função `aoCadastrar` precisa ser estável no pai
 * (useCallback ou ref), senão a memoização não vale de nada.
 *
 * A aparência e as regras são as mesmas de antes: nada de visual mudou.
 */

import React, { useState } from 'react';
import { UserRole } from '../../types';

export interface DadosNovoDocente {
  nome: string;
  email: string;
  papel: UserRole;
  senha: string;
}

interface Props {
  aoCadastrar: (dados: DadosNovoDocente) => void;
}

const campo =
  'w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white rounded-xl outline-none text-xs text-slate-800 dark:text-white';
const rotulo =
  'block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1';

export const FormularioDocente: React.FC<Props> = React.memo(({ aoCadastrar }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<UserRole>(UserRole.TEACHER);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    aoCadastrar({ nome, email, papel, senha });
    // Limpa para o próximo cadastro. Quem avisa o resultado é o painel.
    setNome('');
    setEmail('');
    setSenha('');
  };

  const botaoTipo = (selecionado: boolean) =>
    `py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
      selecionado
        ? 'bg-blue-50 dark:bg-blue-950/45 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-900'
        : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-750 hover:bg-slate-100'
    }`;

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label className={rotulo}>Tipo de Usuário</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPapel(UserRole.TEACHER)}
            className={botaoTipo(papel === UserRole.TEACHER)}
          >
            Professor
          </button>
          <button
            type="button"
            onClick={() => setPapel(UserRole.ADMIN)}
            className={botaoTipo(papel === UserRole.ADMIN)}
          >
            Administração (Admin)
          </button>
        </div>
      </div>

      <div>
        <label className={rotulo}>Nome Completo</label>
        <input
          type="text"
          required
          placeholder="Ex: Letícia Fernandes de Souza"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className={campo}
        />
      </div>

      <div>
        <label className={rotulo}>E-mail de Contato</label>
        <input
          type="email"
          required
          placeholder="Ex: leticia@lynxedu.com.br"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={campo}
        />
      </div>

      {/* A senha não é obrigatória: quem gera é o servidor, com 14 caracteres
          aleatórios. Ela aparece uma única vez na confirmação, para ser
          entregue à pessoa. */}
      <div>
        <label className={rotulo}>Senha de Acesso (opcional)</label>
        <input
          type="password"
          placeholder="Deixe em branco para o sistema gerar uma senha forte"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          className={campo}
        />
        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
          Recomendado deixar em branco. A senha gerada aparece uma vez na confirmação
          e a pessoa é obrigada a trocá-la no primeiro acesso.
        </p>
      </div>

      {papel === UserRole.TEACHER && (
        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
          🔒 <strong>Controle de Acesso:</strong> Após cadastrar o docente, use a seção de{' '}
          <strong>"Gerenciador de Acessos de Professores"</strong> ao final desta página para
          definir exatamente quais turmas e disciplinas ele poderá acessar.
        </div>
      )}

      <button
        type="submit"
        id="create-user-submit-btn"
        className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow shadow-blue-600/10 transition-all cursor-pointer"
      >
        Cadastrar {papel === UserRole.TEACHER ? 'Docente' : 'Administrador'}
      </button>
    </form>
  );
});

FormularioDocente.displayName = 'FormularioDocente';
