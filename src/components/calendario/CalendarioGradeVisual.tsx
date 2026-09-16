import React from 'react';
import { NOMES_MESES, type DiaMarcadoCalendario } from '../../lib/calendarioEscolar';

// ===========================================================================
//  GRADE DE UM MÊS — mesmo layout do modelo em PDF (D S T Q Q S S, dias
//  marcados com cor; quando o dia tem "rótulo" — ex: DEP — ele aparece numa
//  caixinha cinza ao lado do número, na mesma linha da semana, igual ao
//  original).
//
//  Usada em três lugares:
//   - CalendarioEscolarModule (editor): clicável, `onSelecionarDia` abre o
//     painel de edição do dia.
//   - CalendarioEscolarView / CalendarioEscolarPrintView: apenas leitura.
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

  // Quebra em semanas (linhas de 7) — cada linha pode ter sua própria
  // caixinha de rótulo (DEP) do lado direito, igual ao modelo original.
  const semanas: Array<Array<number | null>> = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));

  const notasDeRodape = diasMarcados
    .filter(m => m.legenda)
    .sort((a, b) => a.dia - b.dia);

  return (
    <div className={compacto ? 'text-[10px]' : 'text-xs'}>
      <h4 className="font-black uppercase tracking-wide text-slate-700 dark:text-slate-200 mb-1.5">
        {NOMES_MESES[mes]}
      </h4>

      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DIAS_SEMANA.map((letra, i) => (
          <div key={i} className="text-center font-bold text-slate-400 dark:text-slate-500">
            {letra}
          </div>
        ))}
      </div>

      {semanas.map((semana, sIndex) => {
        // Rótulos (ex: "DEP") de qualquer dia marcado nesta semana, na ordem dos dias.
        const rotulosDaSemana = semana
          .filter((dia): dia is number => dia !== null)
          .map(dia => marcaPorDia.get(dia)?.rotulo)
          .filter((r): r is string => Boolean(r));

        return (
          <div key={sIndex} className="flex items-center gap-1 mb-0.5">
            <div className="grid grid-cols-7 gap-0.5 flex-1">
              {semana.map((dia, i) => {
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
                      'aspect-square rounded-md flex items-center justify-center leading-none font-bold',
                      marca ? CORES[marca.tipo] : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300',
                      clicavel ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : 'cursor-default',
                      selecionado ? 'ring-2 ring-blue-600' : '',
                    ].join(' ')}
                    title={marca?.legenda || undefined}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            {/* Caixinha do rótulo (DEP etc.), do lado da semana — igual ao original */}
            {rotulosDaSemana.length > 0 && (
              <span className="shrink-0 px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-black uppercase text-[8px] leading-none whitespace-nowrap">
                {rotulosDaSemana.join(' ')}
              </span>
            )}
          </div>
        );
      })}

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
