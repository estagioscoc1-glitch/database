/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { Printer, X, Download, ShieldCheck, FileText, Minus, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'motion/react';
import { safeLocalStorage } from '../lib/safeStorage';
import { LOGO_COLEGIO_OSWALDO_CRUZ, LOGO_COLEGIO_OSWALDO_CRUZ_SIMPLES, ASSINATURA_SECRETARIO, ASSINATURA_JEFFERSON } from '../lib/imageAssets';

interface PrintModalProps {
  documentType: 'boletim' | 'diario_notas' | 'diario_freq' | 'mapa_notas' | 'boletim_sala' | 'decl_escolaridade' | 'decl_ctransp' | 'decl_vacina' | 'historico_completo';
  studentId?: string; // For boletim
  classId: string;
  subjectId: string;
  onClose: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({ documentType, studentId, classId, subjectId, onClose }) => {
  const { 
    classes, subjects, grades, users, courses, attendance, 
    getStudentAbsences, getStudentAttendanceGrid, currentPeriod
  } = useApp();

  const printAreaRef = useRef<HTMLDivElement>(null);

  const targetStudent = studentId ? users.find(u => u.id === studentId) : null;
  const targetClass = classes.find(c => c.id === classId) 
    || (targetStudent?.classId ? classes.find(c => c.id === targetStudent.classId) : null)
    || classes.find(c => c.id === 'class_enf_m1_matutino') 
    || classes[0];
  const targetSubject = subjects.find(s => s.id === subjectId);
  const targetCourse = targetClass ? courses.find(co => co.id === targetClass.courseId) : null;
  const filteredStudents = users.filter(
    u => u.role === 'STUDENT' && (u.classId === targetClass?.id || grades.some(g => g.studentId === u.id && g.classId === targetClass?.id))
  );
  const classStudents = filteredStudents;

  const classSubjects = targetClass 
    ? subjects.filter(s => s.courseId === targetClass.courseId && s.module === targetClass.module)
    : subjects;

  const isLandscape = documentType !== 'boletim' && documentType !== 'boletim_sala' && documentType !== 'decl_escolaridade' && documentType !== 'decl_ctransp' && documentType !== 'decl_vacina' && documentType !== 'historico_completo';

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(false); // Default to true for perfect fit
  const [activePage, setActivePage] = useState(0); // Page index for multi-page frequency sheets preview
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Auto-adjust zoom to fit content perfectly in screen without scrollbars
  useEffect(() => {
    if (!isAutoFit) return;

    const handleResize = () => {
      if (!previewContainerRef.current) return;
      
      const containerWidth = previewContainerRef.current.clientWidth - 48;
      const containerHeight = previewContainerRef.current.clientHeight - 48;
      
      if (containerWidth <= 100 || containerHeight <= 100) return;
      
      const docWidth = isLandscape ? 1122.5 : 793.7;
      const docHeight = isLandscape ? 793.7 : 1122.5;
      
      const scaleWidth = containerWidth / docWidth;
      const scaleHeight = containerHeight / docHeight;
      
      let idealZoom = Math.min(scaleWidth, scaleHeight);
      // Restrict zoom limits to sane boundaries
      idealZoom = Math.max(0.4, Math.min(1.5, idealZoom));
      
      setZoom(Number(idealZoom.toFixed(2)));
    };

    // Run initially
    handleResize();

    // Set up resize listener
    window.addEventListener('resize', handleResize);
    
    // Quick polling fallback if layout loads asynchronously
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [isAutoFit, isLandscape, documentType, activePage]);

  const storageKeyInicio = targetSubject ? `oc_header_${classId}_${targetSubject.id}_inicioModulo` : '';
  const storageKeyTermino = targetSubject ? `oc_header_${classId}_${targetSubject.id}_terminoModulo` : '';
  const storageKeyPrevistas = targetSubject ? `oc_header_${classId}_${targetSubject.id}_aulasPrevistas` : '';
  const storageKeyDadas = targetSubject ? `oc_header_${classId}_${targetSubject.id}_aulasDadas` : '';

  const [inicioModulo, setInicioModulo] = useState(() => storageKeyInicio ? (safeLocalStorage.getItem(storageKeyInicio) || '') : '');
  const [terminoModulo, setTerminoModulo] = useState(() => storageKeyTermino ? (safeLocalStorage.getItem(storageKeyTermino) || '') : '');

  const subjectSessions = targetSubject 
    ? attendance
        .filter(a => a.subjectId === targetSubject.id && a.classId === classId)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  const defaultAulasDadasCount = subjectSessions.length.toString();
  const [aulasPrevistas, setAulasPrevistas] = useState(() => storageKeyPrevistas ? (safeLocalStorage.getItem(storageKeyPrevistas) || targetSubject?.workload?.toString() || '80') : '80');
  const [aulasDadas, setAulasDadas] = useState(() => storageKeyDadas ? (safeLocalStorage.getItem(storageKeyDadas) || defaultAulasDadasCount) : '0');

  // Keep safeLocalStorage in sync when edited in PrintModal
  useEffect(() => {
    if (storageKeyInicio) safeLocalStorage.setItem(storageKeyInicio, inicioModulo);
  }, [inicioModulo, storageKeyInicio]);

  useEffect(() => {
    if (storageKeyTermino) safeLocalStorage.setItem(storageKeyTermino, terminoModulo);
  }, [terminoModulo, storageKeyTermino]);

  useEffect(() => {
    if (storageKeyPrevistas) safeLocalStorage.setItem(storageKeyPrevistas, aulasPrevistas);
  }, [aulasPrevistas, storageKeyPrevistas]);

  useEffect(() => {
    if (storageKeyDadas) safeLocalStorage.setItem(storageKeyDadas, aulasDadas);
  }, [aulasDadas, storageKeyDadas]);

  useEffect(() => {
    setActivePage(0);
  }, [documentType, classId, subjectId]);

  const [colsData, setColsData] = useState(() => {
    return Array.from({ length: 90 }).map((_, index) => {
      const sess = subjectSessions[index];
      let month = '';
      let day = '';
      if (sess) {
        const parts = sess.date.split('-');
        month = parts[1] === '00' ? '' : (parts[1] || '');
        day = parts[2] === '00' ? '' : (parts[2] || '');
      }
      
      const records: { [studentId: string]: string } = {};
      classStudents.forEach(std => {
        if (sess) {
          records[std.id] = sess.records[std.id] === 'F' ? 'F' : '•';
        } else {
          records[std.id] = '•'; // Default is dot of presence
        }
      });
      
      return {
        month,
        day,
        records
      };
    });
  });

  const handleUpdateColDate = (index: number, field: 'month' | 'day', val: string) => {
    setColsData(prev => prev.map((col, idx) => {
      if (idx === index) {
        return {
          ...col,
          [field]: val
        };
      }
      return col;
    }));
  };

  const handleUpdateStudentColAttendance = (studentId: string, colIndex: number, val: string) => {
    setColsData(prev => prev.map((col, idx) => {
      if (idx === colIndex) {
        const upperVal = val.toUpperCase().trim();
        const finalChar = upperVal.includes('F') ? 'F' : '•';
        return {
          ...col,
          records: {
            ...col.records,
            [studentId]: finalChar
          }
        };
      }
      return col;
    }));
  };

  const getStudentTotalFaltas = (studentId: string) => {
    if (!targetSubject) return 0;
    return getStudentAbsences(studentId, targetSubject.id).total;
  };

  const getPageCount = () => {
    const w = parseInt(aulasPrevistas, 10) || 80;
    if (w <= 40) return 1;
    if (w <= 80) return 2;
    return 3;
  };

  const capitalizeWord = (word: string) => {
    if (!word) return '';
    const lower = word.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const formatCourseName = (name: string) => {
    if (!name) return 'Técnico em Enfermagem';
    if (name.toUpperCase().startsWith('TÉCNICO') || name.toUpperCase().startsWith('TECNICO')) {
      return name;
    }
    return `Técnico em ${name}`;
  };

  const getFormattedStartDateEscolaridade = () => {
    if (inicioModulo) {
      const parts = inicioModulo.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
        return `${parts[2]} de ${monthName}`;
      }
    }
    return currentPeriod.includes('/2') ? '03 de agosto' : '04 de fevereiro';
  };

  const getFormattedEndDateEscolaridade = () => {
    if (terminoModulo) {
      const parts = terminoModulo.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    }
    return currentPeriod.includes('/2') ? '22 de dezembro de 2026' : '26 de junho de 2026';
  };

  const getSemesterTextAutomatic = () => {
    const isSecondSemester = currentPeriod.includes('/2') || new Date().getMonth() >= 6;
    const year = currentPeriod.split('/')[0] || new Date().getFullYear().toString();
    return isSecondSemester ? `segundo semestre de ${year}` : `primeiro semestre de ${year}`;
  };

  const getFormattedDateBr = (dateStr: string, isStart: boolean) => {
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    if (isStart) {
      return currentPeriod.includes('/2') ? '03/08/2026' : '04/02/2026';
    } else {
      return currentPeriod.includes('/2') ? '22/12/2026' : '26/06/2026';
    }
  };

  // High Fidelity SVGs representing the real physical logo systems from screenshots
  /**
   * Cabeçalho das declarações.
   *
   * MESMO TAMANHO EM TODAS, POR DECISÃO DA ESCOLA.
   *
   * Este componente usava `h-16 w-auto`: altura fixa e largura só o necessário.
   * A Declaração de Escolaridade, por ser a única montada com a imagem direta,
   * usava `w-full max-h-24` — e saía visivelmente maior. Numa pilha de
   * documentos oficiais da mesma instituição, o cabeçalho mudando de tamanho
   * conforme o papel dá impressão de documento improvisado.
   *
   * Agora as três — Escolaridade, SETRANSP Passe e Vacina em Dia — usam a
   * medida da maior. `object-contain` garante que a logo não distorça.
   */
  const LogoOswaldoCruzHeader = ({ compacto = false }: { compacto?: boolean } = {}) => (
    <img
      src={LOGO_COLEGIO_OSWALDO_CRUZ}
      alt="Colégio Oswaldo Cruz"
      className={
        compacto
          // Plano B da Escolaridade: a logo divide a linha com o selo de 30
          // anos. Largura total aqui espremeria o selo até sumir.
          ? "h-16 w-auto max-w-[850px] object-contain block select-none"
          : "w-full max-h-24 max-w-[850px] object-contain block select-none"
      }
      referrerPolicy="no-referrer"
    />
  );

  const Seal30Anos = () => (
    <div className="flex flex-col items-center justify-center select-none">
      <svg viewBox="0 0 100 80" className="h-16 w-20">
        {/* Large red '30' with thick stroke */}
        <text x="25" y="46" fill="#dc2626" className="font-sans font-black italic tracking-tighter" style={{ fontSize: '52px', fontWeight: 950 }}>
          30
        </text>
        {/* 'Anos' in golden cursive */}
        <text x="35" y="60" fill="#d97706" className="font-serif font-bold italic" style={{ fontSize: '19px', fontFamily: '"Playfair Display", "Georgia", serif' }}>
          Anos
        </text>
        {/* Small gold ribbon/border beneath */}
        <path d="M 10,65 Q 50,70 90,65 L 85,73 Q 50,78 15,73 Z" fill="#ca8a04" />
        <text x="50" y="72" textAnchor="middle" fill="#ffffff" className="font-sans font-black uppercase text-[5px]" style={{ fontSize: '5px', fontWeight: 900 }}>
          Colégio Oswaldo Cruz
        </text>
      </svg>
    </div>
  );

  const JeffersonMachadoLogo = () => (
    <div className="flex flex-col items-center justify-center text-center select-none">
      <div className="h-10 w-10 rounded-full border-2 border-blue-900 flex items-center justify-center p-0.5">
        <svg viewBox="0 0 40 40" className="w-full h-full text-blue-900" fill="currentColor">
          <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M 20,8 L 13,16 L 15,28 L 25,28 L 27,16 Z" fill="currentColor" opacity="0.15" />
          <text x="20" y="24" textAnchor="middle" fill="currentColor" className="font-serif font-black text-xs">
            J
          </text>
        </svg>
      </div>
      <span className="text-[7px] font-black tracking-widest text-blue-900 mt-1 leading-none uppercase font-sans">
        JEFFERSON<br />MACHADO
      </span>
    </div>
  );

  const ColegioACWLogo = () => (
    <div className="flex items-center justify-center select-none">
      <div className="bg-blue-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded flex flex-col items-center justify-center leading-none">
        <span className="text-[5px] uppercase tracking-wider">COLÉGIO</span>
        <span className="text-[8px] font-black">ACW</span>
      </div>
    </div>
  );

  const RedStampLogo = () => (
    <div className="border border-red-600 border-dashed rounded p-1 px-1.5 text-red-600 font-bold text-[8px] uppercase tracking-widest select-none transform rotate-3">
      PRODUTO ADQUIRIDO<br />
      <span className="font-black text-[9px]">PASSE ESCOLAR</span>
    </div>
  );

  const YanSignature = () => (
    <img
      src={ASSINATURA_SECRETARIO}
      alt="Assinatura Yan Neres"
      className="w-56 h-auto object-contain block select-none"
      referrerPolicy="no-referrer"
    />
  );

  const renderHeader = (pageInfo?: string, currentStudentOverride?: any) => {
    const studentToUse = currentStudentOverride || targetStudent;
    return (
      <div className="border border-black text-black text-[10px] font-sans w-full mb-4">
        {/* Header Row 1: Logo, Title, and Academic Details */}
        <div className="flex border-b border-black">
          {/* Left Box: Official school logo — plain version, no seal (diaries,
              boletim and histórico use the plain logo; declarations use the
              full banner with the 30-year seal, see LogoOswaldoCruzHeader below) */}
          <div className="w-[180px] p-2 flex flex-col justify-center items-center text-center border-r border-black select-none font-sans">
            <img
              src={LOGO_COLEGIO_OSWALDO_CRUZ_SIMPLES}
              alt="Colégio Oswaldo Cruz"
              className="max-h-[46px] max-w-[160px] object-contain"
            />
          </div>
          
          {/* Center Box: Title */}
          <div className="flex-1 flex flex-col justify-center items-center text-center p-2 border-r border-black">
            <h1 className="text-sm font-black uppercase tracking-wider text-black">
              {['boletim', 'boletim_sala'].includes(documentType) && 'Ficha de Aproveitamento Individual'}
              {documentType === 'historico_completo' && 'Histórico Escolar Completo'}
              {(documentType === 'diario_notas' || documentType === 'diario_freq' || documentType === 'mapa_notas') && 'Ficha de Acompanhamento do Discente'}
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700">
              EDUCAÇÃO PROFISSIONAL TÉCNICO
            </p>
          </div>
          
          {/* Right Box: Academic Info */}
          <div className="w-[200px] flex flex-col text-[9px] font-bold">
            <div className="p-1 px-2 border-b border-black flex justify-between">
              <span>ANO / SEMESTRE:</span>
              <span className="font-mono">{targetClass?.year}/{targetClass?.semester}</span>
            </div>
            <div className="p-1 px-2 border-b border-black flex justify-between truncate">
              <span>Turma:</span>
              <span className="font-mono">{targetClass?.name}</span>
            </div>
            <div className="flex">
              <div className="flex-1 p-1 px-2 border-r border-black flex justify-between">
                <span>Turno:</span>
                <span className="font-mono">{targetClass?.shift === 'MATUTINO' ? '1' : targetClass?.shift === 'VESPERTINO' ? '2' : '3'}</span>
              </div>
              <div className="flex-1 p-1 px-2 flex justify-between">
                <span>Mód:</span>
                <span className="font-mono">{targetClass?.module}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Header Row 2: Sub-metadata */}
        <div className="flex text-[9px] font-bold">
          <div className="w-1/2 p-1.5 px-2 border-r border-black uppercase flex items-center justify-between">
            <span>Curso:</span>
            <span className="font-medium text-slate-800">{targetCourse?.name || 'TÉCNICO EM ENFERMAGEM'}</span>
          </div>
          <div className="w-1/2 p-1.5 px-2 uppercase flex items-center justify-between">
            {['boletim', 'boletim_sala', 'historico_completo'].includes(documentType) && studentToUse ? (
              <>
                <span>Aluno:</span>
                <span className="font-black text-slate-900">{studentToUse.enrollment} - {studentToUse.name}</span>
              </>
            ) : (
              <>
                <span>Comp. Curricular:</span>
                <span className="font-medium text-slate-800 truncate max-w-[250px]">{targetSubject?.name || 'N/A'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (['boletim', 'boletim_sala', 'historico_completo', 'decl_escolaridade', 'decl_ctransp', 'decl_vacina'].includes(documentType)) {
      return null;
    }

    return (
      <div className="mt-8 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-[9px] font-bold text-black select-none">
        <div>
          <div className="border-b border-black mx-auto w-52 mb-1"></div>
          <p className="uppercase">
            {['boletim', 'boletim_sala', 'mapa_notas'].includes(documentType) ? 'SECRETARIA ACADÊMICA' : 'Nome do Professor'}
          </p>
        </div>
        <div>
          <div className="border-b border-black mx-auto w-52 mb-1"></div>
          <p className="uppercase">
            {documentType === 'diario_notas' 
              ? 'Coordenação' 
              : documentType === 'diario_freq' 
              ? 'Assinatura do Coordenador' 
              : 'COORDENAÇÃO PEDAGÓGICA'}
          </p>
        </div>
      </div>
    );
  };

  // Print trigger
  const handlePrint = () => {
    // Create print window style overrides dynamically for perfect single page layout
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: ${isLandscape ? 'landscape' : 'portrait'};
          margin: 0 !important;
        }
        #root, .no-print {
          display: none !important;
        }
        body { 
          background: white !important; 
          color: black !important;
          font-family: 'Inter', sans-serif !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-modal-portal {
          position: static !important;
          display: block !important;
          background: transparent !important;
          backdrop-filter: none !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          width: auto !important;
          height: auto !important;
          min-height: 0 !important;
        }
        .print-modal-window {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          max-height: none !important;
          position: static !important;
          display: block !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-preview-area {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: visible !important;
          display: block !important;
          width: 100% !important;
          height: auto !important;
        }
        .print-container { 
          width: 100% !important; 
          height: auto !important;
          min-height: unset !important;
          border: none !important; 
          box-shadow: none !important; 
          margin: 0 !important; 
          padding: 0 !important; 
          zoom: 1 !important;
          transform: none !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
        }
        .print-page {
          width: ${isLandscape ? '29.7cm' : '21cm'} !important;
          height: ${isLandscape ? '21cm' : '29.7cm'} !important;
          min-height: unset !important;
          page-break-after: always;
          page-break-inside: avoid;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0.4cm 0.8cm !important;
          display: flex !important;
          flex-direction: column !important;
          background: white !important;
          color: black !important;
          border: none !important;
          box-shadow: none !important;
          zoom: 1 !important;
          transform: none !important;
        }
        .print-page:last-child {
          page-break-after: avoid;
        }
        table { page-break-inside: avoid; border-collapse: collapse !important; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }

        /* Compact margins and paddings for printing to fit on a single page */
        .print-page {
          padding: 0.4cm 0.8cm !important;
        }
        .print-container {
          padding: 0 !important;
        }
        .print-page .mb-4, .print-container .mb-4 {
          margin-bottom: 0.12cm !important;
        }
        .print-page .mt-8, .print-container .mt-8 {
          margin-top: 0.25cm !important;
        }
        .print-page .pt-6, .print-container .pt-6 {
          padding-top: 0.12cm !important;
        }
        .print-page .gap-8, .print-container .gap-8 {
          gap: 0.15cm !important;
        }
        /* Tighten table rows & spacing */
        .print-page table th, .print-page table td,
        .print-container table th, .print-container table td {
          padding-top: 1.5px !important;
          padding-bottom: 1.5px !important;
          line-height: 1 !important;
        }
        /* Tighten legends box padding */
        .print-page .p-2, .print-container .p-2 {
          padding: 4px !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    window.print();
    
    // Clean up
    document.head.removeChild(style);
  };

  const getS1Evaluations = (g: any) => {
    // Return mock partition matching total sum S1 only if no sub-grade is entered
    const hasAnyS1 = g.av1 !== null || g.av2 !== null || g.av3 !== null || g.recS1 !== null;
    if (hasAnyS1) {
      return {
        av1: g.av1 !== null ? g.av1 : 0,
        av2: g.av2 !== null ? g.av2 : 0,
        av3: g.av3 !== null ? g.av3 : 0
      };
    }
    const parts = [Math.floor(g.s1 / 3), Math.floor(g.s1 / 3), g.s1 - 2 * Math.floor(g.s1 / 3)];
    return { av1: g.av1 ?? parts[0], av2: g.av2 ?? parts[1], av3: g.av3 ?? parts[2] };
  };

  const getS2Evaluations = (g: any) => {
    const hasAnyS2 = g.av4 !== null || g.av5 !== null || g.av6 !== null || g.recS2 !== null;
    if (hasAnyS2) {
      return {
        av4: g.av4 !== null ? g.av4 : 0,
        av5: g.av5 !== null ? g.av5 : 0,
        av6: g.av6 !== null ? g.av6 : 0
      };
    }
    const parts = [Math.floor(g.s2 / 3), Math.floor(g.s2 / 3), g.s2 - 2 * Math.floor(g.s2 / 3)];
    return { av4: g.av4 ?? parts[0], av5: g.av5 ?? parts[1], av6: g.av6 ?? parts[2] };
  };

  // Split class students into chunks of 30 for pagination (fills the whole
  // printed sheet, matching the official paper forms — do not go back to 25).
  const studentChunks = (() => {
    const chunks: any[][] = [];
    const chunkSize = 30;
    for (let i = 0; i < classStudents.length; i += chunkSize) {
      chunks.push(classStudents.slice(i, i + chunkSize));
    }
    if (chunks.length === 0) {
      chunks.push([]);
    }
    return chunks;
  })();

  const totalPagesForCurrentDoc = (() => {
    if (documentType === 'boletim_sala') return classStudents.length;
    if (documentType === 'diario_freq') return getPageCount() * studentChunks.length;
    if (documentType === 'diario_notas') return studentChunks.length;
    if (documentType === 'mapa_notas') return studentChunks.length;
    return 1;
  })();

  const clampedActivePage = Math.max(0, Math.min(activePage, totalPagesForCurrentDoc - 1));

  const renderedPages = (() => {
    if (documentType === 'diario_freq') {
      const pages: any[] = [];
      const numDatePages = getPageCount();
      for (let dIndex = 0; dIndex < numDatePages; dIndex++) {
        for (let sIndex = 0; sIndex < studentChunks.length; sIndex++) {
          pages.push({
            type: 'diario_freq',
            studentChunk: studentChunks[sIndex],
            studentChunkIndex: sIndex,
            datePageIndex: dIndex,
            key: `freq-d${dIndex}-s${sIndex}`
          });
        }
      }
      return pages;
    }
    if (documentType === 'diario_notas') {
      return studentChunks.map((chunk, sIndex) => ({
        type: 'diario_notas',
        studentChunk: chunk,
        studentChunkIndex: sIndex,
        key: `notas-s${sIndex}`
      }));
    }
    if (documentType === 'mapa_notas') {
      return studentChunks.map((chunk, sIndex) => ({
        type: 'mapa_notas',
        studentChunk: chunk,
        studentChunkIndex: sIndex,
        key: `mapa-s${sIndex}`
      }));
    }
    if (documentType === 'boletim_sala') {
      return classStudents.map((student, sIdx) => ({
        type: 'boletim_sala',
        student: student,
        studentIndex: sIdx,
        key: `boletim-sala-${student.id}`
      }));
    }
    return [];
  })();

  const renderDiarioFreqPage = (page: any, pIndex: number, clampedActivePage: number) => {
    const { studentChunk, studentChunkIndex, datePageIndex } = page;
    const pageStartIndex = datePageIndex * 30;
    const pageCols = colsData.slice(pageStartIndex, pageStartIndex + 30);
    const screenHiddenClass = pIndex === clampedActivePage ? '' : 'screen-hidden';

    return (
      <div 
        key={page.key}
        className={`print-page bg-white text-slate-900 p-8 shadow-md border border-slate-200/60 rounded-sm relative text-xs flex flex-col justify-between w-[29.7cm] min-h-[21cm] shrink-0 ${screenHiddenClass}`}
      >
        <div>
          {renderHeader()}

          {targetSubject && (
            <div className="overflow-hidden mb-4">
              <table className="w-full table-fixed text-left border-collapse text-[8.5px] text-black border border-black">
                <colgroup>
                  <col style={{ width: '30px' }} />
                  <col style={{ width: '60px' }} />
                  <col />
                  <col style={{ width: '30px' }} />
                  {pageCols.map((_, index) => (
                    <col key={`col-freq-${index}`} style={{ width: '18px' }} />
                  ))}
                  <col style={{ width: '45px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[7.5px]">
                    <th className="py-1 px-1 text-center w-[30px] border-r border-black" rowSpan={3}>
                      <div className="[writing-mode:vertical-lr] rotate-180 mx-auto font-black py-1">ORDEM</div>
                    </th>
                    <th className="py-1 px-1 text-center w-[65px] border-r border-black" rowSpan={3}>Matr.</th>
                    <th className="py-1 px-2 border-r border-black min-w-[120px]" rowSpan={3}>ALUNO</th>
                    <th className="py-1 px-2 border-r border-black text-center bg-slate-50 uppercase" colSpan={7}>
                      Aulas Previstas: 
                      <input
                        type="text"
                        value={aulasPrevistas}
                        onChange={(e) => setAulasPrevistas(e.target.value)}
                        className="bg-transparent border-none text-center outline-none font-mono font-bold text-[9px] text-black w-[35px] ml-0.5 p-0 inline-block focus:bg-blue-50/50"
                      />h
                    </th>
                    <th className="py-1 px-2 border-r border-black text-center bg-slate-50 uppercase" colSpan={8}>
                      Aulas Dadas: 
                      <input
                        type="text"
                        value={aulasDadas}
                        onChange={(e) => setAulasDadas(e.target.value)}
                        className="bg-transparent border-none text-center outline-none font-mono font-bold text-[9px] text-black w-[30px] ml-0.5 p-0 inline-block focus:bg-blue-50/50"
                      />h
                    </th>
                    <th className="py-1 px-2 border-r border-black text-center bg-slate-50 uppercase" colSpan={8}>
                      Início: 
                      <input
                        type="text"
                        placeholder="__/__/____"
                        value={inicioModulo}
                        onChange={(e) => setInicioModulo(e.target.value)}
                        className="bg-transparent border-none text-center outline-none font-mono font-bold text-[9px] text-black w-[75px] ml-1 p-0 inline-block focus:bg-blue-50/50"
                      />
                    </th>
                    <th className="py-1 px-2 border-r border-black text-center bg-slate-50 uppercase" colSpan={8}>
                      Término: 
                      <input
                        type="text"
                        placeholder="__/__/____"
                        value={terminoModulo}
                        onChange={(e) => setTerminoModulo(e.target.value)}
                        className="bg-transparent border-none text-center outline-none font-mono font-bold text-[9px] text-black w-[75px] ml-1 p-0 inline-block focus:bg-blue-50/50"
                      />
                    </th>
                    <th className="py-1 px-1 text-center w-[45px] border-r border-black" rowSpan={3}>
                      <div className="[writing-mode:vertical-lr] rotate-180 mx-auto font-black py-1">Total de Faltas</div>
                    </th>
                  </tr>
                  
                  <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[7px] text-center">
                    <th className="py-0.5 px-1 border-r border-black font-black w-[30px] bg-gray-200/40 text-center">MÊS</th>
                    {pageCols.map((col, index) => (
                      <th key={`month-${index}`} className="py-0.5 border-r border-black font-mono text-[7.5px] w-[18px] h-[18px] p-0">
                        <input
                          type="text"
                          maxLength={2}
                          value={col.month}
                          onChange={(e) => handleUpdateColDate(pageStartIndex + index, 'month', e.target.value)}
                          className="w-full h-full bg-transparent text-center font-bold font-mono border-none outline-none p-0 m-0 text-black text-[7.5px] min-w-0"
                        />
                      </th>
                    ))}
                  </tr>

                  <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[7px] text-center">
                    <th className="py-0.5 px-1 border-r border-black font-black w-[30px] bg-gray-200/40 text-center">DIA</th>
                    {pageCols.map((col, index) => (
                      <th key={`day-${index}`} className="py-0.5 border-r border-black font-mono text-[7.5px] w-[18px] h-[18px] p-0">
                        <input
                          type="text"
                          maxLength={2}
                          value={col.day}
                          onChange={(e) => handleUpdateColDate(pageStartIndex + index, 'day', e.target.value)}
                          className="w-full h-full bg-transparent text-center font-bold font-mono border-none outline-none p-0 m-0 text-black text-[7.5px] min-w-0"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-semibold text-[8px] text-black">
                  {Array.from({ length: 30 }).map((_, idx) => {
                    const std = studentChunk[idx];
                    const globalIdx = studentChunkIndex * 30 + idx;
                    
                    if (std) {
                      return (
                        <tr key={std.id} className={`hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50 ${std.classId !== classId ? 'opacity-75' : ''}`}>
                          <td className="py-0.5 text-center border-r border-black font-mono text-gray-500">{globalIdx + 1}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{std.enrollment}</td>
                          <td className="py-0.5 px-2 border-r border-black font-bold max-w-[120px] truncate">{std.name}{std.classId !== classId ? ' (T)' : ''}</td>
                          <td className="py-0.5 border-r border-black bg-gray-50 text-center"></td>
                          {pageCols.map((col, index) => {
                            const isAbsent = col.records[std.id] === 'F';
                            return (
                              <td key={`record-${std.id}-${index}`} className={`p-0 text-center border-r border-black h-[18px] w-[18px] ${isAbsent ? 'bg-red-50/20' : ''}`}>
                                <input
                                  type="text"
                                  maxLength={1}
                                  value={col.records[std.id] || '•'}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleUpdateStudentColAttendance(std.id, pageStartIndex + index, e.target.value)}
                                  className={`w-full h-full bg-transparent text-center font-mono text-[9px] font-black border-none outline-none p-0 m-0 focus:bg-blue-50/50 min-w-0 ${isAbsent ? 'text-red-600' : 'text-gray-400'}`}
                                />
                              </td>
                            );
                          })}
                          <td className="py-0.5 text-center font-black font-mono text-red-600 bg-red-50/20 border-r border-black text-[9px]">
                            {getStudentTotalFaltas(std.id)}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={`empty-row-${idx}`} className="h-[18px] text-black odd:bg-white even:bg-gray-100/50">
                          <td className="py-0.5 text-center border-r border-black font-mono text-gray-400">{globalIdx + 1}</td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black bg-gray-50"></td>
                          {pageCols.map((_, index) => (
                            <td key={`record-pad-${idx}-${index}`} className="py-0.5 border-r border-black text-gray-300 font-mono text-[6px] p-0 h-[18px]">
                              <input
                                type="text"
                                maxLength={1}
                                defaultValue="."
                                className="w-full h-full bg-transparent text-center font-mono text-[6px] border-none outline-none p-0 m-0 text-gray-300 min-w-0"
                                disabled
                              />
                            </td>
                          ))}
                          <td className="py-0.5 border-r border-black"></td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {renderFooter()}
      </div>
    );
  };

  const renderDiarioNotasPage = (page: any, pIndex: number, clampedActivePage: number) => {
    const { studentChunk, studentChunkIndex } = page;
    const screenHiddenClass = pIndex === clampedActivePage ? '' : 'screen-hidden';

    return (
      <div 
        key={page.key}
        className={`print-page bg-white text-slate-900 p-8 shadow-md border border-slate-200/60 rounded-sm relative text-xs flex flex-col w-[29.7cm] min-h-[21cm] shrink-0 ${screenHiddenClass}`}
      >
        <div>
          {renderHeader()}

          {targetSubject && (
            <div className="overflow-hidden mb-4">
              <table className="w-full table-fixed text-[9px] text-left border-collapse text-black border border-black">
                <colgroup>
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '65px' }} />
                  <col />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '30px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '35px' }} />
                  <col style={{ width: '45px' }} />
                  <col style={{ width: '85px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[8px]">
                    <th className="py-0.5 px-1.5 text-center border-r border-black w-[35px]" rowSpan={2}>
                      <div className="[writing-mode:vertical-lr] rotate-180 mx-auto font-black py-1">ORDEM</div>
                    </th>
                    <th className="py-0.5 px-1.5 text-center border-r border-black w-[65px]" rowSpan={2}>Matr.</th>
                    <th className="py-0.5 px-2 border-r border-black" rowSpan={2}>ALUNO</th>
                    <th className="py-0.5 text-center border-r border-black uppercase text-[8px] bg-slate-50" colSpan={5}>
                      Aulas Previstas: <span className="font-mono">{targetSubject.workload || '0'}</span>
                    </th>
                    <th className="py-0.5 text-center border-r border-black uppercase text-[8px] bg-slate-50" colSpan={5}>
                      Aulas Dadas: <span className="font-mono">{attendance.filter(a => a.subjectId === targetSubject.id).length || '0'}</span>
                    </th>
                    <th className="py-0.5 text-center border-r border-black uppercase text-[8px] bg-slate-50" colSpan={6}>
                      Período: <span className="font-mono">{targetClass?.year}/{targetClass?.semester}</span>
                    </th>
                  </tr>
                  <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[7.5px] text-center">
                    <th className="py-0.5 border-r border-black w-[35px]">AV1</th>
                    <th className="py-0.5 border-r border-black w-[35px]">AV2</th>
                    <th className="py-0.5 border-r border-black w-[35px]">AV3</th>
                    <th className="py-0.5 border-r border-black w-[35px]">REC</th>
                    <th className="py-0.5 border-r border-black w-[35px] bg-gray-200/50 font-black">S1</th>
                    <th className="py-0.5 border-r border-black w-[35px]">AV4</th>
                    <th className="py-0.5 border-r border-black w-[35px]">AV5</th>
                    <th className="py-0.5 border-r border-black w-[35px]">AV6</th>
                    <th className="py-0.5 border-r border-black w-[35px]">REC</th>
                    <th className="py-0.5 border-r border-black w-[35px] bg-gray-200/50 font-black">S2</th>
                    <th className="py-0.5 border-r border-black w-[35px]">Extra</th>
                    <th className="py-0.5 border-r border-black w-[30px]">CS</th>
                    <th className="py-0.5 border-r border-black w-[35px]">AFC</th>
                    <th className="py-0.5 border-r border-black w-[35px] bg-blue-50/50 font-black">PF</th>
                    <th className="py-0.5 border-r border-black w-[45px] font-black">Conceito</th>
                    <th className="py-0.5 px-2 font-black text-right border-r border-black">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-semibold text-[8.5px] text-black">
                  {Array.from({ length: Math.max(30, studentChunk.length) }).map((_, idx) => {
                    const std = studentChunk[idx];
                    const globalIdx = studentChunkIndex * 30 + idx;
                    const grade = std ? grades.find(g => g.studentId === std.id && g.subjectId === targetSubject.id) : null;

                    if (std) {
                      const s1Part = grade ? getS1Evaluations(grade) : { av1: 0, av2: 0, av3: 0 };
                      const s2Part = grade ? getS2Evaluations(grade) : { av4: 0, av5: 0, av6: 0 };

                      return (
                        <tr key={std.id} className={`h-[21px] hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50 ${std.classId !== classId ? 'opacity-75' : ''}`}>
                          <td className="py-0.5 text-center border-r border-black font-mono text-gray-500">{globalIdx + 1}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{std.enrollment}</td>
                          <td className="py-0.5 px-2 border-r border-black font-bold max-w-[140px] truncate">{std.name}{std.classId !== classId ? ' (Transferido)' : ''}</td>

                          <td className="py-0.5 text-center border-r border-black font-mono">{grade ? s1Part.av1.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade ? s1Part.av2.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade ? s1Part.av3.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade && grade.recS1 !== null ? grade.recS1.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-black font-mono bg-gray-200/40">{grade ? grade.s1.toFixed(1) : '-'}</td>

                          <td className="py-0.5 text-center border-r border-black font-mono">{grade ? s2Part.av4.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade ? s2Part.av5.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade ? s2Part.av6.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade && grade.recS2 !== null ? grade.recS2.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-black font-mono bg-gray-200/40">{grade ? grade.s2.toFixed(1) : '-'}</td>

                          <td className="py-0.5 text-center border-r border-black font-mono">{grade && grade.extra !== null ? grade.extra.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade && grade.conselho !== null ? grade.conselho.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-mono">{grade && grade.afc !== null ? grade.afc.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-black font-mono bg-blue-50/40 text-blue-955">{grade ? grade.pf.toFixed(1) : '-'}</td>
                          <td className="py-0.5 text-center border-r border-black font-black text-[9px]">{grade ? grade.concept : '-'}</td>
                          <td className={`py-0.5 px-2 text-right border-r border-black font-black ${grade?.result?.includes('APTO') ? 'text-emerald-700' : grade?.result === 'DISPENSADO' ? 'text-purple-700' : grade?.result === 'DESISTENTE' ? 'text-slate-600' : 'text-red-600'}`}>
                            {/* "F. NOTA" É IMPRESSO COMO "NÃO APTO", NÃO COMO "REP. FALTAS".
                                O documento traduzia toda situação de nota faltando para
                                "REP. FALTAS" — em cinco lugares. Saía reprovado por falta
                                em linha com ZERO faltas, o que é informação errada num
                                papel que a escola entrega ao aluno. Reprovação por falta é
                                calculada pela frequência e continua aparecendo quando é o
                                caso; o que muda é parar de chamar nota faltando de falta. */}
                            {grade ? (grade.result === 'F. NOTA' ? 'NÃO APTO' : grade.result) : 'Pendente'}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={`empty-row-${idx}`} className="h-[21px] text-black odd:bg-white even:bg-gray-100/50">
                          <td className="py-0.5 text-center border-r border-black font-mono text-gray-400">{globalIdx + 1}</td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black bg-gray-200/40"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black bg-gray-200/40"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 border-r border-black bg-blue-50/40"></td>
                          <td className="py-0.5 border-r border-black"></td>
                          <td className="py-0.5 px-2 border-r border-black"></td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-[8px] font-bold text-black mt-2 leading-relaxed">
            Legenda: S1 - Somatório de Notas 1; S2 - Somatório de Notas 2; REC - Recuperação
          </div>
        </div>

        {renderFooter()}
      </div>
    );
  };

  const renderMapaNotasPage = (page: any, pIndex: number, clampedActivePage: number) => {
    const { studentChunk, studentChunkIndex } = page;
    const pageInfoLabel = `Mapa - Alunos ${studentChunkIndex * 30 + 1} a ${Math.min((studentChunkIndex + 1) * 30, classStudents.length)}`;
    const screenHiddenClass = pIndex === clampedActivePage ? '' : 'screen-hidden';

    return (
      <div 
        key={page.key}
        className={`print-page bg-white text-slate-900 p-8 shadow-md border border-slate-200/60 rounded-sm relative text-xs flex flex-col justify-between w-[29.7cm] min-h-[21cm] shrink-0 ${screenHiddenClass}`}
      >
        <div>
          {renderHeader(pageInfoLabel)}

          <div className="overflow-hidden mb-4">
            <table className="w-full table-fixed text-left border-collapse text-[9px] text-black border border-black">
              <colgroup>
                <col style={{ width: '35px' }} />
                <col style={{ width: '65px' }} />
                <col />
                {classSubjects.map(sub => (
                  <col key={`col-map-${sub.id}`} style={{ width: '70px' }} />
                ))}
                <col style={{ width: '70px' }} />
                <col style={{ width: '70px' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[8px] text-center">
                  <th className="py-1.5 px-1.5 w-[35px] border-r border-black">Nº</th>
                  <th className="py-1.5 px-1.5 w-[65px] border-r border-black">Matr.</th>
                  <th className="py-1.5 px-2 border-r border-black text-left">ALUNO</th>
                  {classSubjects.map(sub => (
                    <th key={sub.id} className="py-1.5 px-1 border-r border-black font-bold leading-none max-w-[65px] truncate">
                      {sub.name}
                    </th>
                  ))}
                  <th className="py-1.5 px-2 text-right border-r border-black font-bold w-[70px]">Média PF</th>
                  <th className="py-1.5 px-2 text-right font-bold w-[70px] border-r border-black">Faltas Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-semibold text-[8.5px] text-black">
                {Array.from({ length: Math.max(30, studentChunk.length) }).map((_, idx) => {
                  const std = studentChunk[idx];
                  const globalIdx = studentChunkIndex * 30 + idx;

                  if (std) {
                    let totalGradesSum = 0;
                    let count = 0;
                    let totalAbsences = 0;

                    return (
                      <tr key={std.id} className={`hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50 ${std.classId !== classId ? 'opacity-75' : ''}`}>
                        <td className="py-1 text-center border-r border-black font-mono text-gray-500">{globalIdx + 1}</td>
                        <td className="py-1 text-center border-r border-black font-mono">{std.enrollment}</td>
                        <td className="py-1 px-2 border-r border-black font-bold max-w-[130px] truncate">{std.name}{std.classId !== classId ? ' (Transferido)' : ''}</td>
                        {classSubjects.map(sub => {
                          const score = grades.find(g => g.studentId === std.id && g.subjectId === sub.id);
                          const absences = getStudentAbsences(std.id, sub.id);
                          totalAbsences += absences.total;
                          if (score) {
                            totalGradesSum += score.pf;
                            count++;
                          }
                          return (
                            <td key={sub.id} className="py-1 text-center border-r border-black font-mono">
                              {score ? `${score.pf.toFixed(0)} (${score.concept})` : '-'}
                            </td>
                          );
                        })}
                        <td className="py-1 px-2 text-right border-r border-black font-black text-blue-900 bg-blue-50/20 font-mono">
                          {count > 0 ? (totalGradesSum / count).toFixed(1) : '0.0'}
                        </td>
                        <td className="py-1 px-2 text-right font-mono text-red-600 font-bold border-r border-black">
                          {totalAbsences}
                        </td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={`empty-row-${idx}`} className="h-[20px] text-black odd:bg-white even:bg-gray-100/50">
                        <td className="py-1 text-center border-r border-black font-mono text-gray-400">{globalIdx + 1}</td>
                        <td className="py-1 border-r border-black"></td>
                        <td className="py-1 border-r border-black"></td>
                        {classSubjects.map(sub => (
                          <td key={`sub-empty-${idx}-${sub.id}`} className="py-1 border-r border-black"></td>
                        ))}
                        <td className="py-1 border-r border-black bg-blue-50/20"></td>
                        <td className="py-1 border-r border-black"></td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>

          <div className="border border-black p-2 bg-gray-50 rounded-sm text-[8px] text-black leading-relaxed font-semibold">
            <span className="font-bold uppercase mr-1">Legendas & Regras Institucionais:</span>
            S1 = Somatório de Notas S1 (AV1 + AV2 + AV3), S2 = Somatório de Notas S2 (AV4 + AV5 + AV6), PF = Pontuação Final.
            <br />
            <span className="font-bold">Critério de Conceito:</span> D = 0 a 59 (Insuficiente) | C = 60 a 75 (Regular) | B = 76 a 85 (Bom) | A = 86 a 100 (Excelente).
            <br />
            <span className="font-bold">Frequência mínima exigida:</span> 75% de presença nas aulas dadas. Abaixo disso, o aluno é retido por faltas (Resultado: REPROVADO).
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  };

  const renderBoletimSalaPage = (page: any, pIndex: number, clampedActivePage: number) => {
    const { student, studentIndex } = page;
    const screenHiddenClass = pIndex === clampedActivePage ? '' : 'screen-hidden';

    return (
      <div 
        key={page.key}
        className={`print-page bg-white text-slate-900 p-8 shadow-md border border-slate-200/60 rounded-sm relative text-xs flex flex-col justify-between w-[21cm] min-h-[29.7cm] shrink-0 ${screenHiddenClass}`}
      >
        <div>
          {renderHeader(undefined, student)}

          <div className="overflow-hidden mb-4">
            <table className="w-full table-fixed text-left border-collapse text-[10px] text-black border border-black">
              <colgroup>
                <col />
                <col style={{ width: '50px' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '40px' }} />
                <col style={{ width: '40px' }} />
                <col style={{ width: '50px' }} />
                <col style={{ width: '60px' }} />
                <col style={{ width: '65px' }} />
                <col style={{ width: '85px' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[9px]">
                  <th className="py-1.5 px-2 border-r border-black">Disciplinas</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px]">S1</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px]">S2</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px]">AFC</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[40px]">EX</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[40px]">CS</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px] bg-gray-50 font-bold">PF</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[60px]">Faltas</th>
                  <th className="py-1.5 px-1.5 text-center border-r border-black w-[65px] font-bold">Conceito</th>
                  <th className="py-1.5 px-2 text-right w-[85px] font-bold border-r border-black">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black font-medium text-[9px]">
                {classSubjects.map((sub) => {
                  const score = grades.find(g => g.studentId === student.id && g.subjectId === sub.id && (targetClass ? g.classId === targetClass.id : true)) || grades.find(g => g.studentId === student.id && g.subjectId === sub.id);
                  const absences = getStudentAbsences(student.id, sub.id);
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50">
                      <td className="py-1.5 px-2 border-r border-black font-bold">{sub.name}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score ? score.s1.toFixed(1) : '0.0'}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score ? score.s2.toFixed(1) : '0.0'}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score?.afc ? score.afc.toFixed(1) : '0.0'}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score?.extra !== null && score?.extra !== undefined ? score.extra.toFixed(1) : '-'}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score?.conselho !== null && score?.conselho !== undefined ? score.conselho.toFixed(1) : '-'}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-black font-mono bg-gray-50">{score ? score.pf.toFixed(1) : '0.0'}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{absences.total}</td>
                      <td className="py-1.5 px-1.5 text-center border-r border-black font-black">{score ? score.concept : 'D'}</td>
                      <td className={`py-1.5 px-2 text-right border-r border-black font-black text-[9px] ${score?.result?.includes('APTO') ? 'text-emerald-700' : score?.result === 'DISPENSADO' ? 'text-purple-700' : score?.result === 'DESISTENTE' ? 'text-slate-600' : 'text-red-600'}`}>
                        {score ? (score.result === 'F. NOTA' ? 'NÃO APTO' : score.result) : 'Pendente'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border border-black p-2 bg-gray-50 rounded-sm text-[8px] text-black leading-relaxed font-semibold">
            <span className="font-bold uppercase mr-1">Legendas & Regras Institucionais:</span>
            S1 = Somatório de Notas S1 (AV1 + AV2 + AV3), S2 = Somatório de Notas S2 (AV4 + AV5 + AV6), PF = Pontuação Final.
            <br />
            <span className="font-bold">Critério de Conceito:</span> D = 0 a 59 (Insuficiente) | C = 60 a 75 (Regular) | B = 76 a 85 (Bom) | A = 86 a 100 (Excelente).
            <br />
            <span className="font-bold">Frequência mínima exigida:</span> 75% de presença nas aulas dadas. Abaixo disso, o aluno é retido por faltas (Resultado: REPROVADO).
          </div>
        </div>

        {renderFooter()}
      </div>
    );
  };

  if (isMinimized) {
    return createPortal(
      <div className="fixed bottom-4 right-4 bg-slate-950 text-white rounded-xl shadow-2xl p-3 px-4 flex items-center gap-4 z-50 border border-slate-800 cursor-pointer hover:bg-slate-900 transition-all no-print select-none animate-bounce">
        <div className="flex items-center gap-2" onClick={() => setIsMinimized(false)}>
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
          <FileText className="h-4 w-4 text-blue-400" />
          <div className="text-xs">
            <p className="font-bold">Janela de Impressão Minimizada</p>
            <p className="text-[10px] text-slate-400 font-mono">
              {['boletim', 'boletim_sala'].includes(documentType) && 'Boletim Escolar'}
              {documentType === 'diario_notas' && 'Diário de Notas'}
              {documentType === 'diario_freq' && 'Diário de Frequência'}
              {documentType === 'mapa_notas' && 'Mapa de Notas'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
          <button
            onClick={() => setIsMinimized(false)}
            title="Restaurar Janela"
            className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-all"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Fechar"
            className="p-1 hover:bg-red-600 hover:text-white rounded text-slate-300 transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print-modal-portal overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden border border-slate-300 dark:border-slate-800 transition-all duration-200 print-modal-window ${
          isMaximized 
            ? 'fixed inset-0 w-screen h-screen rounded-none max-h-screen z-50' 
            : 'w-full max-w-6xl rounded-xl h-[85vh] max-h-[85vh]'
        }`}
      >
        {/* OS style Title Bar */}
        <div className="px-4 py-2 flex items-center justify-between bg-slate-100 dark:bg-slate-800 select-none border-b border-slate-200 dark:border-slate-700 no-print">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-700 dark:text-blue-400" />
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 font-mono truncate max-w-[400px] sm:max-w-[600px]">
              {documentType === 'boletim' && `[Janela de Impressão] Ficha de Aproveitamento Individual - ${targetStudent?.name || ''}`}
              {documentType === 'boletim_sala' && `[Janela de Impressão] Ficha de Aproveitamento Individual (Toda a Turma) - ${targetClass?.name || ''}`}
              {documentType === 'diario_notas' && `[Janela de Impressão] Diário de Notas - ${targetSubject?.name || ''}`}
              {documentType === 'diario_freq' && `[Janela de Impressão] Diário de Frequência - ${targetSubject?.name || ''}`}
              {documentType === 'mapa_notas' && `[Janela de Impressão] Mapa de Notas - ${targetClass?.name || ''}`}
              {documentType === 'decl_escolaridade' && `[Janela de Impressão] Declaração de Escolaridade - ${targetStudent?.name || ''}`}
              {documentType === 'decl_ctransp' && `[Janela de Impressão] Declaração de SETRANSP Passe - ${targetStudent?.name || ''}`}
              {documentType === 'decl_vacina' && `[Janela de Impressão] Declaração de Vacina - ${targetStudent?.name || ''}`}
            </span>
          </div>
          
          {/* Windows-like OS controls */}
          <div className="flex items-center">
            {/* Minimizar */}
            <button
              onClick={() => setIsMinimized(true)}
              title="Minimizar"
              className="p-1 px-3.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all flex items-center justify-center h-8"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            {/* Maximizar / Restaurar */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Restaurar" : "Maximizar"}
              className="p-1 px-3.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all flex items-center justify-center h-8"
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
            {/* Fechar */}
            <button
              onClick={onClose}
              title="Fechar"
              className="p-1 px-4 hover:bg-red-600 hover:text-white text-slate-600 dark:text-slate-400 transition-all flex items-center justify-center h-8"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Toolbar (Word/PDF like) */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900 select-none no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-md hover:shadow-lg transition-all cursor-pointer animate-pulse"
            >
              <Printer className="h-4 w-4" /> Imprimir Documento
            </button>
            
            <span className="text-slate-300 dark:text-slate-700 font-light hidden sm:inline">|</span>
            
            {/* Orientation info */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span className="font-bold">Formato:</span>
              <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono">
                {isLandscape ? 'A4 Paisagem' : 'A4 Retrato'}
              </span>
            </div>

            {/* Page switcher for multi-page documents */}
            {totalPagesForCurrentDoc > 1 && (
              <>
                <span className="text-slate-300 dark:text-slate-700 font-light hidden md:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-bold hidden md:inline">
                    Visualizar Página:
                  </span>
                  {totalPagesForCurrentDoc > 12 ? (
                    <select
                      value={clampedActivePage}
                      onChange={(e) => setActivePage(Number(e.target.value))}
                      className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300/30 dark:border-slate-700/30 rounded-lg text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: totalPagesForCurrentDoc }).map((_, pIndex) => {
                        let label = `Página ${pIndex + 1}`;
                        if (documentType === 'boletim_sala') {
                          label = `${pIndex + 1}. ${classStudents[pIndex]?.name || ''}`;
                        } else if (documentType === 'diario_freq') {
                          const numDatePages = getPageCount();
                          const sChunksCount = studentChunks.length;
                          const dIndex = Math.floor(pIndex / sChunksCount);
                          const sIndex = pIndex % sChunksCount;
                          label = `Dias ${(dIndex * 30) + 1}-${(dIndex + 1) * 30} | Alunos ${sIndex * 30 + 1}-${Math.min((sIndex + 1) * 30, classStudents.length)}`;
                        } else if (documentType === 'diario_notas' || documentType === 'mapa_notas') {
                          label = `Alunos ${pIndex * 30 + 1}-${Math.min((pIndex + 1) * 30, classStudents.length)}`;
                        }
                        return (
                          <option key={pIndex} value={pIndex}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/40 dark:border-slate-700/40 flex-wrap">
                      {Array.from({ length: totalPagesForCurrentDoc }).map((_, pIndex) => (
                        <button
                          key={`page-btn-${pIndex}`}
                          type="button"
                          onClick={() => setActivePage(pIndex)}
                          className={`px-2.5 py-0.5 text-[10px] font-black rounded transition-all cursor-pointer ${
                            clampedActivePage === pIndex
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {pIndex + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <span className="text-xs text-slate-500 font-medium mr-1 hidden xs:inline">Zoom:</span>
            <button
              onClick={() => {
                setZoom(prev => Math.max(0.4, Number((prev - 0.05).toFixed(2))));
                setIsAutoFit(false);
              }}
              title="Diminuir Zoom"
              disabled={zoom <= 0.4}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                setZoom(prev => Math.min(1.5, Number((prev + 0.05).toFixed(2))));
                setIsAutoFit(false);
              }}
              title="Aumentar Zoom"
              disabled={zoom >= 1.5}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-40 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            
            {/* Quick Presets */}
            <button
              onClick={() => setIsAutoFit(true)}
              className={`ml-1 text-[10px] font-black px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                isAutoFit 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10' 
                  : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Ajustar automaticamente o zoom para caber na tela sem rolagem"
            >
              Ajustar à Tela
            </button>
            <button
              onClick={() => {
                setZoom(1.0);
                setIsAutoFit(false);
              }}
              className={`text-[10px] font-black px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                zoom === 1.0 && !isAutoFit
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10'
                  : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              100%
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div 
          ref={previewContainerRef}
          className="p-6 overflow-auto bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-start flex-1 print-preview-area"
          style={{ colorScheme: 'light' }}
        >
          {/* Custom style to hide inactive pages on screen preview, but keep them on print */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media screen {
              .screen-hidden {
                display: none !important;
              }
            }
          ` }} />

          <div className="w-fit mx-auto shrink-0 flex flex-col items-center">
            {classStudents.length === 0 && (
              <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center max-w-md my-8 shadow-sm">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Nenhum aluno encontrado nesta turma.</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Não há alunos cadastrados ou vinculados a esta turma para exibição no documento.</p>
              </div>
            )}
            {['diario_freq', 'boletim_sala', 'diario_notas', 'mapa_notas'].includes(documentType) ? (
              <div 
                ref={printAreaRef}
                className="print-container flex flex-col gap-8 w-fit select-text animate-fade-in"
                style={{ fontFamily: '"Inter", sans-serif', zoom: zoom }}
              >
                {renderedPages.map((page, pIndex) => {
                  if (page.type === 'diario_freq') return renderDiarioFreqPage(page, pIndex, clampedActivePage);
                  if (page.type === 'diario_notas') return renderDiarioNotasPage(page, pIndex, clampedActivePage);
                  if (page.type === 'mapa_notas') return renderMapaNotasPage(page, pIndex, clampedActivePage);
                  if (page.type === 'boletim_sala') return renderBoletimSalaPage(page, pIndex, clampedActivePage);
                  return null;
                })}
              </div>
            ) : (
            <div 
              ref={printAreaRef}
              className={`print-container print-page bg-white text-slate-900 p-8 shadow-md border border-slate-200/60 rounded-sm relative text-xs flex flex-col justify-between shrink-0 ${
                isLandscape ? 'w-[29.7cm] min-h-[21cm]' : 'w-[21cm] min-h-[29.7cm]'
              }`}
              style={{ fontFamily: '"Inter", sans-serif', zoom: zoom }}
            >
              <div>
                {!['decl_escolaridade', 'decl_ctransp', 'decl_vacina'].includes(documentType) && renderHeader()}

                {/* BOLETIM TABLE */}
                {documentType === 'boletim' && targetStudent && (
                  <div className="overflow-hidden mb-4">
                    <table className="w-full table-fixed text-left border-collapse text-[10px] text-black border border-black">
                      <colgroup>
                        <col /> {/* Disciplinas */}
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '40px' }} />
                        <col style={{ width: '40px' }} />
                        <col style={{ width: '50px' }} />
                        <col style={{ width: '60px' }} />
                        <col style={{ width: '65px' }} />
                        <col style={{ width: '85px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[9px]">
                          <th className="py-1.5 px-2 border-r border-black">Disciplinas</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px]">S1</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px]">S2</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px]">AFC</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[40px]">EX</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[40px]">CS</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[50px] bg-gray-50 font-bold">PF</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[60px]">Faltas</th>
                          <th className="py-1.5 px-1.5 text-center border-r border-black w-[65px] font-bold">Conceito</th>
                          <th className="py-1.5 px-2 text-right w-[85px] font-bold border-r border-black">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black font-medium text-[9px]">
                        {classSubjects.map((sub, i) => {
                          const score = grades.find(g => g.studentId === targetStudent.id && g.subjectId === sub.id && (targetClass ? g.classId === targetClass.id : true)) || grades.find(g => g.studentId === targetStudent.id && g.subjectId === sub.id);
                          const absences = getStudentAbsences(targetStudent.id, sub.id);
                          return (
                            <tr key={sub.id} className="hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50">
                              <td className="py-1.5 px-2 border-r border-black font-bold">{sub.name}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score ? score.s1.toFixed(1) : '0.0'}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score ? score.s2.toFixed(1) : '0.0'}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score?.afc ? score.afc.toFixed(1) : '0.0'}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score?.extra !== null && score?.extra !== undefined ? score.extra.toFixed(1) : '-'}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{score?.conselho !== null && score?.conselho !== undefined ? score.conselho.toFixed(1) : '-'}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-black font-mono bg-gray-50">{score ? score.pf.toFixed(1) : '0.0'}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-mono">{absences.total}</td>
                              <td className="py-1.5 px-1.5 text-center border-r border-black font-black">{score ? score.concept : 'D'}</td>
                              <td className={`py-1.5 px-2 text-right border-r border-black font-black text-[9px] ${
                                score?.result?.includes('APTO') ? 'text-emerald-700' : score?.result === 'DISPENSADO' ? 'text-purple-700' : score?.result === 'DESISTENTE' ? 'text-slate-600' : 'text-red-600'
                              }`}>
                                {score ? (score.result === 'F. NOTA' ? 'NÃO APTO' : score.result) : 'Pendente'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* HISTÓRICO ACADÊMICO COMPLETO */}
                {documentType === 'historico_completo' && targetStudent && (() => {
                  const studentGrades = grades.filter(g => g.studentId === targetStudent.id);
                  const uniqueClassIds = Array.from(new Set(studentGrades.map(g => g.classId)));
                  const studentClasses = classes.filter(c => uniqueClassIds.includes(c.id));
                  
                  studentClasses.sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    if (a.semester !== b.semester) return a.semester - b.semester;
                    return a.module - b.module;
                  });

                  return (
                    <div className="space-y-6">
                      {studentClasses.map(cls => {
                        const classGrades = studentGrades.filter(g => g.classId === cls.id);
                        const clsSubjects = subjects.filter(s => s.courseId === cls.courseId && s.module === cls.module);

                        return (
                          <div key={cls.id} className="border border-black p-3 rounded bg-white text-black page-break-inside-avoid">
                            {/* Class Header */}
                            <div className="border-b border-black pb-1.5 mb-2 flex justify-between items-center text-[10px] font-bold">
                              <span className="font-black uppercase">
                                Turma: {cls.name} ({cls.code || 'N/A'})
                              </span>
                              <div className="space-x-3 text-slate-700">
                                <span>Ano: {cls.year}</span>
                                <span>Semestre: {cls.semester}º</span>
                                <span>Módulo: {cls.module}º</span>
                              </div>
                            </div>

                            {/* Table */}
                            <table className="w-full table-fixed text-left border-collapse text-[9px] text-black border border-black">
                              <colgroup>
                                <col /> {/* Disciplina */}
                                <col style={{ width: '45px' }} /> {/* S1 */}
                                <col style={{ width: '45px' }} /> {/* S2 */}
                                <col style={{ width: '45px' }} /> {/* AFC */}
                                <col style={{ width: '40px' }} /> {/* EX */}
                                <col style={{ width: '40px' }} /> {/* CS */}
                                <col style={{ width: '45px' }} /> {/* PF */}
                                <col style={{ width: '50px' }} /> {/* Faltas */}
                                <col style={{ width: '60px' }} /> {/* Conceito */}
                                <col style={{ width: '75px' }} /> {/* Resultado */}
                              </colgroup>
                              <thead>
                                <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[8px]">
                                  <th className="py-1 px-1.5 border-r border-black">Disciplinas</th>
                                  <th className="py-1 px-1 text-center border-r border-black">S1</th>
                                  <th className="py-1 px-1 text-center border-r border-black">S2</th>
                                  <th className="py-1 px-1 text-center border-r border-black">AFC</th>
                                  <th className="py-1 px-1 text-center border-r border-black">EX</th>
                                  <th className="py-1 px-1 text-center border-r border-black">CS</th>
                                  <th className="py-1 px-1 text-center border-r border-black font-bold bg-gray-50">PF</th>
                                  <th className="py-1 px-1 text-center border-r border-black">Faltas</th>
                                  <th className="py-1 px-1 text-center border-r border-black font-bold">Conceito</th>
                                  <th className="py-1 px-1.5 text-right font-bold w-[75px] border-r border-black">Resultado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-black font-medium text-[8.5px]">
                                {clsSubjects.map(sub => {
                                  const score = classGrades.find(g => g.subjectId === sub.id);
                                  const absences = getStudentAbsences(targetStudent.id, sub.id, cls.id);
                                  return (
                                    <tr key={sub.id} className="hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50">
                                      <td className="py-1 px-1.5 border-r border-black font-bold truncate">{sub.name}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-mono">{score ? score.s1.toFixed(1) : '0.0'}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-mono">{score ? score.s2.toFixed(1) : '0.0'}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-mono">{score?.afc ? score.afc.toFixed(1) : '0.0'}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-mono">{score?.extra !== null && score?.extra !== undefined ? score.extra.toFixed(1) : '-'}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-mono">{score?.conselho !== null && score?.conselho !== undefined ? score.conselho.toFixed(1) : '-'}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-black font-mono bg-gray-50">{score ? score.pf.toFixed(1) : '0.0'}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-mono">{absences.total}</td>
                                      <td className="py-1 px-1 text-center border-r border-black font-black">{score ? score.concept : 'D'}</td>
                                      <td className={`py-1 px-1.5 text-right border-r border-black font-black text-[8.5px] ${
                                        score?.result === 'APTO' ? 'text-emerald-700' : 'text-red-600'
                                      }`}>
                                        {score ? (score.result === 'F. NOTA' ? 'NÃO APTO' : score.result) : 'Pendente'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}

                      {/* Legends Section */}
                      <div className="border border-black p-2 bg-gray-50 rounded-sm text-[8px] text-black leading-relaxed font-semibold">
                        <span className="font-bold uppercase mr-1">Legendas & Regras Institucionais:</span>
                        S1 = Somatório de Notas S1 (AV1 + AV2 + AV3), S2 = Somatório de Notas S2 (AV4 + AV5 + AV6), PF = Pontuação Final.
                        <br />
                        <span className="font-bold">Critério de Conceito:</span> D = 0 a 59 (Insuficiente) | C = 60 a 75 (Regular) | B = 76 a 85 (Bom) | A = 86 a 100 (Excelente).
                        <br />
                        <span className="font-bold">Frequência mínima exigida:</span> 75% de presença nas aulas dadas. Abaixo disso, o aluno é retido por faltas (Resultado: REPROVADO).
                      </div>

                      {/* Signature Footer */}
                      <div className="mt-8 pt-6 border-t border-gray-300 grid grid-cols-2 gap-8 text-center text-[9px] font-bold text-black select-none page-break-inside-avoid">
                        <div>
                          <div className="border-b border-black mx-auto w-52 mb-1"></div>
                          <p className="uppercase">SECRETARIA ACADÊMICA</p>
                        </div>
                        <div>
                          <div className="border-b border-black mx-auto w-52 mb-1"></div>
                          <p className="uppercase">COORDENAÇÃO PEDAGÓGICA</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* DECLARAÇÃO DE ESCOLARIDADE */}
                {documentType === 'decl_escolaridade' && targetStudent && (
                  <div className="flex flex-col h-full justify-between min-h-[25cm] pb-24 text-black px-8">
                    <div>
                      {/* Real Image Header provided by User with fallback */}
                      <div className="flex items-center justify-center border-b border-gray-200 pb-6 mb-8 select-none">
                        <img 
                          src={LOGO_COLEGIO_OSWALDO_CRUZ} 
                          alt="Cabeçalho Colégio Oswaldo Cruz" 
                          className="w-full max-h-24 max-w-[850px] object-contain block"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full flex items-center justify-between">
                          <LogoOswaldoCruzHeader compacto />
                          <Seal30Anos />
                        </div>
                      </div>

                      <h2 className="text-center font-sans text-2xl font-black tracking-widest text-black mt-12 mb-16 select-none uppercase">
                        DECLARAÇÃO
                      </h2>

                      <div className="space-y-6 text-sm leading-relaxed text-justify mt-10">
                        <p className="leading-relaxed text-slate-800 text-justify tracking-wide text-[13px]" style={{ textIndent: '2.5rem' }}>
                          Declaramos, para os devidos fins, que o aluno <strong className="underline font-bold text-black">{targetStudent.name.toUpperCase()}</strong>, está regularmente matriculado neste estabelecimento de ensino, no curso <strong className="underline font-bold text-black">{formatCourseName(targetCourse?.name || '').toUpperCase()}</strong>, com número de matrícula <strong className="underline font-bold text-black font-mono">{targetStudent.username}</strong>. O referido aluno está matriculado no turno <strong className="underline font-bold text-black">{capitalizeWord(targetClass?.shift || 'Noturno').toUpperCase()}</strong>, com início em <strong className="underline font-bold text-black font-mono">{getFormattedStartDateEscolaridade().toUpperCase()}</strong> e término do curso na data de <strong className="underline font-bold text-black font-mono">{getFormattedEndDateEscolaridade().toUpperCase()}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="flex justify-end mr-6 select-none">
                        <p className="font-sans text-[13px] text-slate-900 font-semibold">
                          Goiânia, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                        </p>
                      </div>

                      <div className="flex justify-end pr-12 mt-12">
                        <YanSignature />
                      </div>
                    </div>

                    {/* Footer centered at the absolute bottom */}
                    <div className="absolute bottom-6 left-0 right-0 text-center text-[9px] text-slate-500 font-sans border-t border-slate-100 pt-4 leading-normal select-none">
                      <p>Rua 20, 796 – Centro Goiânia Goiás</p>
                      <p>CEP – 74020-170 – Fone e Whatsapp (62) 3223-7602</p>
                      <p className="text-blue-600 hover:underline">www.colegiooswaldocruz.com.br <span className="text-slate-500">/ E-mail: cocruz@terra.com.br</span></p>
                    </div>
                  </div>
                )}

                {/* DECLARAÇÃO DE SETRANSP PASSE */}
                {documentType === 'decl_ctransp' && targetStudent && (
                  <div className="flex flex-col h-full justify-between min-h-[25cm] pb-20 text-black px-8">
                    <div>
                      {/* Custom Header from Screenshot 3 */}
                      <div className="select-none">
                        <div className="flex items-center justify-center pb-3">
                          <LogoOswaldoCruzHeader />
                        </div>
                        <div className="border-t border-black w-full my-1"></div>
                        <div className="text-center text-[8px] font-sans text-slate-700 leading-normal mb-6">
                          Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74.020-170 "Resolução CEE/GO nº 036/2008"<br />
                          FoneFax: (0XX62) 3229-3622 Fone: (0XX62) 3223-7602 www.colegiooswaldocruz.com.br
                        </div>
                      </div>

                      <h2 className="text-center font-sans text-2xl font-black tracking-widest text-black mt-12 mb-16 select-none uppercase">
                        DECLARAÇÃO
                      </h2>

                      <div className="space-y-6 text-sm leading-relaxed text-justify mt-10">
                        <p className="leading-relaxed text-slate-800 text-justify tracking-wide text-[13px]" style={{ textIndent: '2.5rem' }}>
                          Declaramos para os fins de AQUISIÇÃO DE PASSE ESCOLAR junto SETRANSP, que <strong className="underline font-bold text-black">{targetStudent.name.toUpperCase()}</strong> é aluno (a) deste Estabelecimento de Ensino no curso de <strong className="underline font-bold text-black">{formatCourseName(targetCourse?.name || '').toUpperCase()}</strong>, com o numero de matricula <strong className="underline font-bold text-black font-mono">{targetStudent.username}</strong> com início em <strong className="underline font-bold text-black font-mono">{getFormattedDateBr(inicioModulo, true)}</strong> e término em <strong className="underline font-bold text-black font-mono">{getFormattedDateBr(terminoModulo, false)}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="flex justify-end mr-6 select-none">
                        <p className="font-sans text-[13px] text-slate-900 font-semibold">
                          Goiânia, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                        </p>
                      </div>

                      <div className="flex justify-end pr-12 mt-12">
                        <YanSignature />
                      </div>
                    </div>


                  </div>
                )}

                {/* DECLARAÇÃO DE VACINA EM DIA */}
                {documentType === 'decl_vacina' && targetStudent && (
                  <div className="flex flex-col h-full justify-between min-h-[25cm] pb-20 text-black px-8">
                    <div>
                      {/* Custom Header from Screenshot 2 */}
                      <div className="flex items-center justify-center border-b border-gray-200 pb-6 mb-8 select-none">
                        <LogoOswaldoCruzHeader />
                      </div>

                      <h2 className="text-center font-sans text-2xl font-black tracking-widest text-black mt-12 mb-16 select-none uppercase">
                        DECLARAÇÃO
                      </h2>

                      <div className="space-y-6 text-sm leading-relaxed text-justify mt-8 select-text">
                        <p className="leading-relaxed text-slate-800 text-justify tracking-wide text-[13px]" style={{ textIndent: '2.5rem' }}>
                          A Gerência de Estágios do Colégio Oswaldo Cruz, vem por intermédio desta, declarar junto à Secretaria Municipal de Saúde de desse município que o Sr (a). <strong className="underline font-bold text-black">{targetStudent.name.toUpperCase()}</strong> é aluno (a) desta instituição de ensino e está regularmente matriculado no Curso Técnico em <strong className="underline font-bold text-black">{targetCourse?.name ? targetCourse.name.toUpperCase() : 'ENFERMAGEM'}</strong>, para o <strong className="underline font-bold text-black">{getSemesterTextAutomatic().toUpperCase()}</strong>.
                        </p>
                        <p className="leading-relaxed text-slate-800 text-justify tracking-wide text-[13px]" style={{ textIndent: '2.5rem' }}>
                          Para tanto solicitamos que o aluno supracitado receba as seguintes vacinas e todas as demais que tiver disponível nessa unidade de saúde e que componha o PNI do nosso País. (Programa nacional de imunização)
                        </p>
                        
                        <div className="pl-12 pt-4 space-y-2 text-[11px] font-bold text-slate-900 tracking-wide uppercase select-none leading-none">
                          <p>COVID 19</p>
                          <p>DIFTERIA, TÉTANO, PERTUSSIS (DTPA ACELULAR);</p>
                          <p>DUPLA ADULTO (DT );</p>
                          <p>FEBRE AMARELA (FA).</p>
                          <p>H1N1</p>
                          <p>HEPATITE B;</p>
                          <p>HPV</p>
                          <p>INFLUENZA</p>
                          <p>TRÍPLICE VIRAL (TV);</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-12 mb-12">
                      <div className="flex justify-end pr-12 mt-12">
                        <img 
                          src={ASSINATURA_JEFFERSON} 
                          alt="Assinatura Jefferson Machado" 
                          className="w-56 h-auto object-contain block select-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex justify-end mr-6 select-none">
                        <p className="font-sans text-[13px] text-slate-900 font-semibold">
                          Goiânia, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* DIARIO DE NOTAS TABLE */}
                {documentType === 'diario_notas' && targetSubject && (
                  <div className="overflow-hidden mb-4">
                    <table className="w-full table-fixed text-[9px] text-left border-collapse text-black border border-black">
                      <colgroup>
                        <col style={{ width: '35px' }} />
                        <col style={{ width: '65px' }} />
                        <col /> {/* Aluno dynamically fills rest of width */}
                        <col style={{ width: '35px' }} /> {/* AV1 */}
                        <col style={{ width: '35px' }} /> {/* AV2 */}
                        <col style={{ width: '35px' }} /> {/* AV3 */}
                        <col style={{ width: '35px' }} /> {/* REC S1 */}
                        <col style={{ width: '35px' }} /> {/* S1 Total */}
                        <col style={{ width: '35px' }} /> {/* AV4 */}
                        <col style={{ width: '35px' }} /> {/* AV5 */}
                        <col style={{ width: '35px' }} /> {/* AV6 */}
                        <col style={{ width: '35px' }} /> {/* REC S2 */}
                        <col style={{ width: '35px' }} /> {/* S2 Total */}
                        <col style={{ width: '35px' }} /> {/* Extra */}
                        <col style={{ width: '30px' }} /> {/* CS */}
                        <col style={{ width: '35px' }} /> {/* AFC */}
                        <col style={{ width: '35px' }} /> {/* PF */}
                        <col style={{ width: '45px' }} /> {/* Conceito */}
                        <col style={{ width: '85px' }} /> {/* Resultado */}
                      </colgroup>
                      <thead>
                        {/* Level 1 Headers */}
                        <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[8px]">
                          <th className="py-1 px-1.5 text-center border-r border-black w-[35px]" rowSpan={2}>
                            <div className="[writing-mode:vertical-lr] rotate-180 mx-auto font-black py-1">ORDEM</div>
                          </th>
                          <th className="py-1 px-1.5 text-center border-r border-black w-[65px]" rowSpan={2}>Matr.</th>
                          <th className="py-1 px-2 border-r border-black" rowSpan={2}>ALUNO</th>
                          <th className="py-1 text-center border-r border-black uppercase text-[8px] bg-slate-50" colSpan={5}>
                            Aulas Previstas: <span className="font-mono">{targetSubject.workload || '0'}</span>
                          </th>
                          <th className="py-1 text-center border-r border-black uppercase text-[8px] bg-slate-50" colSpan={5}>
                            Aulas Dadas: <span className="font-mono">{attendance.filter(a => a.subjectId === targetSubject.id).length || '0'}</span>
                          </th>
                          <th className="py-1 text-center border-r border-black uppercase text-[8px] bg-slate-50" colSpan={6}>
                            Período: <span className="font-mono">2026/1</span>
                          </th>
                        </tr>
                        {/* Level 2 Headers */}
                        <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[7.5px] text-center">
                          <th className="py-1 border-r border-black w-[35px]">AV1</th>
                          <th className="py-1 border-r border-black w-[35px]">AV2</th>
                          <th className="py-1 border-r border-black w-[35px]">AV3</th>
                          <th className="py-1 border-r border-black w-[35px]">REC</th>
                          <th className="py-1 border-r border-black w-[35px] bg-gray-200/50 font-black">S1</th>
                          <th className="py-1 border-r border-black w-[35px]">AV4</th>
                          <th className="py-1 border-r border-black w-[35px]">AV5</th>
                          <th className="py-1 border-r border-black w-[35px]">AV6</th>
                          <th className="py-1 border-r border-black w-[35px]">REC</th>
                          <th className="py-1 border-r border-black w-[35px] bg-gray-200/50 font-black">S2</th>
                          <th className="py-1 border-r border-black w-[35px]">Extra</th>
                          <th className="py-1 border-r border-black w-[30px]">CS</th>
                          <th className="py-1 border-r border-black w-[35px]">AFC</th>
                          <th className="py-1 border-r border-black w-[35px] bg-blue-50/50 font-black">PF</th>
                          <th className="py-1 border-r border-black w-[45px] font-black">Conceito</th>
                          <th className="py-1 px-2 font-black text-right border-r border-black">Resultado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black font-semibold text-[8.5px] text-black">
                        {Array.from({ length: Math.max(15, classStudents.length) }).map((_, idx) => {
                          const std = classStudents[idx];
                          const grade = std ? grades.find(g => g.studentId === std.id && g.subjectId === targetSubject.id) : null;
                          
                          if (std) {
                            const s1Part = grade ? getS1Evaluations(grade) : { av1: 0, av2: 0, av3: 0 };
                            const s2Part = grade ? getS2Evaluations(grade) : { av4: 0, av5: 0, av6: 0 };
                            
                            return (
                              <tr key={std.id} className={`hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50 ${std.classId !== classId ? 'opacity-75' : ''}`}>
                                <td className="py-1 text-center border-r border-black font-mono text-gray-500">{idx + 1}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{std.enrollment}</td>
                                <td className="py-1 px-2 border-r border-black font-bold max-w-[140px] truncate">{std.name}{std.classId !== classId ? ' (Transferido)' : ''}</td>
                                
                                {/* S1 Grades */}
                                <td className="py-1 text-center border-r border-black font-mono">{grade ? s1Part.av1.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade ? s1Part.av2.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade ? s1Part.av3.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade && grade.recS1 !== null ? grade.recS1.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-black font-mono bg-gray-200/40">{grade ? grade.s1.toFixed(1) : '-'}</td>
                                
                                {/* S2 Grades */}
                                <td className="py-1 text-center border-r border-black font-mono">{grade ? s2Part.av4.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade ? s2Part.av5.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade ? s2Part.av6.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade && grade.recS2 !== null ? grade.recS2.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-black font-mono bg-gray-200/40">{grade ? grade.s2.toFixed(1) : '-'}</td>
                                
                                {/* Extra & Outcome */}
                                <td className="py-1 text-center border-r border-black font-mono">{grade && grade.extra !== null ? grade.extra.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade && grade.conselho !== null ? grade.conselho.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-mono">{grade && grade.afc !== null ? grade.afc.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-black font-mono bg-blue-50/40 text-blue-955">{grade ? grade.pf.toFixed(1) : '-'}</td>
                                <td className="py-1 text-center border-r border-black font-black text-[9px]">{grade ? grade.concept : '-'}</td>
                                <td className={`py-1 px-2 text-right border-r border-black font-black ${
                                  grade?.result === 'APTO' ? 'text-emerald-700' : 'text-red-600'
                                }`}>
                                  {grade ? (grade.result === 'F. NOTA' ? 'NÃO APTO' : grade.result) : 'Pendente'}
                                </td>
                              </tr>
                            );
                          } else {
                            // Completely empty padding row with only the index number
                            return (
                              <tr key={`empty-row-${idx}`} className="h-[20px] text-black odd:bg-white even:bg-gray-100/50">
                                <td className="py-1 text-center border-r border-black font-mono text-gray-400">{idx + 1}</td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black bg-gray-200/40"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black bg-gray-200/40"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 border-r border-black bg-blue-50/40"></td>
                                <td className="py-1 border-r border-black"></td>
                                <td className="py-1 px-2 border-r border-black"></td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* MAPA DE NOTAS TABLE */}
              {documentType === 'mapa_notas' && (
                <div className="overflow-hidden mb-4">
                  <table className="w-full table-fixed text-left border-collapse text-[9px] text-black border border-black">
                    <colgroup>
                      <col style={{ width: '35px' }} />
                      <col style={{ width: '65px' }} />
                      <col /> {/* Aluno dynamically fills remaining space */}
                      {classSubjects.map(sub => (
                        <col key={`col-map-${sub.id}`} style={{ width: '70px' }} />
                      ))}
                      <col style={{ width: '70px' }} /> {/* Média PF */}
                      <col style={{ width: '70px' }} /> {/* Faltas Total */}
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-black font-bold uppercase text-[8px] text-center">
                        <th className="py-1.5 px-1.5 w-[35px] border-r border-black">Nº</th>
                        <th className="py-1.5 px-1.5 w-[65px] border-r border-black">Matr.</th>
                        <th className="py-1.5 px-2 border-r border-black text-left">ALUNO</th>
                        {classSubjects.map(sub => (
                          <th key={sub.id} className="py-1.5 px-1 border-r border-black font-bold leading-none max-w-[65px] truncate">
                            {sub.name}
                          </th>
                        ))}
                        <th className="py-1.5 px-2 text-right border-r border-black font-bold w-[70px]">Média PF</th>
                        <th className="py-1.5 px-2 text-right font-bold w-[70px] border-r border-black">Faltas Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black font-semibold text-[8.5px] text-black">
                      {Array.from({ length: Math.max(15, classStudents.length) }).map((_, idx) => {
                        const std = classStudents[idx];
                        if (std) {
                          let totalGradesSum = 0;
                          let count = 0;
                          let totalAbsences = 0;
                          return (
                            <tr key={std.id} className="hover:bg-gray-50 text-black odd:bg-white even:bg-gray-100/50">
                              <td className="py-1 text-center border-r border-black font-mono text-gray-500">{idx + 1}</td>
                              <td className="py-1 text-center border-r border-black font-mono">{std.enrollment}</td>
                              <td className="py-1 px-2 border-r border-black font-bold max-w-[130px] truncate">{std.name}</td>
                              {classSubjects.map(sub => {
                                const score = grades.find(g => g.studentId === std.id && g.subjectId === sub.id);
                                const absences = getStudentAbsences(std.id, sub.id);
                                totalAbsences += absences.total;
                                if (score) {
                                  totalGradesSum += score.pf;
                                  count++;
                                }
                                return (
                                  <td key={sub.id} className="py-1 text-center border-r border-black font-mono">
                                    {score ? `${score.pf.toFixed(0)} (${score.concept})` : '-'}
                                  </td>
                                );
                              })}
                              <td className="py-1 px-2 text-right border-r border-black font-black text-blue-900 bg-blue-50/20 font-mono">
                                {count > 0 ? (totalGradesSum / count).toFixed(1) : '0.0'}
                              </td>
                              <td className="py-1 px-2 text-right font-mono text-red-600 font-bold border-r border-black">
                                {totalAbsences}
                              </td>
                            </tr>
                          );
                        } else {
                          // Pad empty row
                          return (
                            <tr key={`empty-row-${idx}`} className="h-[20px] text-black odd:bg-white even:bg-gray-100/50">
                              <td className="py-1 text-center border-r border-black font-mono text-gray-400">{idx + 1}</td>
                              <td className="py-1 border-r border-black"></td>
                              <td className="py-1 border-r border-black"></td>
                              {classSubjects.map(sub => (
                                <td key={`sub-empty-${idx}-${sub.id}`} className="py-1 border-r border-black"></td>
                              ))}
                              <td className="py-1 border-r border-black bg-blue-50/20"></td>
                              <td className="py-1 border-r border-black"></td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legends Section (Only for appropriate documents) */}
              {documentType === 'diario_notas' && (
                <div className="text-[8px] font-bold text-black mt-2 leading-relaxed">
                  Legenda: S1 - Somatório de Notas 1; S2 - Somatório de Notas 2; REC - Recuperação
                </div>
              )}

              {(documentType === 'boletim' || documentType === 'mapa_notas') && (
                <div className="border border-black p-2 bg-gray-50 rounded-sm text-[8px] text-black leading-relaxed font-semibold">
                  <span className="font-bold uppercase mr-1">Legendas & Regras Institucionais:</span>
                  S1 = Somatório de Notas S1 (AV1 + AV2 + AV3), S2 = Somatório de Notas S2 (AV4 + AV5 + AV6), PF = Pontuação Final.
                  <br />
                  <span className="font-bold">Critério de Conceito:</span> D = 0 a 59 (Insuficiente) | C = 60 a 75 (Regular) | B = 76 a 85 (Bom) | A = 86 a 100 (Excelente).
                  <br />
                  <span className="font-bold">Frequência mínima exigida:</span> 75% de presença nas aulas dadas. Abaixo disso, o aluno é retido por faltas (Resultado: REPROVADO).
                </div>
              )}
            </div>

            {renderFooter()}

          </div>
        )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
