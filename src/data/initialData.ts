import { User, UserRole, Course, ClassSection, Subject, GradeRecord, AttendanceSession, ConceptRange, AcademicCalendarEvent, Shift, CalendarEventType } from '../types';
import { initialGrades } from './initialGrades';
import { allPdfStudentUsers } from './allPdfStudents';

// ============================================================================
// MATRIZ CURRICULAR REAL DA INSTITUIÇÃO — não é dado de demonstração.
// Cursos, disciplinas e cargas horárias oficiais, conforme o PDF da escola.
// O que é fictício está só em getDemoDataToLoad(), no fim deste arquivo, e
// entra apenas quando alguém clica no botão de carregar demonstração.
// ============================================================================

export const initialCourses: Course[] = [
  {
    id: 'ENF',
    name: 'Técnico em Enfermagem',
    description: 'Habilitação profissional técnica focada na assistência integral à saúde em clínicas, hospitais e ambulatórios.'
  },
  {
    id: 'ENF_EAD',
    name: 'Técnico em Enfermagem EAD',
    description: 'Formação técnica em Enfermagem na modalidade a distância (EAD), combinando teoria online e encontros práticos.'
  },
  {
    id: 'RAD',
    name: 'Técnico em Radiologia',
    description: 'Curso voltado para a operação de equipamentos de diagnóstico por imagem, radiologia digital e proteção radiológica.'
  },
  {
    id: 'SEG',
    name: 'Técnico em Segurança do Trabalho',
    description: 'Formação focada na prevenção de acidentes de trabalho, higiene ocupacional e conformidade com as Normas Regulamentadoras.'
  },
  {
    id: 'INC',
    name: 'Instrumentação Cirúrgica',
    description: 'Especialização técnica focada em instrumentação cirúrgica, técnicas aplicadas e biossegurança em centro cirúrgico.'
  }
];

export const initialConceptRanges: ConceptRange[] = [
  { id: '1', minGrade: 86, maxGrade: 100, letter: 'A', description: 'Excelente' },
  { id: '2', minGrade: 76, maxGrade: 85, letter: 'B', description: 'Bom' },
  { id: '3', minGrade: 60, maxGrade: 75, letter: 'C', description: 'Regular' },
  { id: '4', minGrade: 0, maxGrade: 59, letter: 'D', description: 'Insuficiente' }
];

// Pristine base users list containing Pedagogy Administrator and all enrolled students
// Apenas um marcador de administrador, usado como proteção contra lista vazia.
// A autenticação de verdade é feita pelo Supabase Auth: este objeto NÃO
// contém senha, e o campo 'password' foi removido de propósito — era aqui que
// ficava a senha mestra 'Admin@Lynx2026', visível para qualquer um que
// abrisse o repositório.
export const initialUsers: User[] = [];

// Matriz curricular completa dos cursos técnicos (disciplinas e cargas horárias)
export const initialSubjects: Subject[] = [
  // 1. Técnico em Enfermagem (ENF) - 3 Módulos
  { id: 'enf_m1_anatomia', name: 'Anatomia e Fisiologia Humana', courseId: 'ENF', module: 1, workload: 80 },
  { id: 'enf_m1_biosseg', name: 'Biossegurança nas Ações de Saúde', courseId: 'ENF', module: 1, workload: 40 },
  { id: 'enf_m1_intro', name: 'Introdução à Enfermagem', courseId: 'ENF', module: 1, workload: 120 },
  { id: 'enf_m1_micro', name: 'Microbiologia e Parasitologia', courseId: 'ENF', module: 1, workload: 40 },
  { id: 'enf_m1_farmaco', name: 'Noções de Farmacologia', courseId: 'ENF', module: 1, workload: 40 },
  { id: 'enf_m1_nutricao', name: 'Nutrição', courseId: 'ENF', module: 1, workload: 40 },
  { id: 'enf_m1_socorros', name: 'Primeiros Socorros', courseId: 'ENF', module: 1, workload: 40 },

  { id: 'enf_m2_centro', name: 'Enfermagem em Centro Cirúrgico', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_material', name: 'Enfermagem em Cent. De Mat. E Esterilização', courseId: 'ENF', module: 2, workload: 20 },
  { id: 'enf_m2_cirurgica', name: 'Enfermagem em Clínica Cirúrgica', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_medica', name: 'Enfermagem em Clínica Médica', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_obstetricia', name: 'Enfermagem em Obstetrícia', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_pediatria', name: 'Enfermagem em Pediatria', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_mental', name: 'Enfermagem em Saúde Mental', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_etica', name: 'Ética e Legislação Profissional', courseId: 'ENF', module: 2, workload: 20 },
  { id: 'enf_m2_psico', name: 'Psicologia do Trabalho em Saúde', courseId: 'ENF', module: 2, workload: 40 },
  { id: 'enf_m2_coletiva', name: 'Saúde Coletiva', courseId: 'ENF', module: 2, workload: 80 },

  { id: 'enf_m3_cardio', name: 'Cardiologia', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_dieto', name: 'Dietoterapia', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_uti', name: 'Enfermagem em Unidade de Terapia Intensiva', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_urgencia', name: 'Enfermagem em Urgência e Emergência', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_cientifico', name: 'Introdução ao Trabalho Científico', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_informatica', name: 'Fundamentos de Informática', courseId: 'ENF', module: 3, workload: 20 },
  { id: 'enf_m3_gastro', name: 'Gastroenterologia', courseId: 'ENF', module: 3, workload: 20 },
  { id: 'enf_m3_geriatria', name: 'Geriatria', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_nefro', name: 'Nefrologia', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_neuro', name: 'Neurologia', courseId: 'ENF', module: 3, workload: 40 },
  { id: 'enf_m3_queimaduras', name: 'Queimaduras Graves', courseId: 'ENF', module: 3, workload: 40 },

  // 2. Técnico em Enfermagem EAD (ENF_EAD) - 3 Módulos
  { id: 'enf_ead_m1_anatomia', name: 'Anatomia e Fisiologia Humana', courseId: 'ENF_EAD', module: 1, workload: 80 },
  { id: 'enf_ead_m1_micro', name: 'Microbiologia e Parasitologia', courseId: 'ENF_EAD', module: 1, workload: 40 },
  { id: 'enf_ead_m1_biosseg', name: 'Biossegurança nas Ações de Saúde', courseId: 'ENF_EAD', module: 1, workload: 40 },
  { id: 'enf_ead_m1_coletiva', name: 'Saúde Coletiva I', courseId: 'ENF_EAD', module: 1, workload: 40 },
  { id: 'enf_ead_m1_nutricao', name: 'Nutrição', courseId: 'ENF_EAD', module: 1, workload: 40 },
  { id: 'enf_ead_m1_fundamentos', name: 'Fundamentos de Enfermagem', courseId: 'ENF_EAD', module: 1, workload: 160 },

  { id: 'enf_ead_m2_material', name: 'Centro de Material e Esterilização', courseId: 'ENF_EAD', module: 2, workload: 20 },
  { id: 'enf_ead_m2_etica', name: 'Ética e Legislação', courseId: 'ENF_EAD', module: 2, workload: 20 },
  { id: 'enf_ead_m2_psico', name: 'Psicologia do Trabalho em Saúde', courseId: 'ENF_EAD', module: 2, workload: 20 },
  { id: 'enf_ead_m2_residuos', name: 'Gestão e Descarte de Resíduos em Saúde', courseId: 'ENF_EAD', module: 2, workload: 20 },
  { id: 'enf_ead_m2_cirurgica', name: 'Assist. de Enfermagem Em Clínica Cirúrgica', courseId: 'ENF_EAD', module: 2, workload: 80 },
  { id: 'enf_ead_m2_medica', name: 'Assist. de Enfermagem em Clínica Médica', courseId: 'ENF_EAD', module: 2, workload: 80 },
  { id: 'enf_ead_m2_coletiva2', name: 'Saúde Coletiva II', courseId: 'ENF_EAD', module: 2, workload: 40 },
  { id: 'enf_ead_m2_crianca', name: 'Assistência de Enfermagem à Criança e à Mulher', courseId: 'ENF_EAD', module: 2, workload: 80 },

  { id: 'enf_ead_m3_urgencias', name: 'Assist. de Enf. em Urgências e Emergências', courseId: 'ENF_EAD', module: 3, workload: 80 },
  { id: 'enf_ead_m3_mental', name: 'Assistência de Enfermagem em Saúde Mental', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_grave', name: 'Assist. de Enf. a Pacientes em Estado Grave', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_cardio', name: 'Cardiologia', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_dieto', name: 'Dietoterapia', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_gastro', name: 'Gastroenterologia', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_geriatria', name: 'Geriatria', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_nefro', name: 'Nefrologia', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_neuro', name: 'Neurologia', courseId: 'ENF_EAD', module: 3, workload: 40 },
  { id: 'enf_ead_m3_projeto', name: 'Projeto Integrador Multidisciplinar', courseId: 'ENF_EAD', module: 3, workload: 40 },

  // 3. Técnico em Radiologia (RAD) - 3 Módulos
  { id: 'rad_m1_socorros', name: 'Primeiros Socorros', courseId: 'RAD', module: 1, workload: 40 },
  { id: 'rad_m1_biosseg', name: 'Biossegurança nas Ações de Saúde', courseId: 'RAD', module: 1, workload: 40 },
  { id: 'rad_m1_psico', name: 'Psicologia do Trabalho em Saúde', courseId: 'RAD', module: 1, workload: 40 },
  { id: 'rad_m1_quimica', name: 'Química Aplic.á Radiologia', courseId: 'RAD', module: 1, workload: 40 },
  { id: 'rad_m1_anatomia1', name: 'Anatomia I', courseId: 'RAD', module: 1, workload: 80 },
  { id: 'rad_m1_fisiologia', name: 'Fisiologia', courseId: 'RAD', module: 1, workload: 40 },
  { id: 'rad_m1_patologia1', name: 'Patologia Aplicada à Radiologia I', courseId: 'RAD', module: 1, workload: 40 },
  { id: 'rad_m1_tecnicas1', name: 'Técnicas Radiográficas I', courseId: 'RAD', module: 1, workload: 80 },

  { id: 'rad_m2_fisica', name: 'Física das Radiações', courseId: 'RAD', module: 2, workload: 40 },
  { id: 'rad_m2_protecao1', name: 'Proteção e Higiene das Radiações I', courseId: 'RAD', module: 2, workload: 40 },
  { id: 'rad_m2_equipamentos', name: 'Equipamentos e Acessórios Radiológicos', courseId: 'RAD', module: 2, workload: 40 },
  { id: 'rad_m2_anatomia2', name: 'Anatomia II', courseId: 'RAD', module: 2, workload: 80 },
  { id: 'rad_m2_etica', name: 'Ética e Legislação', courseId: 'RAD', module: 2, workload: 40 },
  { id: 'rad_m2_tecnicas2', name: 'Técnicas Radiográficas II', courseId: 'RAD', module: 2, workload: 80 },
  { id: 'rad_m2_patologia2', name: 'Patologia Aplicada à Radiologia II', courseId: 'RAD', module: 2, workload: 40 },
  { id: 'rad_m2_efeitos', name: 'Efeitos B. dos M. de Cont. das Rad. Ionizantes', courseId: 'RAD', module: 2, workload: 40 },

  { id: 'rad_m3_protecao2', name: 'Proteção e Higiene das Radiações II', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_mamografia', name: 'Mamografia', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_densitometria', name: 'Densitometria Óssea', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_tomografia', name: 'Tomografia Computadorizada', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_bucomaxilo', name: 'Radiologia Buco-Maxilo-Facial', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_radioterapia', name: 'Noções de Radioterapia', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_coletiva', name: 'Saúde Coletiva', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_cientifico', name: 'Introdução ao Trabalho Científico', courseId: 'RAD', module: 3, workload: 20 },
  { id: 'rad_m3_informatica', name: 'Noções de Informática', courseId: 'RAD', module: 3, workload: 20 },
  { id: 'rad_m3_ressonancia', name: 'Ressonância Magnética Nuclear', courseId: 'RAD', module: 3, workload: 40 },
  { id: 'rad_m3_residuos', name: 'Gestão e Descarte de Resíduos Radiológicos', courseId: 'RAD', module: 3, workload: 40 },

  // 4. Técnico em Segurança do Trabalho (SEG) - 3 Módulos
  { id: 'seg_m1_sso1', name: 'Segurança e Saúde Ocupacional I', courseId: 'SEG', module: 1, workload: 80 },
  { id: 'seg_m1_desenho', name: 'Desenho Técnico', courseId: 'SEG', module: 1, workload: 40 },
  { id: 'seg_m1_psico', name: 'Psicologia Organizacional e do Trabalho', courseId: 'SEG', module: 1, workload: 40 },
  { id: 'seg_m1_legislacao', name: 'Legislação Trabalhista e Previdenciária', courseId: 'SEG', module: 1, workload: 80 },
  { id: 'seg_m1_comunicacao', name: 'Expressão e Comunicação', courseId: 'SEG', module: 1, workload: 40 },
  { id: 'seg_m1_relacoes', name: 'Relações Humanas no Trabalho', courseId: 'SEG', module: 1, workload: 40 },
  { id: 'seg_m1_socorros', name: 'Primeiros Socorros', courseId: 'SEG', module: 1, workload: 40 },
  { id: 'seg_m1_informatica', name: 'Informática Básica', courseId: 'SEG', module: 1, workload: 40 },

  { id: 'seg_m2_ergonomia', name: 'Ergonomia do Trabalho', courseId: 'SEG', module: 2, workload: 40 },
  { id: 'seg_m2_normas1', name: 'Legislação e Normas Técnicas I', courseId: 'SEG', module: 2, workload: 120 },
  { id: 'seg_m2_sso2', name: 'Segurança e Saúde Ocupacional II', courseId: 'SEG', module: 2, workload: 80 },
  { id: 'seg_m2_toxicologia', name: 'Epidemiologia e Toxicologia', courseId: 'SEG', module: 2, workload: 40 },
  { id: 'seg_m2_higiene', name: 'Higiene e Saneamento no Trabalho', courseId: 'SEG', module: 2, workload: 40 },
  { id: 'seg_m2_prevencao', name: 'Prevenção e Combate a Catástrofes e Sinistros', courseId: 'SEG', module: 2, workload: 80 },

  { id: 'seg_m3_ambiental', name: 'Educação Ambiental', courseId: 'SEG', module: 3, workload: 40 },
  { id: 'seg_m3_normas2', name: 'Legislação e Normas Técnicas II', courseId: 'SEG', module: 3, workload: 120 },
  { id: 'seg_m3_prevencionistas', name: 'Programas Prevencionistas', courseId: 'SEG', module: 3, workload: 120 },
  { id: 'seg_m3_acidentes', name: 'Investigação e Análise de Acidentes', courseId: 'SEG', module: 3, workload: 40 },
  { id: 'seg_m3_sgi', name: 'SGI - Sistema de Gestão Integrada', courseId: 'SEG', module: 3, workload: 80 },

  // 5. Instrumentação Cirúrgica (INC) - 1 Módulo
  { id: 'inc_m1_etica', name: 'Ética e bioética aplicada à instrumentação cirúrgica', courseId: 'INC', module: 1, workload: 40 },
  { id: 'inc_m1_teoria', name: 'Teoria e técnicas aplicadas à instrumentação cirúrgica', courseId: 'INC', module: 1, workload: 100 },
  { id: 'inc_m1_anestesiologia', name: 'Noções de anestesiologia', courseId: 'INC', module: 1, workload: 20 },
  { id: 'inc_m1_anatomia', name: 'Anatomia aplicada a instrumentação cirúrgica', courseId: 'INC', module: 1, workload: 40 },
  { id: 'inc_m1_microbiologia', name: 'Microbiologia e controle de infecção hospitalar', courseId: 'INC', module: 1, workload: 40 }
];

// Automatically generate classes across shifts/modalities for all academic periods
const generateInitialClasses = (): ClassSection[] => {
  const sections: ClassSection[] = [];
  const coursesList = ['ENF', 'ENF_EAD', 'RAD', 'SEG', 'INC'];
  const courseNames: Record<string, string> = {
    ENF: 'Enfermagem',
    ENF_EAD: 'Enfermagem EAD',
    RAD: 'Radiologia',
    SEG: 'Segurança do Trabalho',
    INC: 'Instrumentação Cirúrgica'
  };

  const shifts = [
    { shift: Shift.MATUTINO, suffix: 'MAT' },
    { shift: Shift.VESPERTINO, suffix: 'VESP' },
    { shift: Shift.NOTURNO, suffix: 'NOT' },
    { shift: Shift.EAD, suffix: 'EAD' },
    { shift: Shift.SABADO, suffix: 'HIBR' }
  ];

  const getShiftLabel = (sh: Shift): string => {
    switch (sh) {
      case Shift.MATUTINO: return 'matutino';
      case Shift.VESPERTINO: return 'vespertino';
      case Shift.NOTURNO: return 'noturno';
      case Shift.EAD: return 'ead';
      case Shift.SABADO: return 'sábado';
      default: return '';
    }
  };

  // Generate for all academic periods as requested
  const periods = [
    { year: 2024, semester: 2 },
    { year: 2025, semester: 1 },
    { year: 2025, semester: 2 },
    { year: 2026, semester: 1 },
    { year: 2026, semester: 2 },
    { year: 2027, semester: 1 },
    { year: 2027, semester: 2 },
    { year: 2028, semester: 1 },
    { year: 2028, semester: 2 }
  ];

  periods.forEach(({ year, semester }) => {
    coursesList.forEach(cId => {
      const briefName = courseNames[cId];
      // Create classes for Modules 1, 2, and 3 (INC only has module 1)
      const modules = cId === 'INC' ? [1] : [1, 2, 3];
      modules.forEach(mod => {
        shifts.forEach(({ shift, suffix }) => {
          const baseClassId = `class_${cId.toLowerCase()}_m${mod}_${shift.toLowerCase() === 'sábado' ? 'sabado' : shift.toLowerCase()}`;
          // Retain original classId for 2026/1 for total backwards compatibility
          const classId = (year === 2026 && semester === 1) ? baseClassId : `${baseClassId}_${year}_${semester}`;
          
          sections.push({
            id: classId,
            name: `${briefName} ${mod}º ${getShiftLabel(shift)}`,
            code: `${cId}-M${mod}-${suffix}`,
            courseId: cId,
            shift,
            module: mod,
            year,
            semester,
            closedS1: false,
            closedS2: false,
            closedDefinitive: false
          });
        });
      });
    });
  });

  return sections;
};

export const initialClasses = generateInitialClasses();

export { initialGrades };

// Completely Clean of attendance sessions. All start empty!
export const generateInitialAttendance = (): AttendanceSession[] => [];

export const initialCalendarEvents: AcademicCalendarEvent[] = [
  {
    id: 'cal_1',
    title: 'Fechamento da S1',
    date: '2026-07-05',
    type: CalendarEventType.CLOSING_S1,
    description: 'Prazo limite para inserção de notas referentes à S1 (Avaliações 1, 2, 3 e Recuperação).'
  },
  {
    id: 'cal_2',
    title: 'Fechamento da S2',
    date: '2026-07-15',
    type: CalendarEventType.CLOSING_S2,
    description: 'Prazo limite para inserção de notas referentes à S2 (Avaliações 4, 5, 6 e Recuperação S2).'
  },
  {
    id: 'cal_3',
    title: 'Fechamento Definitivo',
    date: '2026-07-20',
    type: CalendarEventType.DEFINITIVE_CLOSING,
    description: 'Bloqueio total de edição dos diários pelo corpo docente. Apenas o Administrador poderá fazer alterações.'
  },
  {
    id: 'cal_4',
    title: 'Conselho de Classe de 2026/1',
    date: '2026-07-18',
    type: CalendarEventType.INFO,
    description: 'Reunião de professores e coordenadores para análise de aproveitamento individual e casos de conselho.'
  }
];

// Helper to load high-fidelity demo students & grades for testing with a single click.
// This fulfills BOTH requirements: Pristine/Clean by default AND immediately fully testable!
export const getDemoDataToLoad = () => {
  const demoUsers: User[] = [
    // Seeding some professional teachers with assigned journals across multiple classes
    { 
      id: 'prof_joao', 
      name: 'Dr. João Roberto (LYnx EDU)', 
      username: 'prof_joao', 
      email: 'joao.roberto@lynxedu.com.br', 
      role: UserRole.TEACHER, 
      cpf: '111.111.111-11', 
      enrollment: '1001', 
      active: true, 
      assignedJournals: [
        { classId: 'class_enf_m1_matutino', subjectId: 'enf_m1_anatomia' }, 
        { classId: 'class_enf_m1_matutino', subjectId: 'enf_m1_intro' },
        { classId: 'class_rad_m1_matutino', subjectId: 'rad_m1_anatomia1' },
        { classId: 'class_rad_m1_matutino', subjectId: 'rad_m1_tecnicas1' },
        { classId: 'class_seg_m1_matutino', subjectId: 'seg_m1_desenho' }
      ] 
    },
    { 
      id: 'prof_ana', 
      name: 'Dra. Ana Paula Silva', 
      username: 'prof_ana', 
      email: 'ana.silva@lynxedu.com.br', 
      role: UserRole.TEACHER, 
      cpf: '222.222.222-22', 
      enrollment: '1002', 
      active: true, 
      assignedJournals: [
        { classId: 'class_enf_m1_matutino', subjectId: 'enf_m1_biosseg' },
        { classId: 'class_rad_m1_matutino', subjectId: 'rad_m1_biosseg' },
        { classId: 'class_seg_m1_matutino', subjectId: 'seg_m1_sso1' },
        { classId: 'class_seg_m1_matutino', subjectId: 'seg_m1_legislacao' }
      ] 
    },
    { 
      id: 'prof_carlos', 
      name: 'Prof. Carlos Eduardo Souza', 
      username: 'prof_carlos', 
      email: 'carlos.souza@lynxedu.com.br', 
      role: UserRole.TEACHER, 
      cpf: '333.333.333-33', 
      enrollment: '1003', 
      active: true, 
      assignedJournals: [
        { classId: 'class_enf_m1_matutino', subjectId: 'enf_m1_socorros' },
        { classId: 'class_rad_m1_matutino', subjectId: 'rad_m1_socorros' },
        { classId: 'class_seg_m1_matutino', subjectId: 'seg_m1_socorros' }
      ] 
    },
    { 
      id: 'prof_marcelo', 
      name: 'Prof. Marcelo Santos', 
      username: 'prof_marcelo', 
      email: 'marcelo.santos@lynxedu.com.br', 
      role: UserRole.TEACHER, 
      cpf: '444.444.444-44', 
      enrollment: '1004', 
      password: 'marcelo',
      active: true, 
      assignedJournals: [
        { classId: 'class_enf_m1_matutino', subjectId: 'enf_m1_micro' },
        { classId: 'class_enf_m1_matutino', subjectId: 'enf_m1_farmaco' },
        { classId: 'class_rad_m1_matutino', subjectId: 'rad_m1_socorros' }
      ] 
    },

    // Seeding 10 real students
    { id: 'std_26101001', name: 'CARLOS ROBERTO G. DO NASCIMENTO', username: '26101001', email: 'carlos.roberto@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101001', active: true },
    { id: 'std_26101002', name: 'DANIEL LONGUINHO BATISTA DE SOUZA', username: '26101002', email: 'daniel.longuinho@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101002', active: true },
    { id: 'std_26101003', name: 'ELAINE FERREIRA DOS SANTOS SILVA', username: '26101003', email: 'elaine.ferreira@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101003', active: true },
    { id: 'std_26101004', name: 'EMANUELY PINHEIRO SANTOS', username: '26101004', email: 'emanuely.pinheiro@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101004', active: true },
    { id: 'std_26101005', name: 'JULIANA ALVES ARRUDA', username: '26101005', email: 'juliana.arruda@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101005', active: true },
    { id: 'std_26101006', name: 'KAMILLY VITORIA RIBEIRO PEREIRA', username: '26101006', email: 'kamilly.vitoria@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101006', active: true },
    { id: 'std_26101007', name: 'KELLY FLAVIA MARTINS', username: '26101007', email: 'kelly.flavia@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101007', active: true },
    { id: 'std_26101008', name: 'LETICIA LIMA SILVA', username: '26101008', email: 'leticia.lima@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101008', active: true },
    { id: 'std_26101009', name: 'ORION DE OLIVEIRA MARQUES', username: '26101009', email: 'orion.marques@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101009', active: true },
    { id: 'std_26101010', name: 'PATRICIA AGUIAR RODRIGUES DA SILVA', username: '26101010', email: 'patricia.aguiar@aluno.oc.com', role: UserRole.STUDENT, enrollment: '26101010', active: true }
  ];

  const demoGrades: GradeRecord[] = [];
  const demoAttendance: AttendanceSession[] = [];
  const studentUsers = demoUsers.filter(u => u.role === UserRole.STUDENT);

  // Configuration for classes to seed with students and subjects
  const demoClassesToSeed = [
    {
      classId: 'class_enf_m1_matutino',
      subjects: [
        { id: 'enf_m1_anatomia', teacherId: 'prof_joao' },
        { id: 'enf_m1_biosseg', teacherId: 'prof_ana' },
        { id: 'enf_m1_intro', teacherId: 'prof_joao' },
        { id: 'enf_m1_socorros', teacherId: 'prof_carlos' }
      ]
    },
    {
      classId: 'class_rad_m1_matutino',
      subjects: [
        { id: 'rad_m1_socorros', teacherId: 'prof_carlos' },
        { id: 'rad_m1_biosseg', teacherId: 'prof_ana' },
        { id: 'rad_m1_anatomia1', teacherId: 'prof_joao' },
        { id: 'rad_m1_tecnicas1', teacherId: 'prof_joao' }
      ]
    },
    {
      classId: 'class_seg_m1_matutino',
      subjects: [
        { id: 'seg_m1_sso1', teacherId: 'prof_ana' },
        { id: 'seg_m1_desenho', teacherId: 'prof_joao' },
        { id: 'seg_m1_legislacao', teacherId: 'prof_ana' },
        { id: 'seg_m1_socorros', teacherId: 'prof_carlos' }
      ]
    }
  ];

  demoClassesToSeed.forEach(config => {
    const classId = config.classId;
    
    // Distribute students so different classes feel distinct but populated
    let classStudents = studentUsers;
    if (classId === 'class_rad_m1_matutino') {
      classStudents = studentUsers.slice(0, 6); // First 6 students
    } else if (classId === 'class_seg_m1_matutino') {
      classStudents = studentUsers.slice(4); // Last 6 students (overlapping a bit)
    }

    config.subjects.forEach(sub => {
      classStudents.forEach((std, idx) => {
        // Create interesting variance of grades
        const isAbsentee = (classId === 'class_enf_m1_matutino' && (std.id === 'std_26101003' || std.id === 'std_26101010')) ||
                            (classId === 'class_rad_m1_matutino' && std.id === 'std_26101005') ||
                            (classId === 'class_seg_m1_matutino' && std.id === 'std_26101008');
        
        const scoreBase = isAbsentee ? 2 : 7 + (idx % 4);
        
        const av1 = Math.min(10, scoreBase);
        const av2 = Math.min(10, scoreBase + (idx % 2));
        const av3 = Math.min(10, scoreBase - 1);
        const avs = [av1, av2, av3];
        const s1 = Math.min(30, avs[0] + avs[1] + avs[2]);

        const av4 = Math.min(10, scoreBase + 1);
        const av5 = Math.min(10, scoreBase - (idx % 2));
        const av6 = Math.min(10, scoreBase);
        const avs2 = [av4, av5, av6];
        const s2 = Math.min(30, avs2[0] + avs2[1] + avs2[2]);

        const afc = Math.min(40, isAbsentee ? 12 : 28 + idx);
        const extra = idx % 2 === 0 ? 4 : null;
        const conselho = scoreBase === 5 ? 1 : null;
        const pf = Math.min(100, s1 + s2 + afc + (extra ?? 0) + (conselho ?? 0));

        const concept = pf >= 86 ? 'A' : pf >= 76 ? 'B' : pf >= 60 ? 'C' : 'D';
        const result = isAbsentee ? 'REP. FALTAS' : pf >= 60 ? 'APTO' : 'NÃO APTO';

        demoGrades.push({
          id: `g_demo_${classId}_${sub.id}_${std.id}`,
          classId,
          subjectId: sub.id,
          studentId: std.id,
          av1, av2, av3, recS1: null, s1,
          av4, av5, av6, recS2: null, s2,
          extra, conselho, afc, pf,
          concept,
          result
        });
      });

      // Seed 4 diary classes
      ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'].forEach((date, dateIdx) => {
        const records: { [studentId: string]: 'P' | 'F' } = {};
        classStudents.forEach(std => {
          const isAbsentee = (classId === 'class_enf_m1_matutino' && (std.id === 'std_26101003' || std.id === 'std_26101010')) ||
                             (classId === 'class_rad_m1_matutino' && std.id === 'std_26101005') ||
                             (classId === 'class_seg_m1_matutino' && std.id === 'std_26101008');
          records[std.id] = (isAbsentee && dateIdx % 2 === 0) ? 'F' : 'P';
        });

        demoAttendance.push({
          id: `att_demo_${classId}_${sub.id}_${dateIdx}`,
          subjectId: sub.id,
          classId,
          date,
          lessonsCount: 4,
          teacherId: sub.teacherId || 'prof_joao',
          topic: `Aula de Demonstração ${dateIdx + 1}: Conceitos Fundamentais e Prática Supervisionada`,
          records
        });
      });
    });
  });

  return {
    users: demoUsers,
    grades: demoGrades,
    attendance: demoAttendance
  };
};
