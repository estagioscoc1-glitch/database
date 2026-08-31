import React, { useState } from 'react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../lib/imageAssets';
import { GRADES_CURRICULARES } from '../data/gradesCurriculares';
import { Layers, Printer, GraduationCap, Clock } from 'lucide-react';

// GRADES CURRICULARES — escolhe o curso e mostra a matriz curricular
// oficial (módulos, componentes, carga horária) com visual moderno e o
// mesmo cabeçalho oficial já usado nas declarações. Conteúdo estático,
// extraído dos PDFs enviados pela escola — não depende do banco de dados.
export const GradeCurricularModule: React.FC = () => {
  const [gradeSelecionadaId, setGradeSelecionadaId] = useState(GRADES_CURRICULARES[0]?.id || '');
  const grade = GRADES_CURRICULARES.find(g => g.id === gradeSelecionadaId);

  const handleImprimir = () => window.print();

  return (
    <div className="space-y-5">
      {/* Seletor — some na impressão */}
      <div className="no-print bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Layers className="h-5 w-5" />
            <h3 className="font-black text-sm">Grades Curriculares</h3>
          </div>
          <button
            type="button"
            onClick={handleImprimir}
            disabled={!grade}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all"
          >
            <Printer className="h-4 w-4" /> Imprimir / Baixar PDF
          </button>
        </div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mt-4 mb-1.5">
          Escolha o curso
        </label>
        <select
          value={gradeSelecionadaId}
          onChange={(e) => setGradeSelecionadaId(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white"
        >
          {GRADES_CURRICULARES.map(g => (
            <option key={g.id} value={g.id}>{g.cursoNome}</option>
          ))}
        </select>
      </div>

      {!grade ? (
        <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
          <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-500">Escolha um curso pra ver a matriz curricular.</p>
        </div>
      ) : (
        <div className="prova-folha bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden" style={{ padding: '2cm 2.2cm' }}>
          {/* Cabeçalho oficial — mesmo usado nas declarações */}
          <div className="flex items-center justify-center border-b border-slate-200 pb-6 mb-8">
            <img
              src={LOGO_COLEGIO_OSWALDO_CRUZ}
              alt="Colégio Oswaldo Cruz"
              className="w-full max-h-24 max-w-[850px] object-contain block"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">Matriz Curricular</p>
            <h2 className="text-2xl font-black text-slate-900">{grade.cursoNome}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">Carga Horária Total: {grade.cargaHorariaTotal} horas</span>
            </div>
          </div>

          <div className="space-y-6">
            {grade.modulos.map((modulo, idx) => {
              const totalModulo = modulo.componentes.reduce((s, c) => s + c.cargaHoraria, 0);
              return (
                <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <GraduationCap className="h-4 w-4" />
                      <span className="font-black text-sm">{modulo.nome}</span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-100">{totalModulo}h no módulo</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {modulo.componentes.map((c, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="py-2.5 px-5 text-slate-700">{c.nome}</td>
                          <td className="py-2.5 px-5 text-right font-mono font-bold text-slate-600 w-32">{c.cargaHoraria}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between px-5 py-4 bg-slate-900 rounded-2xl">
            <span className="text-white font-black text-sm uppercase tracking-wider">Carga Horária Total do Curso</span>
            <span className="text-white font-black text-2xl font-mono">{grade.cargaHorariaTotal}h</span>
          </div>
        </div>
      )}
    </div>
  );
};
