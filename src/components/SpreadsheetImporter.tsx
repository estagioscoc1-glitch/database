/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, FileText, CheckCircle2, AlertCircle, Info, Download, Users, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

/**
 * Calcula o semestre "certo" a partir da data real.
 *
 * Regra: jan-jun (meses 1 a 6) = primeiro semestre, jul-dez (meses 7 a 12)
 * = segundo semestre. Vale para qualquer ano, não só 2026.
 *
 * Isto é usado SÓ como sugestão inicial do dropdown "1. Semestre" do
 * importador — não mexe no `currentPeriod` (período ativo/trava de diário),
 * que continua sendo controlado manualmente pelo admin.
 */
function getSemestreAtual(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1; // getMonth() é 0-11
  const semestre = mes <= 6 ? 1 : 2;
  return `${ano}/${semestre}`;
}

interface ParsedStudent {
  name: string;
  enrollment: string;
  email: string;
}

interface ParsedSubject {
  name: string;
  workload: number;
}

interface PendingSpreadsheetImport {
  type: 'students' | 'subjects' | 'concepts';
  title: string;
  itemsCount: number;
  previewList: string[];
  data: any;
  fileName: string;
  targetClassId?: string;
  targetCourseId?: string;
  targetModule?: number;
  successMessage: string;
}

export const SpreadsheetImporter: React.FC = () => {
  const { importStudents, importSubjects, importConcepts, classes, courses, currentPeriod } = useApp();
  const [selectedClassId, setSelectedClassId] = useState('');

  /**
   * ESCOLHER O SEMESTRE ANTES DA TURMA
   *
   * Antes havia uma lista só, com as 585 turmas de TODOS os períodos
   * misturadas — o semestre aparecia escondido no meio do texto de cada linha
   * ("Período: 2026/1 | [ENF-M1-MAT] ..."). Era fácil importar 40 alunos para o
   * semestre errado sem perceber, e desfazer isso dá trabalho.
   *
   * Agora são dois passos: escolhe o semestre, e a lista de turmas passa a
   * mostrar só as daquele semestre.
   */
  // Sugestão inicial: semestre calculado pela data de hoje (não pelo
  // `currentPeriod` salvo, que pode estar desatualizado há meses). O usuário
  // continua livre para trocar no dropdown "1. Semestre".
  const [selectedPeriod, setSelectedPeriod] = useState(() => getSemestreAtual());

  // Semestres que realmente têm turma cadastrada, do mais novo para o mais antigo.
  // Sempre inclui também o período ativo (currentPeriod) e o período sugerido
  // pela data de hoje, mesmo que ainda não tenham turma — assim eles aparecem
  // como opção selecionável no dropdown.
  const periodosDisponiveis = React.useMemo(() => {
    const vistos = new Set<string>();
    for (const c of classes) vistos.add(`${c.year}/${c.semester}`);
    if (currentPeriod) vistos.add(currentPeriod);
    vistos.add(getSemestreAtual());
    return Array.from(vistos).sort((a, b) => b.localeCompare(a));
  }, [classes, currentPeriod]);

  const turmasDoPeriodo = React.useMemo(() => {
    const [anoStr, semStr] = selectedPeriod.split('/');
    const ano = parseInt(anoStr);
    const sem = parseInt(semStr);
    return classes
      .filter(c => c.year === ano && c.semester === sem)
      .sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
  }, [classes, selectedPeriod]);

  // Se a turma escolhida não pertence ao semestre selecionado, troca para a
  // primeira daquele semestre. Sem isto dava para escolher "2026/2" e importar
  // numa turma de 2025/1 que continuou selecionada.
  React.useEffect(() => {
    const aindaVale = turmasDoPeriodo.some(c => c.id === selectedClassId);
    if (!aindaVale) {
      setSelectedClassId(turmasDoPeriodo.length > 0 ? turmasDoPeriodo[0].id : '');
    }
  }, [turmasDoPeriodo, selectedClassId]);

  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [fileName, setFileName] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parsedPreview, setParsedPreview] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<PendingSpreadsheetImport | null>(null);

  const confirmSpreadsheetImport = () => {
    if (!pendingImport) return;

    try {
      if (pendingImport.type === 'students') {
        importStudents(pendingImport.data, pendingImport.targetClassId!);
      } else if (pendingImport.type === 'subjects') {
        importSubjects(pendingImport.data, pendingImport.targetCourseId!, pendingImport.targetModule!);
      } else if (pendingImport.type === 'concepts') {
        importConcepts(pendingImport.data);
      }

      setFileName(pendingImport.fileName);
      setParsedCount(pendingImport.itemsCount);
      setParsedPreview(pendingImport.previewList);
      setStatus({
        type: 'success',
        message: `[Semestre ${selectedPeriod}] ${pendingImport.successMessage}`
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: err.message || 'Erro ao realizar importação.'
      });
    } finally {
      setPendingImport(null);
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /** Limites de segurança para arquivos vindos de fora. */
  const TAMANHO_MAXIMO_MB = 10;
  const LINHAS_MAXIMAS = 5000;
  const EXTENSOES_ACEITAS = ['.xlsx', '.xls', '.csv'];

  const parseExcelFile = (file: File) => {
    // VALIDAÇÃO DO ARQUIVO
    //
    // Antes, qualquer arquivo era entregue direto ao leitor de planilhas.
    // A biblioteca usada (xlsx 0.18.5) tem falhas conhecidas exploráveis por
    // arquivo malformado — e planilha aqui vem de fora da instituição.
    const nome = (file.name || '').toLowerCase();
    const extensaoOk = EXTENSOES_ACEITAS.some(ext => nome.endsWith(ext));

    if (!extensaoOk) {
      setStatus({ type: 'error', message: `Formato não aceito. Envie um arquivo ${EXTENSOES_ACEITAS.join(', ')}.` });
      return;
    }
    if (file.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setStatus({
        type: 'error',
        message: `Arquivo muito grande (${(file.size / 1048576).toFixed(1)} MB). O limite é ${TAMANHO_MAXIMO_MB} MB.`
      });
      return;
    }
    if (file.size === 0) {
      setStatus({ type: 'error', message: 'O arquivo está vazio.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: null, message: '' });
    setParsedCount(null);
    setParsedPreview([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error("O arquivo Excel não contém nenhuma planilha.");
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays (rows)
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        // Trava contra planilha absurdamente grande (acidente ou ataque):
        // milhares de linhas travariam o navegador ao processar.
        if (rows.length > LINHAS_MAXIMAS) {
          throw new Error(
            `A planilha tem ${rows.length} linhas, acima do limite de ${LINHAS_MAXIMAS}. ` +
            `Divida em arquivos menores.`
          );
        }
        
        if (!rows || rows.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        // Auto-detect mode by scanning headers
        let isStudentSheet = false;
        let isSubjectSheet = false;
        
        let matrColIndex = -1;
        let nameColIndex = -1;
        let subjColIndex = -1;
        let workloadColIndex = -1;
        let headerRowIndex = -1;

        // Scan rows to find headers
        for (let r = 0; r < Math.min(20, rows.length); r++) {
          const row = rows[r];
          if (!row || !Array.isArray(row)) continue;
          
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim().toLowerCase();
            
            // Student columns detection
            if (val.includes('matr') || val === 'matrícula' || val === 'matricula') {
              matrColIndex = c;
            }
            if (val === 'aluno' || val === 'aluna' || val === 'nome' || val === 'estudante' || val.includes('nome do aluno')) {
              nameColIndex = c;
            }
            
            // Subject columns detection
            if (val.includes('disciplina') || val.includes('matéria') || val.includes('materia') || val === 'componente' || val.includes('componente curricular')) {
              subjColIndex = c;
            }
            if (val.includes('carga') || val.includes('ch') || val === 'horas' || val === 'workload') {
              workloadColIndex = c;
            }
          }
          
          // Check if we found a valid header row
          if (matrColIndex !== -1 && nameColIndex !== -1) {
            isStudentSheet = true;
            headerRowIndex = r;
            break;
          }
          if (subjColIndex !== -1 && workloadColIndex !== -1) {
            isSubjectSheet = true;
            headerRowIndex = r;
            break;
          }
        }

        // Smart fallbacks if header Row scanning failed
        if (!isStudentSheet && !isSubjectSheet) {
          // Content-based heuristic search!
          // We look for columns that contain matching patterns of student registrations and names
          let bestMatrCol = -1;
          let bestNameCol = -1;
          let maxMatrCount = 0;
          let maxNameCount = 0;
          
          // Let's analyze columns in the rows of the sheet
          const numCols = Math.max(...rows.map(row => (Array.isArray(row) ? row.length : 0)));
          
          const matrScore = Array(numCols).fill(0);
          const nameScore = Array(numCols).fill(0);
          
          for (let r = 0; r < Math.min(60, rows.length); r++) {
            const row = rows[r];
            if (!row || !Array.isArray(row)) continue;
            
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || '').trim();
              if (!val) continue;
              
              const valLower = val.toLowerCase();
              const isHeaderOrLabel = valLower.includes('total') || 
                                      valLower.includes('professor') || 
                                      valLower.includes('colégio') || 
                                      valLower.includes('colegio') || 
                                      valLower.includes('diário') || 
                                      valLower.includes('diario') || 
                                      valLower.includes('ficha') || 
                                      valLower.includes('curso') || 
                                      valLower.includes('turma') || 
                                      valLower.includes('período') || 
                                      valLower.includes('periodo') || 
                                      valLower.includes('módulo') || 
                                      valLower.includes('modulo') ||
                                      valLower.includes('curricular') ||
                                      valLower.includes('carga') ||
                                      valLower.includes('disciplina') ||
                                      valLower.includes('aulas');
              
              // Match 4 to 12 digit numbers (like 26101013 or 1001)
              if (/^\d{4,12}$/.test(val)) {
                matrScore[c]++;
              } 
              // Match names: length >= 8, has letters, is not a known header/label, and contains spaces (at least 2 words)
              else if (val.length >= 8 && /[a-zA-ZÀ-ÖØ-öø-ÿ]{3,}/.test(val) && !isHeaderOrLabel && val.split(/\s+/).length >= 2) {
                nameScore[c]++;
              }
            }
          }
          
          // Find the columns with the highest scores
          for (let c = 0; c < numCols; c++) {
            if (matrScore[c] > maxMatrCount) {
              maxMatrCount = matrScore[c];
              bestMatrCol = c;
            }
            if (nameScore[c] > maxNameCount) {
              maxNameCount = nameScore[c];
              bestNameCol = c;
            }
          }
          
          // If we found a column with at least 3 enrollment numbers and 3 names
          if (maxMatrCount >= 3 && maxNameCount >= 3 && bestMatrCol !== bestNameCol) {
            matrColIndex = bestMatrCol;
            nameColIndex = bestNameCol;
            isStudentSheet = true;
            
            // Let the header be 1 row before the first detected registration
            for (let r = 0; r < rows.length; r++) {
              const val = String(rows[r]?.[bestMatrCol] || '').trim();
              if (/^\d{4,12}$/.test(val)) {
                headerRowIndex = Math.max(0, r - 1);
                break;
              }
            }
          }
        }

        // Standard string name fallbacks as final fallback if content search also failed
        if (!isStudentSheet && !isSubjectSheet) {
          // If the file name suggests students
          const nameLower = file.name.toLowerCase();
          if (nameLower.includes('alun') || nameLower.includes('student') || nameLower.includes('freq') || nameLower.includes('diario') || nameLower.includes('ficha')) {
            // Let's assume Column B (1) is enrollment, Column C (2) is student name
            // (Standard LYnx EDU layout as shown in the screenshot)
            matrColIndex = 1;
            nameColIndex = 2;
            isStudentSheet = true;
            // Find the first row where column B has a number and column C has text, usually starting around row 7
            headerRowIndex = 5; // Look after row 5 (index 5, which is row 6)
          } else if (nameLower.includes('disciplina') || nameLower.includes('materia') || nameLower.includes('carga') || nameLower.includes('grade')) {
            subjColIndex = 0;
            workloadColIndex = 1;
            isSubjectSheet = true;
            headerRowIndex = 0;
          }
        }

        if (isStudentSheet) {
          // Parse students
          const parsedStudents: ParsedStudent[] = [];
          const previewNames: string[] = [];
          const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
          
          for (let r = startRow; r < rows.length; r++) {
            const row = rows[r];
            if (!row || !Array.isArray(row)) continue;
            
            const matrRaw = String(row[matrColIndex] || '').trim();
            const nameRaw = String(row[nameColIndex] || '').trim();
            
            if (!matrRaw || !nameRaw) continue;
            
            // Skip header repeat rows, totals, or empty template values
            if (
              matrRaw.toLowerCase().includes('matr') || 
              nameRaw.toLowerCase().includes('aluno') || 
              nameRaw.toLowerCase().includes('total') || 
              nameRaw.toLowerCase().includes('professor') ||
              nameRaw.toLowerCase().includes('colégio')
            ) {
              continue;
            }
            
            parsedStudents.push({
              name: nameRaw.toUpperCase(),
              enrollment: matrRaw,
              email: `${matrRaw}@aluno.oc.com`
            });
            
            if (previewNames.length < 5) {
              previewNames.push(`${matrRaw} - ${nameRaw.toUpperCase()}`);
            }
          }

          if (parsedStudents.length === 0) {
            throw new Error("Não foi possível encontrar nenhum aluno válido com matrícula e nome. Verifique se os cabeçalhos 'Matr.' e 'ALUNO' estão presentes.");
          }

          // Stage for user confirmation
          setPendingImport({
            type: 'students',
            title: 'Planilha de Alunos / Matrículas',
            itemsCount: parsedStudents.length,
            previewList: previewNames,
            data: parsedStudents,
            fileName: file.name,
            targetClassId: selectedClassId,
            successMessage: `Planilha de alunos importada com sucesso! ${parsedStudents.length} alunos cadastrados e matriculados na turma selecionada.`
          });
        } else if (isSubjectSheet) {
          // Parse subjects
          const parsedSubjects: ParsedSubject[] = [];
          const previewSubjs: string[] = [];
          const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
          
          for (let r = startRow; r < rows.length; r++) {
            const row = rows[r];
            if (!row || !Array.isArray(row)) continue;
            
            const nameRaw = String(row[subjColIndex] || '').trim();
            const workloadRaw = parseInt(String(row[workloadColIndex] || '').trim().replace(/h/gi, '')) || 40;
            
            if (!nameRaw) continue;
            if (nameRaw.toLowerCase().includes('disciplina') || nameRaw.toLowerCase().includes('total')) {
              continue;
            }
            
            parsedSubjects.push({
              name: nameRaw,
              workload: workloadRaw
            });
            
            if (previewSubjs.length < 5) {
              previewSubjs.push(`${nameRaw} (${workloadRaw}h)`);
            }
          }

          if (parsedSubjects.length === 0) {
            throw new Error("Não foi possível encontrar nenhuma matéria válida. Verifique se os cabeçalhos 'Disciplina' e 'Carga Horária' estão presentes.");
          }

          // Find course of the active class
          const targetClass = classes.find(c => c.id === selectedClassId);
          const courseId = targetClass?.courseId || 'ENF';
          const mod = targetClass?.module || 1;
          
          // Stage for user confirmation
          setPendingImport({
            type: 'subjects',
            title: 'Grade Curricular / Disciplinas',
            itemsCount: parsedSubjects.length,
            previewList: previewSubjs,
            data: parsedSubjects,
            fileName: file.name,
            targetCourseId: courseId,
            targetModule: mod,
            successMessage: `Grade curricular de ${parsedSubjects.length} disciplinas importada com sucesso para o curso da turma selecionada (Módulo ${mod}).`
          });
        } else {
          throw new Error("Não conseguimos identificar o formato da planilha automaticamente. Certifique-se de que ela contém uma coluna com 'Matr.' e outra com 'ALUNO' para alunos, ou 'Disciplina' e 'Carga' para matérias.");
        }

      } catch (err: any) {
        setStatus({
          type: 'error',
          message: err.message || 'Erro inesperado ao processar o arquivo Excel.'
        });
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      parseExcelFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      parseExcelFile(file);
    }
  };

  // Predefined dataset loaders
  const loadDefaultStudents = () => {
    const demoStudents = [
      { name: 'CARLOS ROBERTO G. DO NASCIMENTO (MEGAN)', enrollment: '26101013', email: 'carlos.megan@aluno.oc.com' },
      { name: 'DANIEL LONGUINHO BATISTA DE SOUZA', enrollment: '26101001', email: 'daniel.longuinho@aluno.oc.com' },
      { name: 'ELAINE FERREIRA DOS SANTOS SILVA', enrollment: '26101037', email: 'elaine.ferreira@aluno.oc.com' },
      { name: 'EMANUELY PINHEIRO SANTOS', enrollment: '26101023', email: 'emanuely.pinheiro@aluno.oc.com' },
      { name: 'JULIANA ALVES ARRUDA', enrollment: '26101031', email: 'juliana.arruda@aluno.oc.com' },
      { name: 'KAMILLY VITORIA RIBEIRO PEREIRA', enrollment: '26101017', email: 'kamilly.vitoria@aluno.oc.com' },
      { name: 'KELLY FLAVIA MARTINS', enrollment: '26101027', email: 'kelly.flavia@aluno.oc.com' },
      { name: 'LETICIA LIMA SILVA', enrollment: '26101008', email: 'leticia.lima@aluno.oc.com' },
      { name: 'ORION DE OLIVEIRA MARQUES', enrollment: '26101010', email: 'orion.marques@aluno.oc.com' },
      { name: 'SAMARA BEZERRA SÁ', enrollment: '26101035', email: 'samara.bezerra@aluno.oc.com' },
      { name: 'SHEILE MARCIA DE MORAIS', enrollment: '26101002', email: 'sheile.morais@aluno.oc.com' },
      { name: 'TATYANA PALHETA DE ARRUDA BISPO', enrollment: '26101046', email: 'tatyana.palheta@aluno.oc.com' },
      { name: 'THALLITA SOUSA CRUZ', enrollment: '26101048', email: 'thallita.cruz@aluno.oc.com' },
      { name: 'PATRICIA AGUIAR RODRIGUES DA SILVA', enrollment: '26101050', email: 'patricia.aguiar@aluno.oc.com' }
    ];
    setPendingImport({
      type: 'students',
      title: 'Modelo - Planilha de Alunos Real',
      itemsCount: demoStudents.length,
      previewList: demoStudents.map(s => `${s.enrollment} - ${s.name}`),
      data: demoStudents,
      fileName: 'ALUNOS_ENFERMAGEM_1MAT.xlsx',
      targetClassId: selectedClassId,
      successMessage: 'Planilha de Alunos carregada com sucesso! 14 alunos cadastrados e distribuídos para a turma.'
    });
  };

  const loadDefaultSubjects = () => {
    const demoSubjects = [
      { name: 'Anatomia e Fisiologia Humana', workload: 80 },
      { name: 'Biossegurança nas Ações de Saúde', workload: 40 },
      { name: 'Introdução à Enfermagem', workload: 120 },
      { name: 'Microbiologia e Parasitologia', workload: 40 },
      { name: 'Noções de Farmacologia', workload: 40 },
      { name: 'Nutrição', workload: 40 },
      { name: 'Primeiros Socorros', workload: 40 }
    ];
    const targetClass = classes.find(c => c.id === selectedClassId);
    const courseId = targetClass?.courseId || 'ENF';
    const mod = targetClass?.module || 1;
    setPendingImport({
      type: 'subjects',
      title: 'Modelo - Grade Curricular',
      itemsCount: demoSubjects.length,
      previewList: demoSubjects.map(s => `${s.name} (${s.workload}h)`),
      data: demoSubjects,
      fileName: 'DISCIPLINAS_CARGA_HORARIA.xlsx',
      targetCourseId: courseId,
      targetModule: mod,
      successMessage: `Grade curricular de ${demoSubjects.length} disciplinas importada com sucesso para o Módulo ${mod}!`
    });
  };

  const loadDefaultConcepts = () => {
    const demoConcepts = [
      { id: '1', minGrade: 86, maxGrade: 100, letter: 'A', description: 'Excelente' },
      { id: '2', minGrade: 76, maxGrade: 85, letter: 'B', description: 'Bom' },
      { id: '3', minGrade: 60, maxGrade: 75, letter: 'C', description: 'Regular' },
      { id: '4', minGrade: 0, maxGrade: 59, letter: 'D', description: 'Insuficiente' }
    ];
    setPendingImport({
      type: 'concepts',
      title: 'Modelo - Tabela de Conceitos',
      itemsCount: demoConcepts.length,
      previewList: demoConcepts.map(c => `Nota ${c.minGrade}-${c.maxGrade} = Conceito ${c.letter}`),
      data: demoConcepts,
      fileName: 'CONCEITOS_AVALIACAO.xlsx',
      successMessage: 'Planilha de conceitos e regras institucionais sincronizada com sucesso!'
    });
  };

  return (
    <div id="spreadsheet-importer-container" className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-150 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="h-5 w-5 text-blue-700 dark:text-blue-400" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Importador Inteligente de Planilhas (Excel/CSV)</h3>
      </div>
      
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
        Carregue arquivos do Excel ou arraste-os para o painel. O sistema detectará automaticamente a estrutura, extrairá as matrículas e os nomes dos alunos (ou disciplinas e cargas horárias) e os registrará em tempo real.
      </p>

      {/* Passo 1: semestre. Passo 2: turma daquele semestre. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            1. Semestre
          </label>
          <select
            id="importer-period-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm"
          >
            {periodosDisponiveis.map(p => (
              <option key={p} value={p}>
                {p}{p === currentPeriod ? '  (período ativo)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            2. Turma de destino
          </label>
          <select
            id="importer-class-select"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={turmasDoPeriodo.length === 0}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-white transition-all text-sm disabled:opacity-50"
          >
            {turmasDoPeriodo.length === 0 && (
              <option value="">Nenhuma turma neste semestre</option>
            )}
            {turmasDoPeriodo.map(c => {
              const courseName = courses.find(co => co.id === c.courseId)?.name || '';
              const codePrefix = c.code ? `[${c.code}] ` : '';
              return (
                <option key={c.id} value={c.id}>
                  {codePrefix}{c.name} - {courseName} ({c.shift}) - Mód {c.module}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Confirmação em texto claro do que vai acontecer, antes de escolher o
          arquivo. É a última chance de perceber que o destino está errado. */}
      {selectedClassId && (() => {
        const turma = turmasDoPeriodo.find(c => c.id === selectedClassId);
        if (!turma) return null;
        return (
          <div className="mb-6 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
            Os alunos da planilha entrarão em <strong>{turma.name}</strong> ({turma.code}),
            no semestre <strong>{selectedPeriod}</strong>, e serão distribuídos automaticamente
            em <strong>todos os diários</strong> dessa turma.
            <br />
            Cada um receberá acesso com a <strong>matrícula como usuário e como senha</strong>,
            com troca obrigatória no primeiro acesso.
          </div>
        );
      })()}

      {/* Status Indicators */}
      {status.type && (
        <motion.div 
          id="import-status-notification"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 mb-4 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm border ${
            status.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-150 dark:border-emerald-900/30' 
              : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border-red-150 dark:border-red-900/30'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          <div className="w-full">
            <p className="font-semibold">{status.type === 'success' ? 'Importação Concluída com Sucesso!' : 'Erro na Importação'}</p>
            <p className="text-xs mt-0.5 opacity-90">{status.message}</p>
            {fileName && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <FileText className="h-3 w-3 text-blue-500" /> {fileName}
              </span>
            )}

            {/* Render Preview Checklist of what was loaded */}
            {status.type === 'success' && parsedPreview.length > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/40">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1.5">
                  Visualização dos Dados Importados ({parsedCount} itens total):
                </p>
                <ul className="space-y-1">
                  {parsedPreview.map((item, index) => (
                    <li key={index} className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {item}
                    </li>
                  ))}
                  {parsedCount && parsedCount > 5 && (
                    <li className="text-[10px] italic text-emerald-600 dark:text-emerald-500 pl-3">
                      ...e mais {parsedCount - 5} registros importados.
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Drag & Drop Area */}
      <div
        id="drag-drop-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all relative ${
          isLoading ? 'opacity-60 cursor-not-allowed' : ''
        } ${
          dragActive 
            ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10' 
            : 'border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-800'
        }`}
      >
        {isLoading ? (
          <div className="py-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Lendo e mapeando planilha...</p>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3 animate-bounce" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Arraste e solte seu arquivo Excel do PC aqui
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Suporta arquivos .xlsx, .xls ou .csv
            </p>
            
            <label className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-300 font-semibold rounded-xl text-xs cursor-pointer shadow-sm transition-all inline-block">
              Selecionar Arquivo
              <input
                type="file"
                id="file-input-raw"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInput}
                disabled={isLoading}
              />
            </label>
          </>
        )}
      </div>

      {/* Instruction Tips */}
      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-xl flex gap-2">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          <strong>Suporte de Formato Flexível:</strong> Você pode usar a sua planilha original diretamente! Nosso leitor inteligente detecta automaticamente a coluna <strong>Matr.</strong> para as matrículas e a coluna <strong>ALUNO</strong> para os nomes dos estudantes.
        </p>
      </div>

      {/* Pre-made Templates / Click-to-load section */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 mb-3 text-slate-600 dark:text-slate-400">
          <Users className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Modelos de Teste Rápido (Click-to-Load)</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            id="load-demo-students-btn"
            onClick={loadDefaultStudents}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl transition-all text-left"
          >
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">ALUNOS_ENF_1MAT.xlsx</p>
              <p className="text-[10px] text-slate-400">Os 14 alunos reais da sua ficha</p>
            </div>
            <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>

          <button
            type="button"
            id="load-demo-subjects-btn"
            onClick={loadDefaultSubjects}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl transition-all text-left"
          >
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">GRADE_CURRICULAR.xlsx</p>
              <p className="text-[10px] text-slate-400">7 matérias e cargas horárias</p>
            </div>
            <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>

          <button
            type="button"
            id="load-demo-concepts-btn"
            onClick={loadDefaultConcepts}
            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-xl transition-all text-left"
          >
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">CONCEITOS.xlsx</p>
              <p className="text-[10px] text-slate-400">Conversões de notas institucionais</p>
            </div>
            <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 rounded-2xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirmação de Importação</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Confirme o semestre de matrícula para os diários</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl mb-5 text-center">
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 leading-snug">
                Tem certeza de que deseja importar esta turma para o semestre <span className="text-blue-700 dark:text-blue-400 underline font-black">{selectedPeriod}</span>?
              </p>
            </div>

            <div className="space-y-2 mb-6 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{pendingImport.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turma Destino:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {classes.find(c => c.id === pendingImport.targetClassId)?.name || 'Turma Selecionada'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Semestre Oficial:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{selectedPeriod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total de Registros:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{pendingImport.itemsCount} itens</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                ✓ A turma e diários ficarão registrados no semestre <strong>{selectedPeriod}</strong> e permanecerão <strong>100% liberados para edições de notas e faltas</strong>.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingImport(null);
                  setIsLoading(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmSpreadsheetImport}
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
