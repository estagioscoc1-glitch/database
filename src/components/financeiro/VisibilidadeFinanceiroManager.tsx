import React, { useState, useEffect } from 'react';
import {
  getVisibilidadeConfig, salvarVisibilidadeModo, listarAlunosLiberados, liberarAlunos, ocultarAlunos,
  ModoVisibilidadeFinanceiro,
} from '../../services/regularizacaoStorage';
import { Eye, EyeOff, Users, Search, Loader2, CheckCircle2 } from 'lucide-react';

// ===========================================================================
//  VISIBILIDADE DO FINANCEIRO NA ÁREA DO ALUNO
//
//  Por padrão fica OCULTO. Só a direção liga, e só depois de já ter
//  conferido os dados importados. Dá pra liberar aluno a aluno, turma
//  inteira, módulo inteiro, ou todo mundo de uma vez — e ocultar de novo
//  sem apagar nada.
// ===========================================================================

interface Props {
  currentUser?: string;
  allStudentUsers?: any[];
  classes?: any[];
}

export const VisibilidadeFinanceiroManager: React.FC<Props> = ({ currentUser = 'Financeiro', allStudentUsers = [], classes = [] }) => {
  const [modo, setModo] = useState<ModoVisibilidadeFinanceiro>('OCULTO');
  const [liberados, setLiberados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const [m, l] = await Promise.all([getVisibilidadeConfig(), listarAlunosLiberados()]);
    setModo(m); setLiberados(l);
    setCarregando(false);
  };

  useEffect(() => { void carregar(); }, []);

  const handleModo = async (novo: ModoVisibilidadeFinanceiro) => {
    setSalvando(true);
    try {
      const ok = await salvarVisibilidadeModo(novo, currentUser);
      if (ok) setModo(novo);
    } finally {
      setSalvando(false);
    }
  };

  const alunosFiltrados = busca.trim().length >= 2
    ? allStudentUsers.filter((a: any) => a.name?.toLowerCase().includes(busca.toLowerCase()) || a.enrollment?.includes(busca))
    : [];

  const modulos = Array.from(new Set(classes.filter((c: any) => !c.isDependency && c.module).map((c: any) => c.module))).sort();

  const idsDaTurma = (turmaId: string) => allStudentUsers.filter((a: any) => a.classId === turmaId).map((a: any) => a.id);
  const idsDoModulo = (modulo: number) => {
    const turmaIds = classes.filter((c: any) => c.module === modulo).map((c: any) => c.id);
    return allStudentUsers.filter((a: any) => turmaIds.includes(a.classId)).map((a: any) => a.id);
  };

  const handleLiberarLista = async (ids: string[]) => {
    setSalvando(true);
    try {
      const ok = await liberarAlunos(ids, currentUser);
      if (ok) setLiberados(prev => Array.from(new Set([...prev, ...ids])));
    } finally { setSalvando(false); }
  };

  const handleOcultarLista = async (ids: string[]) => {
    setSalvando(true);
    try {
      const ok = await ocultarAlunos(ids, currentUser);
      if (ok) setLiberados(prev => prev.filter(id => !ids.includes(id)));
    } finally { setSalvando(false); }
  };

  if (carregando) {
    return <div className="flex items-center gap-2 text-slate-400 py-10 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Modo Geral</h3>
        <div className="flex flex-wrap gap-3">
          <BotaoModo ativo={modo === 'OCULTO'} onClick={() => handleModo('OCULTO')} icone={EyeOff} label="Oculto para todos" cor="rose" />
          <BotaoModo ativo={modo === 'SELETIVO'} onClick={() => handleModo('SELETIVO')} icone={Users} label="Seletivo (por aluno/turma/módulo)" cor="amber" />
          <BotaoModo ativo={modo === 'TODOS'} onClick={() => handleModo('TODOS')} icone={Eye} label="Visível para todos" cor="emerald" />
        </div>
        {modo === 'TODOS' && (
          <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2">
            Todo aluno já vê a aba Financeiro agora, independente da lista seletiva abaixo.
          </p>
        )}
      </div>

      {modo === 'SELETIVO' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5">
          <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Liberar Seletivamente</h3>

          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-500 mb-2">Por módulo</p>
            <div className="flex flex-wrap gap-2">
              {modulos.map((m: any) => (
                <button key={m} type="button" onClick={() => handleLiberarLista(idsDoModulo(m))} disabled={salvando}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-[11px] hover:bg-blue-100">
                  Liberar Módulo {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-500 mb-2">Por turma</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {classes.filter((c: any) => !c.isDependency).map((c: any) => (
                <button key={c.id} type="button" onClick={() => handleLiberarLista(idsDaTurma(c.id))} disabled={salvando}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] hover:bg-slate-100">
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-500 mb-2">Por aluno específico</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs" />
            </div>
            {alunosFiltrados.length > 0 && (
              <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {alunosFiltrados.map((a: any) => {
                  const liberado = liberados.includes(a.id);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <span className="font-bold">{a.name} <span className="text-slate-400 font-normal">({a.enrollment})</span></span>
                      <button type="button" onClick={() => liberado ? handleOcultarLista([a.id]) : handleLiberarLista([a.id])}
                        className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase ${liberado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {liberado ? 'Liberado' : 'Liberar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-extrabold uppercase text-slate-500 mb-1">
              {liberados.length} aluno(s) liberado(s) atualmente
            </p>
            {liberados.length > 0 && (
              <button type="button" onClick={() => handleOcultarLista(liberados)} disabled={salvando}
                className="text-[11px] font-bold text-rose-600 hover:underline">
                Ocultar de todos os liberados
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BotaoModo: React.FC<{ ativo: boolean; onClick: () => void; icone: any; label: string; cor: string }> = ({ ativo, onClick, icone: Icone, label, cor }) => (
  <button
    type="button" onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wide border-2 transition-all ${
      ativo ? `bg-${cor}-600 text-white border-${cor}-600` : `bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700`
    }`}
  >
    {ativo && <CheckCircle2 className="h-3.5 w-3.5" />}
    <Icone className="h-3.5 w-3.5" /> {label}
  </button>
);
