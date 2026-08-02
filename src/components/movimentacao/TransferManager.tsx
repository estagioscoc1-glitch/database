import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TransferRecord, StudentEnrollment } from '../../types/movimentacao';
import { UserRole } from '../../types';
import { getTransfers, recordTransfer, getEnrollments } from '../../services/movimentacaoStorage';
import { transferirAluno } from '../../lib/repositorios';
import { 
  ArrowLeftRight, Search, CheckCircle2, History, AlertCircle, Users, BookOpen, Layers
} from 'lucide-react';

interface TransferManagerProps {
  currentUser: string;
}

export const TransferManager: React.FC<TransferManagerProps> = ({ currentUser }) => {
  const { users, classes, courses } = useApp();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [transferType, setTransferType] = useState<'TURMA' | 'TURNO' | 'CURSO'>('TURMA');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Target Selections
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [targetShift, setTargetShift] = useState<'Manhã' | 'Tarde' | 'Noite' | 'EAD'>('Tarde');
  const [targetCourseId, setTargetCourseId] = useState<string>('');
  const [reason, setReason] = useState<string>('Solicitação do aluno por razões profissionais');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setTransfers(getTransfers());
  }, []);

  // DE ONDE VÊM OS ALUNOS DESTA TELA
  //
  // Antes, só de `getEnrollments()` — um cadastro paralelo, próprio deste
  // módulo. Aluno matriculado pelo caminho normal (Cadastros Acadêmicos ou
  // importação de planilha) nunca entrava nesse cadastro, então a lista abria
  // com "Selecione o Aluno (0)" mesmo havendo alunos matriculados. Na prática a
  // transferência não servia para ninguém.
  //
  // Agora a lista parte dos alunos de verdade e usa o registro do módulo apenas
  // como complemento, quando ele existir (traz plano financeiro, documentos).
  const enrollments = getEnrollments();
  const registrosDoModulo = enrollments.filter(e => e.status === 'ATIVA');

  const activeEnrollmentList: StudentEnrollment[] = users
    .filter(u => u.role === UserRole.STUDENT && u.active !== false)
    .map(aluno => {
      const jaExiste = registrosDoModulo.find(
        e => e.studentId === aluno.id || (!!aluno.enrollment && e.enrollmentNumber === aluno.enrollment)
      );
      if (jaExiste) return jaExiste;

      const turma = classes.find(c => c.id === aluno.classId);
      const curso = courses.find(c => c.id === (aluno.courseId || turma?.courseId));

      // Registro mínimo, montado a partir da ficha real. Só precisa do
      // suficiente para identificar o aluno e sua turma atual na transferência.
      return {
        id: `matricula_${aluno.id}`,
        enrollmentNumber: aluno.enrollment || aluno.username || aluno.id,
        studentId: aluno.id,
        studentName: aluno.name,
        studentCpf: aluno.cpf || '',
        courseId: curso?.id || '',
        courseName: curso?.name || '',
        shift: (turma?.shift as StudentEnrollment['shift']) || 'Manhã',
        classId: turma?.id || aluno.classId || '',
        className: turma?.name || '',
        semester: '',
        enrollmentDate: aluno.createdAt || '',
        status: 'ATIVA',
        financialPlan: {
          enrollmentFee: 0,
          installmentsCount: 0,
          installmentValue: 0,
          discountPercent: 0,
        },
        documentsChecklist: [],
      } as StudentEnrollment;
    });

  const filteredEnrollments = activeEnrollmentList.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.studentName.toLowerCase().includes(term) || e.enrollmentNumber.toLowerCase().includes(term);
  });

  const selectedEnrollment = activeEnrollmentList.find(e => e.studentId === selectedStudentId);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) {
      setNotification({ type: 'error', message: 'Selecione o aluno para efetuar a transferência.' });
      return;
    }
    if (!reason.trim()) {
      setNotification({ type: 'error', message: 'Informe a justificativa/motivo da transferência.' });
      return;
    }

    let record: TransferRecord;

    if (transferType === 'TURMA') {
      const targetClass = classes.find(c => c.id === targetClassId);
      if (!targetClass) {
        setNotification({ type: 'error', message: 'Selecione a nova turma de destino.' });
        return;
      }
      record = {
        id: `trf_${Date.now()}`,
        studentId: selectedEnrollment.studentId,
        studentName: selectedEnrollment.studentName,
        enrollmentNumber: selectedEnrollment.enrollmentNumber,
        transferType: 'TURMA',
        oldClassId: selectedEnrollment.classId,
        oldClassName: selectedEnrollment.className,
        newClassId: targetClass.id,
        newClassName: targetClass.code,
        reason: reason.trim(),
        transferredBy: currentUser,
        transferredAt: new Date().toISOString()
      };
    } else if (transferType === 'TURNO') {
      record = {
        id: `trf_${Date.now()}`,
        studentId: selectedEnrollment.studentId,
        studentName: selectedEnrollment.studentName,
        enrollmentNumber: selectedEnrollment.enrollmentNumber,
        transferType: 'TURNO',
        oldShift: selectedEnrollment.shift,
        newShift: targetShift,
        reason: reason.trim(),
        transferredBy: currentUser,
        transferredAt: new Date().toISOString()
      };
    } else {
      const targetCourse = courses.find(c => c.id === targetCourseId);
      if (!targetCourse) {
        setNotification({ type: 'error', message: 'Selecione o novo curso de destino.' });
        return;
      }
      record = {
        id: `trf_${Date.now()}`,
        studentId: selectedEnrollment.studentId,
        studentName: selectedEnrollment.studentName,
        enrollmentNumber: selectedEnrollment.enrollmentNumber,
        transferType: 'CURSO',
        oldCourseId: selectedEnrollment.courseId,
        oldCourseName: selectedEnrollment.courseName,
        newCourseId: targetCourse.id,
        newCourseName: targetCourse.name,
        reason: reason.trim(),
        transferredBy: currentUser,
        transferredAt: new Date().toISOString()
      };
    }

    recordTransfer(record, currentUser);
    setTransfers(getTransfers());

    // MOVER O ALUNO DE VERDADE
    //
    // `recordTransfer` grava só o histórico deste módulo. Sem o passo abaixo, o
    // aluno continuava na turma antiga em `alunos` e `matriculas` — boletim,
    // diários e chamada seguiam no lugar errado — e a tela mesmo assim dizia
    // "transferência realizada". Agora a mensagem só sai se o banco confirmar.
    const destino =
      transferType === 'TURMA' ? { turmaId: record.newClassId } :
      transferType === 'CURSO' ? { cursoId: record.newCourseId } :
      null;

    if (!destino) {
      // TURNO é característica da turma, não do aluno: não há o que mover.
      setNotification({
        type: 'error',
        message: 'Para mudar o turno, use "Transferência de Turma" e escolha uma turma do turno desejado. Só assim o aluno muda de diário.',
      });
      return;
    }

    setNotification({ type: 'success', message: 'Transferindo...' });

    transferirAluno(selectedEnrollment.studentId, destino)
      .then(resultado => {
        if (!resultado.ok) {
          setNotification({
            type: 'error',
            message: `O histórico foi registrado, mas o aluno NÃO foi movido: ${resultado.erro}`,
          });
          return;
        }
        setNotification({
          type: 'success',
          message: `${selectedEnrollment.studentName} foi transferido e já aparece nos diários da nova turma.`,
        });
        setSelectedStudentId('');
        setReason('Solicitação do aluno por razões profissionais');
      })
      .catch(err => {
        setNotification({
          type: 'error',
          message: `O histórico foi registrado, mas o aluno NÃO foi movido: ${err?.message || err}`,
        });
      });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30 text-blue-300">
              <ArrowLeftRight className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black">Transferências Acadêmicas</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Transferência de Turma, Turno ou Curso com manutenção do histórico e lista de diário.
              </p>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {notification.message}
        </div>
      )}

      {/* Main Form & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transfer Action Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          
          {/* Transfer Type Selector */}
          <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            {(['TURMA', 'TURNO', 'CURSO'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTransferType(t)}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  transferType === t
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Transferência de {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <form onSubmit={handleExecuteTransfer} className="space-y-4">
            
            {/* Student Search */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                1. Selecionar Aluno Ativo *
              </label>
              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome ou número de matrícula..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <select
                required
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
              >
                <option value="">-- Selecione o Aluno ({filteredEnrollments.length}) --</option>
                {filteredEnrollments.map(e => (
                  <option key={e.studentId} value={e.studentId}>
                    {e.studentName} (#{e.enrollmentNumber}) - {e.courseName} [{e.className} / {e.shift}]
                  </option>
                ))}
              </select>
            </div>

            {/* Current Details Display */}
            {selectedEnrollment && (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-extrabold">Situação Atual do Aluno:</p>
                <p>Curso: <strong>{selectedEnrollment.courseName}</strong> | Turma: <strong>{selectedEnrollment.className}</strong> | Turno: <strong>{selectedEnrollment.shift}</strong></p>
              </div>
            )}

            {/* Target Selection depending on type */}
            {transferType === 'TURMA' && (
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                  2. Escolher Nova Turma de Destino *
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">-- Selecione a Nova Turma --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.year}/{c.semester}</option>
                  ))}
                </select>
              </div>
            )}

            {transferType === 'TURNO' && (
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                  2. Escolher Novo Turno de Destino *
                </label>
                <select
                  required
                  value={targetShift}
                  onChange={(e) => setTargetShift(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                  <option value="EAD">EAD</option>
                </select>
              </div>
            )}

            {transferType === 'CURSO' && (
              <div>
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                  2. Escolher Novo Curso de Destino *
                </label>
                <select
                  required
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white"
                >
                  <option value="">-- Selecione o Novo Curso --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Justification */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase">
                3. Motivo / Justificativa Oficial *
              </label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe o motivo da transferência..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold text-slate-800 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ArrowLeftRight className="h-4 w-4" /> Efetivar Transferência de {transferType}
              </button>
            </div>

          </form>
        </div>

        {/* Transfer History Log */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-blue-600" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Histórico de Transferências ({transfers.length})
            </h3>
          </div>

          {transfers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma transferência registrada.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {transfers.map(trf => (
                <div
                  key={trf.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-extrabold text-slate-900 dark:text-white">{trf.studentName}</h4>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px] rounded-full">
                      {trf.transferType}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {trf.transferType === 'TURMA' && `De ${trf.oldClassName} ➔ Para ${trf.newClassName}`}
                    {trf.transferType === 'TURNO' && `De ${trf.oldShift} ➔ Para ${trf.newShift}`}
                    {trf.transferType === 'CURSO' && `De ${trf.oldCourseName} ➔ Para ${trf.newCourseName}`}
                  </p>

                  <p className="text-[10px] text-slate-500 italic">
                    "{trf.reason}"
                  </p>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                    <span>Resp: {trf.transferredBy}</span>
                    <span>{new Date(trf.transferredAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
