/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UploadCloud, Sparkles, AlertTriangle, CheckCircle2, 
  ChevronDown, ChevronUp, Database, Wrench, Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import type { DataRepairSummary } from '../context/AppContext';

export const HistoricalDataImporter: React.FC = () => {
  const { importHistoricalData, repairDuplicateImports, undoHistoricalImports, currentPeriod } = useApp();
  const [jsonInput, setJsonInput] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [importResult, setImportResult] = useState<{
    coursesCreated: number;
    classesCreated: number;
    subjectsCreated: number;
    studentsCreated: number;
    studentsRecognized: number;
    gradesImported: number;
  } | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<DataRepairSummary | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoResult, setUndoResult] = useState<{
    removedClassesCount: number;
    removedStudentsCount: number;
    removedGradesCount: number;
  } | null>(null);

  const [pendingJsonImport, setPendingJsonImport] = useState<{
    data: any;
    classNames: string[];
    classesCount: number;
    subjectsCount: number;
    studentsCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonInput(e.target.value);
    setFileError(null);
    setImportResult(null);
  };

  const processImport = () => {
    setFileError(null);
    setImportResult(null);

    if (!jsonInput.trim()) {
      setFileError('Por favor, cole o JSON ou faça upload de um arquivo.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed || !Array.isArray(parsed.classes) || parsed.classes.length === 0) {
        throw new Error("Formato inválido: O JSON deve conter a propriedade 'classes' com ao menos uma turma.");
      }

      const classNames = parsed.classes.map((c: any) => c.className || 'Turma sem Nome');
      let subjectsCount = 0;
      let studentsCount = 0;

      parsed.classes.forEach((c: any) => {
        if (Array.isArray(c.subjects)) {
          subjectsCount += c.subjects.length;
          c.subjects.forEach((s: any) => {
            if (Array.isArray(s.records)) {
              studentsCount += s.records.length;
            }
          });
        }
      });

      setPendingJsonImport({
        data: parsed,
        classNames,
        classesCount: parsed.classes.length,
        subjectsCount,
        studentsCount
      });
    } catch (err) {
      setFileError(`Erro ao processar JSON: ${(err as Error).message}`);
    }
  };

  const confirmHistoricalImport = () => {
    if (!pendingJsonImport) return;
    try {
      const summary = importHistoricalData(pendingJsonImport.data, currentPeriod);
      setImportResult(summary);
      setJsonInput('');
      setPendingJsonImport(null);
    } catch (err) {
      setFileError(`Erro ao executar a importação: ${(err as Error).message}`);
      setPendingJsonImport(null);
    }
  };

  const handleRepair = () => {
    setIsRepairing(true);
    setRepairResult(null);
    setTimeout(() => {
      const result = repairDuplicateImports();
      setRepairResult(result);
      setIsRepairing(false);
    }, 50);
  };

  const handleUndo = () => {
    if (window.confirm('Tem certeza que deseja remover todas as turmas históricas (fechadas definitivamente), suas notas e alunos vinculados exclusivamente a elas?')) {
      setIsUndoing(true);
      setUndoResult(null);
      setTimeout(() => {
        const result = undoHistoricalImports();
        setUndoResult(result);
        setIsUndoing(false);
      }, 50);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readJsonFile(file);
  };

  const readJsonFile = (file: File) => {
    setFileError(null);
    setImportResult(null);

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setFileError('O arquivo deve ser no formato JSON (.json).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Validate if it is valid JSON
        JSON.parse(text);
        setJsonInput(text);
      } catch (err) {
        setFileError('O arquivo carregado não contém um JSON válido.');
      }
    };
    reader.onerror = () => {
      setFileError('Erro ao ler o arquivo.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readJsonFile(file);
    }
  };

  const templateJson = {
    "classes": [
      {
        "className": "ADMINISTRAÇÃO HISTÓRICA A",
        "courseName": "Técnico em Administração",
        "shift": "MATUTINO",
        "module": 1,
        "year": 2024,
        "semester": 1,
        "subjects": [
          {
            "subjectName": "Introdução à Administração",
            "records": [
              {
                "studentName": "Fulano de Tal",
                "s1": 8.5,
                "s2": 9.0,
                "afc": null,
                "extra": null,
                "conselho": null,
                "pf": 8.8,
                "faltas": 4,
                "concept": "A",
                "result": "APTO"
              }
            ]
          }
        ]
      }
    ]
  };

  return (
    <div id="historical-data-importer-container" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-150 dark:border-slate-800 mt-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Importador de Dados Históricos (JSON)</h3>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Adicione registros passados de turmas fechadas, notas finais, conceitos e faltas. O sistema irá automaticamente mapear ou criar cursos, turmas históricas (com fechamentos já consolidados), matérias e alunos, vinculando-os e preenchendo seus boletins.
      </p>

      {/* Accordion: Template JSON Schema */}
      <div className="mb-5 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/55 dark:hover:bg-slate-800/30 transition-all select-none"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            Ver Formato e Exemplo do JSON Requerido
          </span>
          {showTemplate ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showTemplate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="p-4 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-600 dark:text-slate-300 bg-slate-100/30 dark:bg-slate-950/50"
          >
            <pre className="max-h-60 overflow-y-auto leading-relaxed text-[11px]">
              {JSON.stringify(templateJson, null, 2)}
            </pre>
            <div className="mt-3 text-[10px] text-slate-500 dark:text-slate-400 leading-normal not-italic font-sans">
              <p className="font-semibold mb-1">Notas importantes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Cursos</strong>: Se não houver curso com o nome correspondente, um novo será criado automaticamente.</li>
                <li><strong>Turmas</strong>: Serão criadas automaticamente se não existirem e marcadas como fechadas/concluídas por padrão.</li>
                <li><strong>Alunos</strong>: Mapeia alunos existentes pelo nome (comparações sem diferenciar maiúsculas/minúsculas e ignorando espaços extras). Se o aluno não existir no banco, ele será cadastrado automaticamente com um usuário e senha provisórios.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10'
            : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-750'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".json"
          className="hidden"
        />
        <UploadCloud className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Arraste e solte o arquivo .json aqui ou clique para selecionar
        </span>
        <span className="text-[10px] text-slate-400">
          Apenas arquivos JSON válidos (.json)
        </span>
      </div>

      {/* JSON Input Textarea */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
          Ou cole o conteúdo JSON abaixo
        </label>
        <textarea
          value={jsonInput}
          onChange={handleJsonChange}
          placeholder='{ "classes": [ ... ] }'
          className="w-full h-44 px-3 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-200 font-mono transition-all text-xs focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Error / Success Notifications */}
      {fileError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-150 dark:border-red-900/30 text-xs flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span>{fileError}</span>
        </motion.div>
      )}

      {importResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30 text-xs"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <span className="font-bold text-sm">Importação Concluída com Sucesso!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2 bg-white/40 dark:bg-slate-900/40 p-3 rounded-lg border border-emerald-200/30 font-semibold text-slate-700 dark:text-slate-300">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cursos Criados</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.coursesCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Turmas Históricas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.classesCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Disciplinas Criadas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.subjectsCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Novos Alunos</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.studentsCreated}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Alunos Reconhecidos</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.studentsRecognized}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Notas Importadas</p>
              <p className="text-sm font-bold text-slate-800 dark:text-emerald-400">{importResult.gradesImported}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={processImport}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider border-b-2 border-emerald-600"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Processar Importação Histórica</span>
        </button>
      </div>

      {/* Diagnóstico e Reparo de Duplicatas */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 mb-2">
          <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">Diagnóstico e Reparo de Duplicatas</h4>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
          Se um aluno tem uma nota que aparece como "faltando" mesmo estando preenchida no mapa, ou se uma turma
          importada não aparece no Diário/Boletim, geralmente é porque uma importação anterior criou uma turma,
          disciplina ou aluno duplicado (por pequenas diferenças de acentuação/espaçamento entre arquivos). Esta
          ferramenta encontra essas duplicatas e funde tudo no registro correto — nenhuma nota é apagada.
        </p>

        {repairResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-3 mb-3 rounded-xl text-xs border ${
              repairResult.classesMerged || repairResult.subjectsMerged || repairResult.studentsMerged
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-150 dark:border-amber-900/30'
                : 'bg-slate-50 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800'
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2 font-semibold">
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Turmas Fundidas</p>
                <p className="text-sm font-bold">{repairResult.classesMerged}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Disciplinas Fundidas</p>
                <p className="text-sm font-bold">{repairResult.subjectsMerged}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Alunos Fundidos</p>
                <p className="text-sm font-bold">{repairResult.studentsMerged}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-60 uppercase tracking-wider">Notas Realocadas</p>
                <p className="text-sm font-bold">{repairResult.gradesReattached}</p>
              </div>
            </div>
            {repairResult.details.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto text-[11px] opacity-90">
                {repairResult.details.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            )}
          </motion.div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleRepair}
            disabled={isRepairing}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-xl text-xs shadow-sm active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>{isRepairing ? 'Verificando...' : 'Diagnosticar e Reparar Duplicatas'}</span>
          </button>
        </div>
      </div>

      {/* Desfazer Importações Históricas */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 mb-2">
          <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">Desfazer Importações Históricas</h4>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
          Remove com segurança todas as turmas históricas importadas (com fechamento definitivo), eliminando as notas vinculadas, faltas diretas e os alunos que possuem vínculo exclusivo com essas turmas. Não altera turmas, alunos ou disciplinas normais.
        </p>

        {undoResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 mb-3 rounded-xl text-xs border bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-150 dark:border-rose-900/30 font-semibold"
          >
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">Turmas Removidas</p>
                <p className="text-sm font-bold">{undoResult.removedClassesCount}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">Alunos Removidos</p>
                <p className="text-sm font-bold">{undoResult.removedStudentsCount}</p>
              </div>
              <div>
                <p className="text-[10px] opacity-70 uppercase tracking-wider">Notas Removidas</p>
                <p className="text-sm font-bold">{undoResult.removedGradesCount}</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-wait text-white font-bold rounded-xl text-xs shadow-sm active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isUndoing ? 'Removendo...' : 'Desfazer Importações Históricas'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {pendingJsonImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirmação do Semestre</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Validação obrigatória de matrícula da turma</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl mb-5 text-center">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                Tem certeza de que deseja importar esta turma para o semestre <span className="text-blue-700 dark:text-blue-400 underline font-black">{currentPeriod}</span>?
              </p>
            </div>

            <div className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Turmas a Importar:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingJsonImport.classNames.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Semestre Destino:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{currentPeriod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disciplinas & Diários:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingJsonImport.subjectsCount} disciplinas</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alunos/Notas/Faltas:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pendingJsonImport.studentsCount} lançamentos</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                ✓ A turma e suas matrículas serão gravadas no semestre <strong>{currentPeriod}</strong> e os diários ficarão <strong>100% liberados para edições de notas e faltas</strong>.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingJsonImport(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmHistoricalImport}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Sim, importar</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
