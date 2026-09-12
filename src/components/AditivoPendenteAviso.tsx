import React, { useState, useEffect } from 'react';
import { aditivosPendentesDoAluno, assinarAditivo, type Aditivo } from '../lib/supabaseAditivos';
import { FileSignature, CheckCircle2 } from 'lucide-react';

// ===========================================================================
//  ADITIVO DE CONTRATO — aviso no painel do aluno
//
//  Aparece sozinho quando existe um aditivo ativo que este aluno ainda não
//  assinou. "Assinar" aqui é um clique de confirmação — não uma assinatura
//  desenhada — que fica registrado com o nome do aluno e a data/hora.
// ===========================================================================

interface Props {
  alunoId: string;
  alunoNome: string;
}

export const AditivoPendenteAviso: React.FC<Props> = ({ alunoId, alunoNome }) => {
  const [pendentes, setPendentes] = useState<Aditivo[]>([]);
  const [assinando, setAssinando] = useState(false);
  const [indice, setIndice] = useState(0);

  const carregar = async () => setPendentes(await aditivosPendentesDoAluno(alunoId));

  useEffect(() => { void carregar(); }, [alunoId]);

  if (pendentes.length === 0) return null;
  const atual = pendentes[indice];

  const assinar = async () => {
    setAssinando(true);
    const { erro } = await assinarAditivo(atual.id, alunoId, alunoNome);
    setAssinando(false);
    if (erro) { alert(erro); return; }
    if (indice + 1 < pendentes.length) {
      setIndice(indice + 1);
    } else {
      setPendentes([]);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30">
          <FileSignature className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Precisa da sua assinatura</p>
            <p className="font-black text-sm text-slate-800 dark:text-white">{atual.titulo}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {atual.texto}
          </p>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => void assinar()} disabled={assinando}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black rounded-2xl text-sm">
            <CheckCircle2 className="h-4 w-4" />
            {assinando ? 'Registrando…' : 'Li e concordo — assinar'}
          </button>
          {pendentes.length > 1 && (
            <p className="text-center text-[10px] text-slate-400 mt-2">
              {indice + 1} de {pendentes.length} pendentes
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
