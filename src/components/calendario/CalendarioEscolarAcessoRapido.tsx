import React, { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { carregarCalendarioPublicado, type CalendarioEscolarRegistro } from '../../lib/calendarioEscolar';
import { CalendarioEscolarView } from './CalendarioEscolarView';

// ===========================================================================
//  Botão de acesso ao Calendário Escolar — mesma ideia do CronogramaDoAluno:
//  o componente busca sozinho se existe algum calendário publicado e, se não
//  houver nenhum, não renderiza nada. Usar em qualquer painel (aluno,
//  professor) sem precisar passar estado de fora.
// ===========================================================================

export const CalendarioEscolarAcessoRapido: React.FC = () => {
  const [registro, setRegistro] = useState<CalendarioEscolarRegistro | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    // Trava de segurança: se o banco não responder (ex.: projeto Supabase
    // "dormindo" e acordando), desiste depois de 15s em vez de deixar uma
    // busca pendurada para sempre — sem isso o botão simplesmente nunca
    // aparecia, sem nenhum aviso, e parecia que o recurso tinha sumido.
    let cancelado = false;
    Promise.race([
      carregarCalendarioPublicado(),
      new Promise<null>(resolve => window.setTimeout(() => resolve(null), 15000)),
    ]).then(r => {
      if (!cancelado) setRegistro(r);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  if (!registro) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer select-none uppercase tracking-wide"
      >
        <CalendarDays className="h-4 w-4" />
        <span>Calendário Escolar</span>
      </button>

      {aberto && <CalendarioEscolarView registro={registro} onClose={() => setAberto(false)} />}
    </>
  );
};
