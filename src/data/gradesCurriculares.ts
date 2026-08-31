// Dados das Matrizes/Grades Curriculares — extraídos dos PDFs oficiais da
// escola. Cada curso tem uma lista de módulos, cada módulo uma lista de
// componentes curriculares com carga horária.

export interface ComponenteCurricular {
  nome: string;
  cargaHoraria: number;
}

export interface ModuloCurricular {
  nome: string;
  componentes: ComponenteCurricular[];
}

export interface GradeCurricular {
  id: string;
  cursoNome: string;
  modulos: ModuloCurricular[];
  cargaHorariaTotal: number;
}

export const GRADES_CURRICULARES: GradeCurricular[] = [
  {
    id: 'seguranca_trabalho',
    cursoNome: 'Técnico em Segurança do Trabalho',
    cargaHorariaTotal: 1440,
    modulos: [
      {
        nome: 'Módulo I',
        componentes: [
          { nome: 'Segurança e Saúde Ocupacional I', cargaHoraria: 80 },
          { nome: 'Desenho Técnico', cargaHoraria: 40 },
          { nome: 'Psicologia Organizacional e do Trabalho', cargaHoraria: 40 },
          { nome: 'Legislação Trabalhista e Previdenciária', cargaHoraria: 80 },
          { nome: 'Expressão e Comunicação', cargaHoraria: 40 },
          { nome: 'Informática Básica', cargaHoraria: 40 },
          { nome: 'Relações Humanas no Trabalho', cargaHoraria: 40 },
          { nome: 'Primeiros Socorros', cargaHoraria: 40 },
        ],
      },
      {
        nome: 'Módulo II',
        componentes: [
          { nome: 'Ergonomia do Trabalho', cargaHoraria: 40 },
          { nome: 'Legislação e Normas Técnicas I', cargaHoraria: 120 },
          { nome: 'Segurança e Saúde Ocupacional II', cargaHoraria: 80 },
          { nome: 'Epidemiologia e Toxicologia', cargaHoraria: 40 },
          { nome: 'Higiene e Saneamento no Trabalho', cargaHoraria: 40 },
          { nome: 'Prevenção e Combate a Catástrofes e Sinistros', cargaHoraria: 80 },
        ],
      },
      {
        nome: 'Módulo III',
        componentes: [
          { nome: 'Legislação e Normas Técnicas II', cargaHoraria: 120 },
          { nome: 'Educação Ambiental', cargaHoraria: 40 },
          { nome: 'Programas Prevencionistas', cargaHoraria: 120 },
          { nome: 'Investigação e Análise de Acidentes', cargaHoraria: 40 },
          { nome: 'SGI – Sistema de Gestão Integrada: Qualidade, Meio Ambiente, Segurança e Saúde no Trabalho', cargaHoraria: 80 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 240 },
        ],
      },
    ],
  },
  {
    id: 'enfermagem',
    cursoNome: 'Técnico em Enfermagem',
    cargaHorariaTotal: 1600,
    modulos: [
      {
        nome: 'Módulo I',
        componentes: [
          { nome: 'Anatomia e Fisiologia Humana', cargaHoraria: 80 },
          { nome: 'Biossegurança nas Ações de Saúde', cargaHoraria: 40 },
          { nome: 'Introdução à Enfermagem', cargaHoraria: 120 },
          { nome: 'Microbiologia e Parasitologia', cargaHoraria: 40 },
          { nome: 'Noções de Farmacologia', cargaHoraria: 40 },
          { nome: 'Nutrição', cargaHoraria: 40 },
          { nome: 'Primeiros Socorros', cargaHoraria: 40 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 100 },
        ],
      },
      {
        nome: 'Módulo II',
        componentes: [
          { nome: 'Enfermagem em Centro Cirúrgico', cargaHoraria: 40 },
          { nome: 'Enfermagem em Clínica Cirúrgica', cargaHoraria: 40 },
          { nome: 'Enfermagem em Clínica Médica', cargaHoraria: 40 },
          { nome: 'Enfermagem em Centro de Material e Esterilização', cargaHoraria: 20 },
          { nome: 'Enfermagem em Obstetrícia', cargaHoraria: 40 },
          { nome: 'Enfermagem em Pediatria', cargaHoraria: 40 },
          { nome: 'Enfermagem em Saúde Mental', cargaHoraria: 40 },
          { nome: 'Ética e Legislação Profissional', cargaHoraria: 20 },
          { nome: 'Psicologia do Trabalho em Saúde', cargaHoraria: 40 },
          { nome: 'Saúde Coletiva', cargaHoraria: 80 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 140 },
        ],
      },
      {
        nome: 'Módulo III',
        componentes: [
          { nome: 'Cardiologia', cargaHoraria: 40 },
          { nome: 'Dietoterapia', cargaHoraria: 40 },
          { nome: 'Enfermagem em Unidade de Terapia Intensiva', cargaHoraria: 40 },
          { nome: 'Enfermagem em Urgência e Emergência', cargaHoraria: 40 },
          { nome: 'Introdução ao Trabalho Científico', cargaHoraria: 20 },
          { nome: 'Fundamentos de Informática', cargaHoraria: 20 },
          { nome: 'Gastroenterologia', cargaHoraria: 40 },
          { nome: 'Geriatria', cargaHoraria: 40 },
          { nome: 'Nefrologia', cargaHoraria: 40 },
          { nome: 'Neurologia', cargaHoraria: 40 },
          { nome: 'Queimaduras Graves', cargaHoraria: 40 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 160 },
        ],
      },
    ],
  },
  {
    id: 'enfermagem_ead',
    cursoNome: 'Técnico em Enfermagem — EAD Semipresencial',
    cargaHorariaTotal: 1800,
    modulos: [
      {
        nome: 'Módulo Básico',
        componentes: [
          { nome: 'Anatomia e Fisiologia Humana', cargaHoraria: 80 },
          { nome: 'Microbiologia e Parasitologia', cargaHoraria: 40 },
          { nome: 'Biossegurança nas Ações de Saúde', cargaHoraria: 40 },
          { nome: 'Saúde Coletiva I', cargaHoraria: 40 },
          { nome: 'Nutrição', cargaHoraria: 40 },
          { nome: 'Fundamentos de Enfermagem', cargaHoraria: 160 },
        ],
      },
      {
        nome: 'Módulo Intermediário',
        componentes: [
          { nome: 'Centro de Material e Esterilização', cargaHoraria: 20 },
          { nome: 'Ética e Legislação', cargaHoraria: 20 },
          { nome: 'Psicologia do Trabalho em Saúde', cargaHoraria: 20 },
          { nome: 'Gestão e Descarte de Resíduos em Saúde', cargaHoraria: 20 },
          { nome: 'Assistência de Enfermagem em Clínica Médica', cargaHoraria: 80 },
          { nome: 'Assistência de Enfermagem em Clínica Cirúrgica', cargaHoraria: 80 },
          { nome: 'Saúde Coletiva II', cargaHoraria: 40 },
          { nome: 'Assistência de Enfermagem à Criança e à Mulher', cargaHoraria: 80 },
        ],
      },
      {
        nome: 'Módulo Avançado',
        componentes: [
          { nome: 'Assistência de Enfermagem em Urgências e Emergências', cargaHoraria: 80 },
          { nome: 'Assistência de Enfermagem em Saúde Mental', cargaHoraria: 40 },
          { nome: 'Assistência de Enfermagem a Pacientes em Estado Grave', cargaHoraria: 40 },
          { nome: 'Cardiologia', cargaHoraria: 40 },
          { nome: 'Dietoterapia', cargaHoraria: 40 },
          { nome: 'Gastroenterologia', cargaHoraria: 40 },
          { nome: 'Geriatria', cargaHoraria: 40 },
          { nome: 'Nefrologia', cargaHoraria: 40 },
          { nome: 'Neurologia', cargaHoraria: 40 },
          { nome: 'Projeto Integrador Multidisciplinar', cargaHoraria: 40 },
        ],
      },
      {
        nome: 'Estágio Supervisionado',
        componentes: [
          { nome: 'Estágio Supervisionado (todo o curso)', cargaHoraria: 600 },
        ],
      },
    ],
  },
  {
    id: 'radiologia',
    cursoNome: 'Técnico em Radiologia',
    cargaHorariaTotal: 1600,
    modulos: [
      {
        nome: 'Módulo I',
        componentes: [
          { nome: 'Química Aplicada à Radiologia', cargaHoraria: 40 },
          { nome: 'Biossegurança nas Ações de Saúde', cargaHoraria: 40 },
          { nome: 'Anatomia I', cargaHoraria: 80 },
          { nome: 'Fisiologia', cargaHoraria: 40 },
          { nome: 'Primeiros Socorros', cargaHoraria: 40 },
          { nome: 'Patologia Aplicada à Radiologia I', cargaHoraria: 40 },
          { nome: 'Técnicas Radiográficas I', cargaHoraria: 80 },
          { nome: 'Psicologia do Trabalho em Saúde', cargaHoraria: 40 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 60 },
        ],
      },
      {
        nome: 'Módulo II',
        componentes: [
          { nome: 'Anatomia II', cargaHoraria: 80 },
          { nome: 'Patologia Aplicada à Radiologia II', cargaHoraria: 40 },
          { nome: 'Física das Radiações', cargaHoraria: 40 },
          { nome: 'Equipamentos e Acessórios Radiológicos', cargaHoraria: 40 },
          { nome: 'Ética e Legislação', cargaHoraria: 40 },
          { nome: 'Efeitos Biológicos dos Meios de Contraste e das Radiações Ionizantes', cargaHoraria: 40 },
          { nome: 'Técnicas Radiográficas II', cargaHoraria: 80 },
          { nome: 'Proteção e Higiene das Radiações I', cargaHoraria: 40 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 150 },
        ],
      },
      {
        nome: 'Módulo III',
        componentes: [
          { nome: 'Mamografia', cargaHoraria: 40 },
          { nome: 'Densitometria Óssea', cargaHoraria: 40 },
          { nome: 'Radiologia Buco-Maxilo-Facial', cargaHoraria: 40 },
          { nome: 'Noções de Radioterapia', cargaHoraria: 40 },
          { nome: 'Tomografia Computadorizada', cargaHoraria: 40 },
          { nome: 'Ressonância Magnética Nuclear', cargaHoraria: 40 },
          { nome: 'Proteção e Higiene das Radiações II', cargaHoraria: 40 },
          { nome: 'Saúde Coletiva', cargaHoraria: 40 },
          { nome: 'Gestão e Descarte de Resíduos Radiológicos', cargaHoraria: 40 },
          { nome: 'Introdução ao Trabalho Científico', cargaHoraria: 20 },
          { nome: 'Noções de Informática', cargaHoraria: 20 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 190 },
        ],
      },
    ],
  },
  {
    id: 'instrumentacao_cirurgica',
    cursoNome: 'Técnico em Instrumentação Cirúrgica',
    cargaHorariaTotal: 340,
    modulos: [
      {
        nome: 'Módulo Único',
        componentes: [
          { nome: 'Ética e Bioética Aplicada à Instrumentação Cirúrgica', cargaHoraria: 40 },
          { nome: 'Teoria e Técnicas Aplicadas à Instrumentação Cirúrgica', cargaHoraria: 100 },
          { nome: 'Noções de Anestesiologia', cargaHoraria: 20 },
          { nome: 'Anatomia Aplicada à Instrumentação Cirúrgica', cargaHoraria: 40 },
          { nome: 'Microbiologia e Controle de Infecção Hospitalar', cargaHoraria: 40 },
          { nome: 'Estágio Supervisionado', cargaHoraria: 100 },
        ],
      },
    ],
  },
];
