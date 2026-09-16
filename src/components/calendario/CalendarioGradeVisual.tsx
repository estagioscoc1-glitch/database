import React from 'react';
import { NOMES_MESES, type DiaMarcadoCalendario } from '../../lib/calendarioEscolar';

// ===========================================================================
//  GRADE DE UM MÊS — mesmo layout do modelo em PDF (D S T Q Q S S, dias
//  marcados com cor + rótulo colado, notas de rodapé abaixo do quadrinho).
//
//  Usada em dois lugares:
//   - CalendarioEscolarModule (editor): clicável, `onSelecionarDia` abre o
//     painel de edição do dia.
//   - CalendarioEscolarView (visualização, inclusive para o coordenador):
//     apenas leitura, sem clique.
// ===========================================================================

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const CORES: Record<DiaMarcadoCalendario['tipo'], string> = {
  inicio: 'bg-emerald-300 text-emerald-950',
  feriado: 'bg-amber-300 text-amber-950',
  avaliacao: 'bg-slate-300 text-slate-800',
};

interface Props {
  ano: number;
  mes: number; // 1–12
  diasMarcados: DiaMarcadoCalendario[];
  diaSelecionado?: number | null;
  onSelecionarDia?: (dia: number) => void;
  compacto?: boolean;
}

export const CalendarioGradeVisual: React.FC<Props> = ({
  ano,
  mes,
  diasMarcados,
  diaSelecionado = null,
  onSelecionarDia,
  compacto = false,
}) => {
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay(); // 0 = domingo
  const diasNoMes = new Date(ano, mes, 0).getDate();

  const marcaPorDia = new Map<number, DiaMarcadoCalendario>();
  diasMarcados.forEach(m => marcaPorDia.set(m.dia, m));

  const celulas: Array<number | null> = [
    ...Array(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  // completa a última linha com espaços em branco
  while (celulas.length % 7 !== 0) celulas.push(null);

  const notasDeRodape = diasMarcados
    .filter(m => m.legenda)
    .sort((a, b) => a.dia - b.dia);

  return (
    <div className={compacto ? 'text-[10px]' : 'text-xs'}>
      <h4 className="font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 mb-1.5">
        {NOMES_MESES[mes]}
      </h4>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS_SEMANA.map((letra, i) => (
          <div key={i} className="text-center font-bold text-slate-400 dark:text-slate-500">
            {letra}
          </div>
        ))}

        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i} />;
          const marca = marcaPorDia.get(dia);
          const clicavel = Boolean(onSelecionarDia);
          const selecionado = diaSelecionado === dia;

          return (
            <button
              key={i}
              type="button"
              disabled={!clicavel}
              onClick={() => onSelecionarDia?.(dia)}
              className={[
                'aspect-square rounded-md flex flex-col items-center justify-center leading-none font-bold relative',
                marca ? CORES[marca.tipo] : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300',
                clicavel ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-default',
                selecionado ? 'ring-2 ring-blue-600' : '',
              ].join(' ')}
              title={marca?.legenda || undefined}
            >
              <span>{dia}</span>
              {marca?.rotulo && (
                <span className="text-[7px] font-black uppercase tracking-wide -mt-0.5">{marca.rotulo}</span>
              )}
            </button>
          );
        })}
      </div>

      {notasDeRodape.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {notasDeRodape.map((n, i) => (
            <p key={i} className="text-slate-500 dark:text-slate-400 leading-snug">
              <span className="font-bold">{n.dia}</span> – {n.legenda}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
