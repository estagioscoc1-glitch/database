/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Calendar, Save, AlertCircle, Printer, Lock, ClipboardList, Info, HelpCircle } from 'lucide-react';
import { PrintModal } from './PrintModal';
import { safeLocalStorage } from '../lib/safeStorage';
import { salvarCabecalhoDoDiario, carregarCabecalhoDoDiario } from '../lib/repositorios';

interface JournalDateInputProps {
  initialValue: string;
  placeholder: string;
  disabled: boolean;
  onSave: (val: string) => void;
  title: string;
}

const JournalDateInput: React.FC<JournalDateInputProps> = ({
  initialValue,
  placeholder,
  disabled,
  onSave,
  title
}) => {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 2);
    setVal(cleaned);
  };

  const handleBlur = () => {
    if (val !== initialValue) {
      onSave(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      maxLength={2}
      disabled={disabled}
      placeholder={placeholder}
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-8 h-6 text-center text-[10px] font-black font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white transition-all animate-none"
      title={title}
    />
  );
};

export const AttendanceJournal: React.FC = () => {
  const { 
    users, classes, subjects, attendance, grades,
    activeClassId, activeSubjectId, currentUser, getStudentAbsences, updateStudentAbsences,
    saveAttendanceSession, addAttendanceSession,
    isClassDefinitiveLocked, autoLockEnabled, simulatedDate, calendarEvents,
    currentPeriod
  } = useApp();

  // SÓ A GESTÃO ABONA FALTA.
  //
  // O professor registra o que aconteceu na aula — presença e falta — e para
  // ele o caminho continua sendo as bolinhas de cada data. Alterar o TOTAL é
  // ato administrativo: apaga o rastro do que foi registrado dia a dia e muda
  // o resultado do aluno. Isso é da secretaria.
  const podeEditarTotalDeFaltas =
    currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.STAFF;

  const [printDoc, setPrintDoc] = useState<{ type: 'boletim' | 'boletim_sala' | 'diario_notas' | 'diario_freq' | 'mapa_notas' } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const handleSaveAttendance = () => {
    if (isLocked) return;
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }, 800);
  };
  
  const targetClass = classes.find(c => c.id === activeClassId);
  const targetSubject = subjects.find(s => s.id === activeSubjectId);
  
  if (!targetClass || !targetSubject) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800">
        <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <h4 className="font-bold text-slate-700 dark:text-slate-300">Nenhum Diário Ativo</h4>
        <p className="text-xs text-slate-400 mt-1">Selecione uma turma e disciplina para abrir o diário de frequência.</p>
      </div>
    );
  }

  const isLocked = isClassDefinitiveLocked(targetClass) && currentUser?.role !== 'ADMIN';
  const isAutoLockedDefinitive = autoLockEnabled && calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date && simulatedDate >= (calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date || '') && currentUser?.role !== 'ADMIN';

  const classStudents = useMemo(() => {
    return users.filter(
      u => u.role === 'STUDENT' && (u.classId === targetClass.id || grades.some(g => g.studentId === u.id && g.classId === targetClass.id))
    );
  }, [users, grades, targetClass.id]);

  // Filter sessions that belong to this class and subject (sorted by ID for stable column positions)
  const subjectSessions = useMemo(() => {
    return attendance
      .filter(s => s.subjectId === targetSubject.id && s.classId === targetClass.id)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [attendance, targetSubject.id, targetClass.id]);

  // Derived 30 columns for the grid
  const cols = useMemo(() => {
    return Array.from({ length: 30 }).map((_, index) => {
      const sess = subjectSessions[index];
      let month = '';
      let day = '';
      let lessonsCount = 1;
      
      if (sess) {
        const parts = sess.date.split('-');
        month = parts[1] === '00' ? '' : (parts[1] || '');
        day = parts[2] === '00' ? '' : (parts[2] || '');
        lessonsCount = sess.lessonsCount;
      }
      
      const records: { [studentId: string]: 'P' | 'F' } = {};
      classStudents.forEach(std => {
        if (sess) {
          records[std.id] = sess.records[std.id] === 'F' ? 'F' : 'P';
        } else {
          records[std.id] = 'P'; // Default is Present
        }
      });
      
      return {
        id: sess?.id || null,
        month,
        day,
        lessonsCount,
        records
      };
    });
  }, [subjectSessions, classStudents]);

  const storageKeyInicio = `oc_header_${targetClass.id}_${targetSubject.id}_inicioModulo`;
  const storageKeyTermino = `oc_header_${targetClass.id}_${targetSubject.id}_terminoModulo`;
  const storageKeyPrevistas = `oc_header_${targetClass.id}_${targetSubject.id}_aulasPrevistas`;
  const storageKeyDadas = `oc_header_${targetClass.id}_${targetSubject.id}_aulasDadas`;

  const [inicioModulo, setInicioModulo] = useState(() => safeLocalStorage.getItem(storageKeyInicio) || '');
  const [terminoModulo, setTerminoModulo] = useState(() => safeLocalStorage.getItem(storageKeyTermino) || '');
  const [aulasPrevistas, setAulasPrevistas] = useState(() => safeLocalStorage.getItem(storageKeyPrevistas) || targetSubject?.workload?.toString() || '80');
  const [aulasDadas, setAulasDadas] = useState(() => safeLocalStorage.getItem(storageKeyDadas) || targetSubject?.workload?.toString() || '80');

  // O NAVEGADOR É CÓPIA, NÃO É O ORIGINAL.
  //
  // Estes quatro campos continuam sendo guardados aqui para a tela responder na
  // hora e continuar legível sem internet. Mas quem manda é o banco: logo abaixo
  // eles são lidos de lá ao abrir o diário, e gravados lá a cada alteração.
  useEffect(() => {
    safeLocalStorage.setItem(storageKeyInicio, inicioModulo);
  }, [inicioModulo, storageKeyInicio]);

  useEffect(() => {
    safeLocalStorage.setItem(storageKeyTermino, terminoModulo);
  }, [terminoModulo, storageKeyTermino]);

  useEffect(() => {
    safeLocalStorage.setItem(storageKeyPrevistas, aulasPrevistas);
  }, [aulasPrevistas, storageKeyPrevistas]);

  useEffect(() => {
    safeLocalStorage.setItem(storageKeyDadas, aulasDadas);
  }, [aulasDadas, storageKeyDadas]);

  /* ------------------------------------------------ cabeçalho: ler do banco */
  //
  // Antes, abrir o mesmo diário em outro computador mostrava estes campos em
  // branco, porque eles só existiam no navegador de quem os digitou. Agora vêm
  // do servidor, e o que estiver lá ganha do que estiver guardado aqui.
  const [cabecalhoCarregado, setCabecalhoCarregado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCabecalhoCarregado(false);

    (async () => {
      const doBanco = await carregarCabecalhoDoDiario(targetClass.id, targetSubject.id, currentPeriod);
      if (cancelado) return;

      if (doBanco) {
        // Campo vazio no banco não apaga o que já está na tela: o diário pode
        // ter sido preenchido antes desta correção existir, e nesse caso o valor
        // local é o único que sobrou. Ele será enviado na próxima alteração.
        if (doBanco.inicioModulo) setInicioModulo(doBanco.inicioModulo);
        if (doBanco.terminoModulo) setTerminoModulo(doBanco.terminoModulo);
        if (doBanco.aulasPrevistas) setAulasPrevistas(doBanco.aulasPrevistas);
        if (doBanco.aulasDadas) setAulasDadas(doBanco.aulasDadas);
      }
      setCabecalhoCarregado(true);
    })();

    return () => { cancelado = true; };
  }, [targetClass.id, targetSubject.id, currentPeriod]);

  /* ---------------------------------------------- cabeçalho: gravar no banco */
  //
  // A GRAVAÇÃO APARECE NA TELA, DE PROPÓSITO.
  //
  // A primeira versão disto gravava sozinha meio segundo depois da última tecla,
  // em silêncio. Quando não funcionou, não havia como saber se tinha tentado e
  // falhado, se nem tentou, ou se o navegador estava com a versão antiga da
  // página — descobrir isso custou horas de consulta ao banco.
  //
  // Agora quem digita vê o resultado: "Salvando...", "Salvo" ou "Não salvou".
  // Se algo quebrar de novo, o problema se anuncia na hora, para a pessoa certa.
  const [statusCabecalho, setStatusCabecalho] = useState<'parado' | 'salvando' | 'salvo' | 'erro'>('parado');

  const gravarCabecalho = React.useCallback(async () => {
    if (!cabecalhoCarregado || isLocked) return;

    setStatusCabecalho('salvando');

    // PRECISA DE try/catch, E A FALTA DELE JÁ CUSTOU CARO.
    //
    // A versão anterior chamava a gravação sem proteção nenhuma. Quando a
    // chamada ESTOURAVA uma exceção — em vez de devolver um erro — a função
    // morria no meio: o "Salvando..." ficava girando para sempre, nenhuma
    // mensagem aparecia, e o dado não ia para o servidor. Do lado de quem usa,
    // parecia que o sistema tinha travado sem motivo.
    //
    // O tempo limite existe pelo mesmo motivo: uma resposta que nunca chega é
    // indistinguível de um sistema quebrado. Depois de 15 segundos, desiste e
    // avisa, em vez de girar indefinidamente.
    try {
      const comLimiteDeTempo = <T,>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, rejeitar) =>
            setTimeout(() => rejeitar(new Error('o servidor não respondeu em 15 segundos')), ms)
          ),
        ]);

      const r = await comLimiteDeTempo(
        salvarCabecalhoDoDiario(
          targetClass.id,
          targetSubject.id,
          currentPeriod,
          { inicioModulo, terminoModulo, aulasPrevistas, aulasDadas },
          currentUser?.role === 'TEACHER' ? currentUser.id : null
        ),
        15000
      );

      if (r.ok) {
        setStatusCabecalho('salvo');
        setWarningMessage(null);
        setTimeout(() => setStatusCabecalho('parado'), 2500);
      } else {
        setStatusCabecalho('erro');
        setWarningMessage(
          `O cabeçalho do diário NÃO foi salvo no servidor: ${r.erro} ` +
          `Ele continua guardado neste computador, mas não aparecerá em outro.`
        );
      }
    } catch (erro: any) {
      setStatusCabecalho('erro');
      setWarningMessage(
        `O cabeçalho do diário NÃO foi salvo: ${erro?.message || erro}. ` +
        `Ele continua guardado neste computador. Confira sua internet e altere o campo de novo.`
      );
      console.error('[Diário] Falha ao gravar o cabeçalho:', erro);
    }
  }, [cabecalhoCarregado, isLocked, targetClass.id, targetSubject.id, currentPeriod,
      inicioModulo, terminoModulo, aulasPrevistas, aulasDadas, currentUser?.id, currentUser?.role]);

  // Grava também sozinho, um segundo depois da última tecla. É rede de segurança
  // para quem digita e fecha a aba sem tirar o cursor do campo.
  useEffect(() => {
    if (!cabecalhoCarregado || isLocked) return;
    const relogio = setTimeout(() => { void gravarCabecalho(); }, 1000);
    return () => clearTimeout(relogio);
  }, [inicioModulo, terminoModulo, aulasPrevistas, aulasDadas, cabecalhoCarregado, isLocked, gravarCabecalho]);

  const handleDateChange = (val: string, prevVal: string, setter: (v: string) => void) => {
    // If the user is deleting characters, just set the value directly to allow backspacing
    if (val.length < prevVal.length) {
      setter(val);
      setSaveStatus('unsaved');
      return;
    }
    
    // Extract only digits and limit to 8 digits (DDMMYYYY)
    const digits = val.replace(/\D/g, '').slice(0, 8);
    
    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    }
    
    setter(formatted);
    setSaveStatus('unsaved');
  };

  const workloadNum = parseInt(aulasPrevistas) || 80;
  const maxAbsencesLimit = Math.floor(workloadNum * 0.25);

  const handleUpdateMonth = (colIndex: number, monthVal: string) => {
    if (isLocked) return;
    const col = cols[colIndex];
    const cleanMonth = monthVal.replace(/\D/g, '').slice(0, 2);
    
    const day = col.day || '00';
    const month = cleanMonth || '00';
    const dateStr = `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    if (col.id) {
      const existingSession = subjectSessions.find(s => s.id === col.id);
      if (existingSession) {
        saveAttendanceSession({
          ...existingSession,
          date: dateStr
        });
      }
    } else {
      if (!cleanMonth) return; // Don't create session for an empty month if it doesn't exist
      const records: { [studentId: string]: 'P' | 'F' } = {};
      classStudents.forEach(std => {
        records[std.id] = 'P';
      });
      addAttendanceSession({
        subjectId: targetSubject.id,
        classId: targetClass.id,
        teacherId: currentUser?.id || 'admin',
        date: dateStr,
        lessonsCount: 1,
        topic: `AULA ${colIndex + 1}`,
        records
      });
    }
    setSaveStatus('unsaved');
  };

  const handleUpdateDay = (colIndex: number, dayVal: string) => {
    if (isLocked) return;
    const col = cols[colIndex];
    const cleanDay = dayVal.replace(/\D/g, '').slice(0, 2);
    
    const month = col.month || '00';
    const day = cleanDay || '00';
    const dateStr = `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    if (col.id) {
      const existingSession = subjectSessions.find(s => s.id === col.id);
      if (existingSession) {
        saveAttendanceSession({
          ...existingSession,
          date: dateStr
        });
      }
    } else {
      if (!cleanDay) return; // Don't create session for an empty day if it doesn't exist
      const records: { [studentId: string]: 'P' | 'F' } = {};
      classStudents.forEach(std => {
        records[std.id] = 'P';
      });
      addAttendanceSession({
        subjectId: targetSubject.id,
        classId: targetClass.id,
        teacherId: currentUser?.id || 'admin',
        date: dateStr,
        lessonsCount: 1,
        topic: `AULA ${colIndex + 1}`,
        records
      });
    }
    setSaveStatus('unsaved');
  };

  const handleCellClick = (colIndex: number, studentId: string) => {
    if (isLocked) return;
    const col = cols[colIndex];
    const currentVal = col.records[studentId];
    const newVal: 'P' | 'F' = currentVal === 'F' ? 'P' : 'F';
    
    updateAttendanceValue(colIndex, studentId, newVal);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, colIndex: number, studentId: string) => {
    if (isLocked) return;
    const key = e.key.toUpperCase();
    if (key === 'F') {
      e.preventDefault();
      updateAttendanceValue(colIndex, studentId, 'F');
    } else if (key === 'P' || e.key === '.' || e.key === '•' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      updateAttendanceValue(colIndex, studentId, 'P');
    }
  };

  const updateAttendanceValue = (colIndex: number, studentId: string, value: 'P' | 'F') => {
    const col = cols[colIndex];
    
    // Check if the column month or day is empty before registering attendance
    if (!col.month || !col.day) {
      setWarningMessage(`Por favor, defina o Mês (MM) e o Dia (DD) no topo da Coluna ${colIndex + 1} antes de lançar a frequência.`);
      return;
    }
    
    setWarningMessage(null); // Clear any previous warning
    const day = col.day;
    const month = col.month;
    const dateStr = `2026-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    if (col.id) {
      const existingSession = subjectSessions.find(s => s.id === col.id);
      if (existingSession) {
        saveAttendanceSession({
          ...existingSession,
          records: {
            ...existingSession.records,
            [studentId]: value
          }
        });
      }
    } else {
      const records: { [studentId: string]: 'P' | 'F' } = {};
      classStudents.forEach(std => {
        records[std.id] = std.id === studentId ? value : 'P';
      });
      addAttendanceSession({
        subjectId: targetSubject.id,
        classId: targetClass.id,
        teacherId: currentUser?.id || 'admin',
        date: dateStr,
        lessonsCount: 1,
        topic: `AULA ${colIndex + 1}`,
        records
      });
    }
    setSaveStatus('unsaved');
  };

  const handleToggleLessons = (colIndex: number) => {
    if (isLocked) return;
    const col = cols[colIndex];
    if (!col.id) return;
    
    const existingSession = subjectSessions.find(s => s.id === col.id);
    if (existingSession) {
      const nextCount = existingSession.lessonsCount === 2 ? 4 : existingSession.lessonsCount === 4 ? 1 : 2;
      saveAttendanceSession({
        ...existingSession,
        lessonsCount: nextCount
      });
    }
    setSaveStatus('unsaved');
  };

  return (
    <div id="attendance-journal-wrapper" className="space-y-4">
      {/* Journal Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-800 dark:text-white tracking-tight text-sm sm:text-base uppercase">
              Frequência: {targetSubject.name}
            </h3>
            {isLocked && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded text-[10px] font-bold flex items-center gap-1">
                <Lock className="h-3 w-3" /> FECHADO
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>Carga Horária Prevista: <strong className="text-slate-700 dark:text-slate-200">{workloadNum}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Limite de Faltas para Reprovação (25%): <strong className="text-red-600 dark:text-red-400 font-extrabold">{maxAbsencesLimit}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SAVE BUTTON */}
          <button
            type="button"
            id="save-attendance-btn"
            onClick={handleSaveAttendance}
            disabled={isLocked || saveStatus === 'saving'}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer ${
              saveStatus === 'unsaved'
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : saveStatus === 'saving'
                  ? 'bg-slate-400 text-white cursor-wait'
                  : saveStatus === 'saved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-800 text-white'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Save className="h-4 w-4" /> Salvo!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar Frequência
              </>
            )}
          </button>

          <button
            type="button"
            id="print-attendance-btn"
            onClick={() => setPrintDoc({ type: 'diario_freq' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir Frequência
          </button>
        </div>
      </div>

      {/* Top Header Information styled in grid boxes (Quadradinhos) */}
      <div className="bg-slate-50 dark:bg-slate-800/25 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-emerald-600" />
          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Cabeçalho do Diário (Quadradinhos)
          </h4>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Aulas Previstas */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Aulas Previstas</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                {aulasPrevistas.padStart(3, ' ').split('').map((char, charIdx) => (
                  <input
                    key={`previstas-char-${charIdx}`}
                    type="text"
                    maxLength={1}
                    value={char === ' ' ? '' : char}
                    disabled={isLocked}
                    onChange={(e) => {
                      const newChar = e.target.value.slice(-1);
                      const currentParts = aulasPrevistas.padStart(3, ' ').split('');
                      currentParts[charIdx] = newChar || ' ';
                      const newVal = currentParts.join('').trim();
                      setAulasPrevistas(newVal);
                      setSaveStatus('unsaved');
                    }}
                    className="w-8 h-8 text-center font-black font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-bold font-mono">H</span>
            </div>
          </div>

          {/* Aulas Dadas */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Aulas Dadas</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1">
                {aulasDadas.padStart(3, ' ').split('').map((char, charIdx) => (
                  <input
                    key={`dadas-char-${charIdx}`}
                    type="text"
                    maxLength={1}
                    value={char === ' ' ? '' : char}
                    disabled={isLocked}
                    onChange={(e) => {
                      const newChar = e.target.value.slice(-1);
                      const currentParts = aulasDadas.padStart(3, ' ').split('');
                      currentParts[charIdx] = newChar || ' ';
                      const newVal = currentParts.join('').trim();
                      setAulasDadas(newVal);
                      setSaveStatus('unsaved');
                    }}
                    className="w-8 h-8 text-center font-black font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
                  />
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-bold font-mono">H</span>
            </div>
          </div>

          {/* Início do Módulo */}
          <div className="space-y-1.5 col-span-1">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Início do Módulo</span>
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={inicioModulo}
              disabled={isLocked}
              onBlur={() => { void gravarCabecalho(); }}
              onChange={(e) => handleDateChange(e.target.value, inicioModulo, setInicioModulo)}
              className="h-8 px-2 w-[110px] text-center font-black font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
            />
          </div>

          {/* Término do Módulo */}
          <div className="space-y-1.5 col-span-1">
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Término</span>
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={terminoModulo}
              disabled={isLocked}
              onBlur={() => { void gravarCabecalho(); }}
              onChange={(e) => handleDateChange(e.target.value, terminoModulo, setTerminoModulo)}
              className="h-8 px-2 w-[110px] text-center font-black font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
            />
          </div>

          {/* SINAL DE GRAVAÇÃO DO CABEÇALHO
              Sem isto, quem preenche não tem como saber se o que digitou saiu
              deste computador. Era exatamente o buraco que fez esses campos
              sumirem sem ninguém perceber. */}
          <div className="col-span-1 flex items-end pb-1">
            {statusCabecalho === 'salvando' && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                Salvando...
              </span>
            )}
            {statusCabecalho === 'salvo' && (
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                Salvo no servidor
              </span>
            )}
            {statusCabecalho === 'erro' && (
              <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                Não salvou
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      {warningMessage && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-200/50 dark:border-red-900/35 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="font-extrabold">{warningMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMessage(null)}
            className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Save status alerts */}
      {saveStatus === 'unsaved' && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/35 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            <span className="font-extrabold">Você possui alterações não salvas no Diário de Frequência!</span>
          </div>
          <button
            type="button"
            onClick={handleSaveAttendance}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-xs"
          >
            Salvar Agora
          </button>
        </div>
      )}
      {saveStatus === 'saved' && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/35 rounded-2xl text-xs flex items-center gap-2 shadow-xs animate-fade-in">
          <span className="font-extrabold">✔ Todas as alterações de frequência foram salvas com sucesso!</span>
        </div>
      )}

      {/* Lock alert for Teachers */}
      {isLocked && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs flex items-center gap-2">
          <Lock className="h-4 w-4 flex-shrink-0 animate-pulse text-red-500" />
          <span>
            {isAutoLockedDefinitive 
              ? `Este diário de frequência está BLOQUEADO AUTOMATICAMENTE devido à data limite de fechamento (${calendarEvents.find(e => e.type === 'DEFINITIVE_CLOSING')?.date?.split('-').reverse().join('/')}).`
              : 'Este diário de frequência está FECHADO DEFINITIVAMENTE para edições. Apenas a secretaria acadêmica pode alterar as faltas.'}
          </span>
        </div>
      )}

      {/* Info notice about direct entry */}
      <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/15 text-blue-800 dark:text-blue-400 border border-blue-100/70 dark:border-blue-900/30 rounded-2xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-0.5">
            <p className="font-bold text-xs">Instruções de Lançamento (Quadradinhos)</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Como preencher:</strong> Insira o <strong className="text-slate-700 dark:text-slate-200">MÊS</strong> e o <strong className="text-slate-700 dark:text-slate-200">DIA</strong> no topo da coluna para ativar. Depois, <strong className="text-slate-700 dark:text-slate-200">clique na célula do estudante</strong> ou use o teclado (digite <strong className="text-red-600 font-extrabold">F</strong> para falta e <strong className="text-emerald-600 font-extrabold">P</strong> ou <strong className="text-slate-600 font-extrabold">.</strong> para presença). Você também pode usar a tecla <strong className="text-slate-700 dark:text-slate-200">Tab</strong> para pular para a próxima célula!
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid table with horizontal scrolling and frozen left columns */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left" style={{ minWidth: '1600px' }}>
            <thead>
              {/* Header row 1: MÊS (Month) */}
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider select-none h-10">
                <th className="py-2 px-2 w-[45px] min-w-[45px] max-w-[45px] text-center sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-750 z-20" rowSpan={2}>Nº</th>
                <th className="py-2 px-2 w-[95px] min-w-[95px] max-w-[95px] sticky left-[45px] bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-750 z-20" rowSpan={2}>Matrícula</th>
                <th className="py-2 px-3 w-[200px] min-w-[200px] max-w-[200px] sticky left-[140px] bg-slate-50 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 z-20" rowSpan={2}>Aluno(a)</th>
                
                {/* Month label col */}
                <th className="py-1 px-2 border-r border-slate-150 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/30 text-center font-black w-[60px] min-w-[60px] max-w-[60px]">MÊS</th>
                
                {/* 30 Month columns */}
                {cols.map((col, colIdx) => (
                  <th key={`h-month-${colIdx}`} className="py-1 px-0.5 border-r border-slate-150 dark:border-slate-800 text-center w-[40px]">
                    <JournalDateInput
                      placeholder="MM"
                      disabled={isLocked}
                      initialValue={col.month}
                      onSave={(val) => handleUpdateMonth(colIdx, val)}
                      title="Mês da Aula (MM)"
                    />
                  </th>
                ))}

                <th className="py-2 px-4 text-center w-[90px] min-w-[90px] max-w-[90px] border-l border-slate-150 dark:border-slate-800" rowSpan={2}>Total Faltas</th>
                <th className="py-2 px-4 text-right w-[110px] min-w-[110px] max-w-[110px]" rowSpan={2}>Frequência</th>
              </tr>

              {/* Header row 2: DIA (Day) */}
              <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider select-none h-10">
                {/* Day label col */}
                <th className="py-1 px-2 border-r border-slate-150 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/30 text-center font-black w-[60px] min-w-[60px] max-w-[60px]">DIA</th>
                
                {/* 30 Day columns */}
                {cols.map((col, colIdx) => (
                  <th key={`h-day-${colIdx}`} className="py-1 px-0.5 border-r border-slate-150 dark:border-slate-800 text-center w-[40px]">
                    <JournalDateInput
                      placeholder="DD"
                      disabled={isLocked}
                      initialValue={col.day}
                      onSave={(val) => handleUpdateDay(colIdx, val)}
                      title="Dia da Aula (DD)"
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-150 dark:divide-slate-800 font-semibold text-slate-800 dark:text-slate-200">
              {classStudents.map((stud, idx) => {
                const absStats = getStudentAbsences(stud.id, targetSubject.id);
                const isOverLimit = absStats.total > maxAbsencesLimit;
                const isTransferred = stud.classId !== targetClass.id;
                const studentGrade = grades.find(g => g.studentId === stud.id && g.classId === targetClass.id && g.subjectId === targetSubject.id);
                const isStudentInactive = studentGrade?.result === 'DISPENSADO' || studentGrade?.result === 'DESISTENTE';
                const isStudentBlockedForTeacher = currentUser?.role !== 'ADMIN' && isStudentInactive;

                return (
                  <tr key={stud.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all h-12 ${isTransferred ? 'opacity-75 bg-amber-50/10 dark:bg-amber-950/5' : ''}`}>
                    {/* Sticky left columns */}
                    <td className="py-2 px-2 text-center text-slate-400 font-mono sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-750 z-10 w-[45px] min-w-[45px] max-w-[45px]">{idx + 1}</td>
                    <td className="py-2 px-2 font-mono text-slate-500 dark:text-slate-400 sticky left-[45px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-750 z-10 w-[95px] min-w-[95px] max-w-[95px]">{stud.enrollment}</td>
                    <td className="py-2 px-3 sticky left-[140px] bg-white dark:bg-slate-900 border-r-2 border-slate-300 dark:border-slate-700 z-10 w-[200px] min-w-[200px] max-w-[200px]">
                      <div className="flex flex-col max-w-[190px] min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate" title={stud.name}>
                          {stud.name}
                        </span>
                        {isTransferred && (
                          <span className="text-[8px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider mt-0.5 leading-tight">
                            Transferido p/ {classes.find(c => c.id === stud.classId)?.name || 'outra sala'}
                          </span>
                        )}
                        {!isTransferred && studentGrade?.result === 'DISPENSADO' && (
                          <span className="text-[8px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-wider mt-0.5 leading-tight">
                            DISPENSADO
                          </span>
                        )}
                        {!isTransferred && studentGrade?.result === 'DESISTENTE' && (
                          <span className="text-[8px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider mt-0.5 leading-tight">
                            DESISTENTE
                          </span>
                        )}
                        {isOverLimit && !isTransferred && absStats.total > 0 && (
                          <span className="text-[8px] text-red-500 font-black uppercase tracking-wider mt-0.5">
                            Excedeu limite ({maxAbsencesLimit}h)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Helper separator column */}
                    <td className="py-2 border-r border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 text-center w-[60px] min-w-[60px] max-w-[60px]"></td>

                    {/* 30 attendance grid cells */}
                    {cols.map((col, colIdx) => {
                      const isAbsent = col.records[stud.id] === 'F';
                      const isDisabled = isLocked || isTransferred || isStudentBlockedForTeacher;
                      return (
                        <td key={`record-${stud.id}-${colIdx}`} className="py-1 px-0.5 border-r border-slate-150 dark:border-slate-800 text-center w-[40px]">
                          <div className="flex items-center justify-center">
                            <input
                              type="text"
                              readOnly
                              disabled={isDisabled}
                              value={isAbsent ? 'F' : '•'}
                              onKeyDown={(e) => !isDisabled && handleCellKeyDown(e, colIdx, stud.id)}
                              onClick={() => !isDisabled && handleCellClick(colIdx, stud.id)}
                              className={`w-7 h-7 text-center font-mono text-xs font-black rounded-md border outline-none focus:ring-2 transition-all select-none ${
                                isDisabled
                                  ? 'border-slate-150 bg-slate-50 text-slate-300 cursor-not-allowed dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-600'
                                  : isAbsent
                                    ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-400 focus:ring-red-500 cursor-pointer'
                                    : 'border-slate-200/80 bg-white dark:bg-slate-900 text-emerald-600 dark:border-slate-750 dark:text-emerald-400 focus:ring-emerald-500 cursor-pointer'
                              }`}
                              title={isDisabled ? "Não editável" : isAbsent ? "Falta registrada. Clique para alterar para Presença." : "Presença registrada. Clique para alterar para Falta."}
                            />
                          </div>
                        </td>
                      );
                    })}

                    {/* Stats columns at the end */}
                    {/* TOTAL DE FALTAS — EDITÁVEL, SÓ PARA A GESTÃO.
                        Era só um número na tela. As faltas vindas dos mapas
                        antigos são um TOTAL, e enquanto esse total existe o
                        sistema ignora as bolinhas de presença — então não havia
                        como abonar falta de aluno importado por lugar nenhum.
                        O professor continua sem acesso: quem abona é a
                        secretaria, e diário encerrado não se altera. */}
                    <td className="py-2 px-4 text-center w-[90px] min-w-[90px] max-w-[90px] font-black font-mono border-l border-slate-150 dark:border-slate-800">
                      {podeEditarTotalDeFaltas && targetSubject ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={absStats.total}
                          onBlur={(e) => {
                            const novoTotal = Math.max(0, Math.trunc(Number(e.target.value) || 0));
                            if (novoTotal === absStats.total) return;
                            updateStudentAbsences(stud.id, targetSubject.id, activeClassId!, novoTotal);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                          title="Total de faltas. Altere para abonar; o resultado é recalculado ao sair do campo."
                          className={`w-14 text-center font-black font-mono rounded-md border px-1 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 ${
                            absStats.total > 0
                              ? (isOverLimit ? 'border-red-400 text-red-600 dark:text-red-400' : 'border-amber-300 text-amber-600 dark:text-amber-400')
                              : 'border-slate-200 text-slate-400 dark:border-slate-700'
                          }`}
                        />
                      ) : (
                        <span className={absStats.total > 0 ? (isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400') : 'text-slate-400'}>
                          {absStats.total}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right w-[110px] min-w-[110px] max-w-[110px]">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide ${
                          absStats.frequency >= 75 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' 
                            : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                        }`}>
                          {absStats.frequency.toFixed(0)}% Pres.
                        </span>
                        {absStats.frequency < 75 && (
                          <span className="text-[8px] text-red-600 dark:text-red-400 font-extrabold tracking-tight uppercase">
                            Retido
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printing Modal */}
      {printDoc && (
        <PrintModal
          documentType={printDoc.type}
          classId={targetClass.id}
          subjectId={targetSubject.id}
          onClose={() => setPrintDoc(null)}
        />
      )}
    </div>
  );
};
