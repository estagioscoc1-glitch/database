import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { RequerimentoMatriculaPrintView, type DadosRequerimentoMatricula } from './RequerimentoMatriculaPrintView';
import { FileText, Search } from 'lucide-react';

// ===========================================================================
//  REQUERIMENTO DE MATRÍCULA — buscar aluno e preencher
//
//  Igual ao padrão de Declarações e Contratos: busca por nome ou matrícula,
//  monta os dados a partir do cadastro (endereço, filiação, RG, CPF —
//  precisam estar preenchidos na ficha completa do aluno), e abre a
//  impressão. Nada aqui é editável na tela — é o cadastro que alimenta o
//  documento, do mesmo jeito que os outros requerimentos.
// ===========================================================================

const hoje = () => new Date().toISOString().split('T')[0];

export const RequerimentoMatriculaModule: React.FC = () => {
  const { users, classes, courses } = useApp();
  const [busca, setBusca] = useState('');
  const [aluno, setAluno] = useState<any | null>(null);
  const [imprimir, setImprimir] = useState(false);

  const alunos = useMemo(() => users.filter(u => u.role === UserRole.STUDENT), [users]);

  const encontrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (t.length < 2) return [];
    return alunos
      .filter(a => a.name?.toLowerCase().includes(t) || (a.enrollment ?? '').toLowerCase().includes(t))
      .slice(0, 8);
  }, [alunos, busca]);

  const contexto = (a: any) => {
    const turma = classes.find(c => c.id === a?.classId);
    const curso = courses.find(c => c.id === (turma as any)?.courseId || c.id === (a as any)?.courseId);
    return { turma, curso };
  };

  const montarDados = (a: any): DadosRequerimentoMatricula => {
    const { turma, curso } = contexto(a);
    const endereco = [a.address, a.addressNumber].filter(Boolean).join(', ') +
      (a.neighborhood ? ` - ${a.neighborhood}` : '') +
      (a.city ? ` - ${a.city}` : '') + (a.state ? ` - ${a.state}` : '') +
      (a.zipCode ? ` CEP:${a.zipCode}` : '');
    return {
      alunoNome: a.name || '',
      matricula: a.enrollment || a.username || '',
      nomePai: a.fatherName || '',
      nomeMae: a.motherName || '',
      naturalidade: [a.birthCity, a.birthState].filter(Boolean).join(' - '),
      nacionalidade: a.nationality || 'BRASILEIRA',
      dataNascimento: a.birthDate || '',
      endereco,
      estadoCivil: a.maritalStatus || '',
      telefone: a.phone || '',
      celular: a.whatsapp || a.phone || '',
      rg: a.rg || '',
      cpf: a.cpf || '',
      cursoNome: curso?.name || '',
      modulo: (turma as any)?.module ? String((turma as any).module) : '',
      turno: (turma as any)?.shift || '',
      turma: turma?.name || '',
      dataEmissao: hoje(),
    };
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-3">
          <FileText className="h-5 w-5" />
          <h3 className="font-black text-sm">Requerimento de Matrícula</h3>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Busque o aluno pelo nome ou matrícula. Os dados saem do cadastro completo dele —
          endereço, filiação, RG e CPF precisam estar preenchidos lá para sair no documento.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm"
            placeholder="Nome ou matrícula do aluno"
            value={busca}
            onChange={e => { setBusca(e.target.value); setAluno(null); }}
          />
          {encontrados.length > 0 && !aluno && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-xl shadow-lg overflow-hidden">
              {encontrados.map(a => (
                <button key={a.id} type="button"
                        onClick={() => { setAluno(a); setBusca(a.name); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
                  <span className="font-bold">{a.name}</span>
                  <span className="text-slate-400 ml-2 text-xs">{a.enrollment || 'sem matrícula'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {aluno && (
          <button type="button" onClick={() => setImprimir(true)}
                  className="mt-4 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs">
            <FileText className="h-4 w-4" /> Gerar Requerimento de {aluno.name}
          </button>
        )}
      </div>

      {imprimir && aluno && (
        <RequerimentoMatriculaPrintView dados={montarDados(aluno)} onClose={() => setImprimir(false)} />
      )}
    </div>
  );
};
