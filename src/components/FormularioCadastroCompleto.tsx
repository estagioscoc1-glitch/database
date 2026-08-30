/**
 * Formulário "Cadastro Completo" — aluno OU professor, com todos os dados
 * de uma vez (filiação, documentos, endereço) e matrícula sugerida
 * automaticamente (a maior já usada + 1).
 *
 * Isolado do painel principal pelo MESMO motivo do FormularioDocente.tsx
 * (ver o comentário lá): digitar aqui redesenha só este componente pequeno,
 * não o painel inteiro de 5 mil linhas.
 *
 * Reaproveita os mesmos caminhos de criação que já existem e funcionam
 * (endereçado pelo componente pai) — este formulário só coleta os dados;
 * quem decide como gravar é o `aoCadastrar` do pai.
 */

import React, { useState } from 'react';
import { UserRole } from '../types';

export interface DadosCadastroCompleto {
  papel: UserRole;
  nome: string;
  matricula: string;
  email: string;
  senha: string;
  turmaId?: string; // só aluno
  // Ficha completa — todos opcionais
  motherName?: string;
  fatherName?: string;
  maritalStatus?: string;
  nationality?: string;
  birthDate?: string;
  birthCity?: string;
  birthState?: string;
  rg?: string;
  rgIssuer?: string;
  rgUf?: string;
  phone?: string;
  whatsapp?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  observations?: string;
  profession?: string; // só aluno
  dossierNumber?: string; // só aluno
  professionalCouncil?: string; // só professor
  councilNumber?: string;
  councilUf?: string;
  councilValidity?: string;
  academicTitle?: string;
  specialty?: string;
}

interface Props {
  matriculaSugeridaAluno: string;
  matriculaSugeridaProfessor: string;
  dossieSugerido: string;
  turmas: { id: string; label: string }[];
  aoCadastrar: (dados: DadosCadastroCompleto) => void;
}

const campo =
  'w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 focus:bg-white dark:focus:bg-slate-900 rounded-lg outline-none text-xs text-slate-800 dark:text-white';
const rotulo =
  'block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5';

const vazio: Omit<DadosCadastroCompleto, 'papel' | 'matricula'> = {
  nome: '', email: '', senha: '', turmaId: '',
  motherName: '', fatherName: '', maritalStatus: '', nationality: 'Brasileira',
  birthDate: '', birthCity: '', birthState: '', rg: '', rgIssuer: '', rgUf: '',
  phone: '', whatsapp: '', zipCode: '', address: '', addressNumber: '',
  complement: '', neighborhood: '', city: '', state: '', country: 'Brasil',
  observations: '', profession: '', dossierNumber: '', professionalCouncil: '', councilNumber: '',
  councilUf: '', councilValidity: '', academicTitle: '', specialty: '',
};

export const FormularioCadastroCompleto: React.FC<Props> = React.memo(
  ({ matriculaSugeridaAluno, matriculaSugeridaProfessor, dossieSugerido, turmas, aoCadastrar }) => {
    const [papel, setPapel] = useState<UserRole>(UserRole.STUDENT);
    const [matricula, setMatricula] = useState(matriculaSugeridaAluno);
    const [matriculaEditadaManualmente, setMatriculaEditadaManualmente] = useState(false);
    const [dados, setDados] = useState({ ...vazio, dossierNumber: dossieSugerido });

    const escolherPapel = (novoPapel: UserRole) => {
      setPapel(novoPapel);
      // Só troca a matrícula sugerida sozinha se a pessoa não tiver digitado
      // uma própria — senão apagaria o que ela já tinha escrito.
      if (!matriculaEditadaManualmente) {
        setMatricula(novoPapel === UserRole.STUDENT ? matriculaSugeridaAluno : matriculaSugeridaProfessor);
      }
    };

    const set = (campo: keyof typeof vazio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setDados(prev => ({ ...prev, [campo]: e.target.value }));

    const enviar = (e: React.FormEvent) => {
      e.preventDefault();
      aoCadastrar({ papel, matricula, ...dados });
      // Limpa pro próximo cadastro. Quem avisa o resultado é o painel.
      setDados({ ...vazio, dossierNumber: dossieSugerido });
      setMatricula(papel === UserRole.STUDENT ? matriculaSugeridaAluno : matriculaSugeridaProfessor);
      setMatriculaEditadaManualmente(false);
    };

    const botaoTipo = (selecionado: boolean) =>
      `py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
        selecionado
          ? 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-900'
          : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-750 hover:bg-slate-100'
      }`;

    return (
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <label className={rotulo}>Tipo de Cadastro</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => escolherPapel(UserRole.STUDENT)} className={botaoTipo(papel === UserRole.STUDENT)}>
              Aluno
            </button>
            <button type="button" onClick={() => escolherPapel(UserRole.TEACHER)} className={botaoTipo(papel === UserRole.TEACHER)}>
              Professor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={rotulo}>Nome Completo</label>
            <input type="text" required placeholder="Nome completo" value={dados.nome} onChange={set('nome')} className={campo} />
          </div>
          <div>
            <label className={rotulo}>
              Matrícula <span className="normal-case font-normal text-indigo-500">(sugerida — pode trocar)</span>
            </label>
            <input
              type="text" required value={matricula}
              onChange={(e) => { setMatricula(e.target.value); setMatriculaEditadaManualmente(true); }}
              className={`${campo} font-mono`}
            />
          </div>
        </div>

        {papel === UserRole.STUDENT && (
          <div>
            <label className={rotulo}>Turma</label>
            <select required value={dados.turmaId} onChange={set('turmaId')} className={campo}>
              <option value="">Selecione a turma...</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={rotulo}>E-mail {papel === UserRole.STUDENT && <span className="normal-case font-normal text-slate-400">(opcional — gera automático se vazio)</span>}</label>
            <input type="email" value={dados.email} onChange={set('email')} className={campo} />
          </div>
          <div>
            <label className={rotulo}>Senha de Acesso (opcional)</label>
            <input type="password" placeholder="Em branco = gerada automaticamente" value={dados.senha} onChange={set('senha')} className={campo} />
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline select-none">
            + Ficha completa (filiação, documentos, endereço) — opcional, pode preencher depois
          </summary>
          <div className="mt-3 space-y-3 pl-3 border-l-2 border-indigo-100 dark:border-indigo-950/60">

            <div className="grid grid-cols-2 gap-2">
              <div><label className={rotulo}>Nome da Mãe</label><input className={campo} value={dados.motherName} onChange={set('motherName')} /></div>
              <div><label className={rotulo}>Nome do Pai</label><input className={campo} value={dados.fatherName} onChange={set('fatherName')} /></div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div><label className={rotulo}>Nascimento</label><input type="date" className={campo} value={dados.birthDate} onChange={set('birthDate')} /></div>
              <div><label className={rotulo}>Naturalidade</label><input className={campo} value={dados.birthCity} onChange={set('birthCity')} /></div>
              <div><label className={rotulo}>UF Nasc.</label><input className={campo} maxLength={2} value={dados.birthState} onChange={set('birthState')} /></div>
              <div><label className={rotulo}>Nacionalidade</label><input className={campo} value={dados.nationality} onChange={set('nationality')} /></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div><label className={rotulo}>RG</label><input className={campo} value={dados.rg} onChange={set('rg')} /></div>
              <div><label className={rotulo}>Órgão Emissor</label><input className={campo} placeholder="Ex: SSP" value={dados.rgIssuer} onChange={set('rgIssuer')} /></div>
              <div><label className={rotulo}>UF do RG</label><input className={campo} maxLength={2} value={dados.rgUf} onChange={set('rgUf')} /></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={rotulo}>Estado Civil</label>
                <select className={campo} value={dados.maritalStatus} onChange={set('maritalStatus')}>
                  <option value="">-</option>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viúvo(a)">Viúvo(a)</option>
                  <option value="União Estável">União Estável</option>
                </select>
              </div>
              <div><label className={rotulo}>Telefone</label><input className={campo} value={dados.phone} onChange={set('phone')} /></div>
              <div><label className={rotulo}>WhatsApp</label><input className={campo} value={dados.whatsapp} onChange={set('whatsapp')} /></div>
            </div>

            {papel === UserRole.STUDENT && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={rotulo}>Profissão</label>
                  <input className={campo} value={dados.profession} onChange={set('profession')} />
                </div>
                <div>
                  <label className={rotulo}>
                    Número do Dossiê <span className="normal-case font-normal text-indigo-500">(sugerido — pode trocar)</span>
                  </label>
                  <input className={`${campo} font-mono`} value={dados.dossierNumber} onChange={set('dossierNumber')} />
                </div>
              </div>
            )}

            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider pt-1">Endereço</p>
            <div className="grid grid-cols-4 gap-2">
              <div><label className={rotulo}>CEP</label><input className={campo} value={dados.zipCode} onChange={set('zipCode')} /></div>
              <div className="col-span-2"><label className={rotulo}>Logradouro</label><input className={campo} value={dados.address} onChange={set('address')} /></div>
              <div><label className={rotulo}>Número</label><input className={campo} value={dados.addressNumber} onChange={set('addressNumber')} /></div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div><label className={rotulo}>Complemento</label><input className={campo} value={dados.complement} onChange={set('complement')} /></div>
              <div><label className={rotulo}>Bairro</label><input className={campo} value={dados.neighborhood} onChange={set('neighborhood')} /></div>
              <div><label className={rotulo}>Cidade</label><input className={campo} value={dados.city} onChange={set('city')} /></div>
              <div><label className={rotulo}>UF</label><input className={campo} maxLength={2} value={dados.state} onChange={set('state')} /></div>
            </div>

            {papel === UserRole.TEACHER && (
              <>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider pt-1">Conselho de Classe e Titulação</p>
                <div className="grid grid-cols-4 gap-2">
                  <div><label className={rotulo}>Conselho</label><input className={campo} placeholder="Ex: COREN" value={dados.professionalCouncil} onChange={set('professionalCouncil')} /></div>
                  <div><label className={rotulo}>Número</label><input className={campo} value={dados.councilNumber} onChange={set('councilNumber')} /></div>
                  <div><label className={rotulo}>UF</label><input className={campo} maxLength={2} value={dados.councilUf} onChange={set('councilUf')} /></div>
                  <div><label className={rotulo}>Validade</label><input type="date" className={campo} value={dados.councilValidity} onChange={set('councilValidity')} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={rotulo}>Titulação</label><input className={campo} value={dados.academicTitle} onChange={set('academicTitle')} /></div>
                  <div><label className={rotulo}>Especialidade</label><input className={campo} value={dados.specialty} onChange={set('specialty')} /></div>
                </div>
              </>
            )}

            <div><label className={rotulo}>Observações</label><textarea rows={2} className={campo} value={dados.observations} onChange={set('observations')} /></div>
          </div>
        </details>

        <button
          type="submit"
          className="w-full py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow shadow-indigo-600/10 transition-all cursor-pointer"
        >
          Cadastrar {papel === UserRole.STUDENT ? 'Aluno' : 'Professor'} Completo
        </button>
      </form>
    );
  }
);

FormularioCadastroCompleto.displayName = 'FormularioCadastroCompleto';
