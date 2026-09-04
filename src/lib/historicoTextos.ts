/**
 * HISTÓRICO ESCOLAR — grades curriculares e competências, por curso.
 *
 * TUDO AQUI FOI EXTRAÍDO DAS PLANILHAS OFICIAIS DA ESCOLA, não digitado à
 * mão, justamente para não entrar erro de digitação em documento oficial.
 *
 * Cada curso é um documento diferente de verdade: muda a resolução do
 * cabeçalho, a carga horária total, as horas de estágio, as atividades
 * extra-curriculares e a lista inteira de competências adquiridas.
 *
 * DUAS CORREÇÕES FEITAS NA EXTRAÇÃO, com aprovação da escola:
 *  - Enfermagem: "Enfermagem em Pediatria" aparecia duas vezes no módulo II
 *    da planilha. Ficou uma só.
 *  - Radiologia: havia uma linha com 80h e sem nome de disciplina. Foi
 *    descartada, porque disciplina sem nome não pode ir para o histórico.
 *
 * Como nas declarações e no contrato, este arquivo é o PADRÃO DE FÁBRICA.
 * O que a secretaria editar na tela é gravado no banco e passa a valer.
 */

export interface DisciplinaHistorico { nome: string; ch: number; }
export interface ModuloHistorico { nome: string; disciplinas: DisciplinaHistorico[]; }

export interface ModeloHistorico {
  chave: string;
  cursoNome: string;
  titulo: string;
  resolucao: string;
  /** Termos que o nome do curso do aluno precisa conter para liberar este modelo. */
  termosCurso: string[];
  modulos: ModuloHistorico[];
  cargaEstagio: number;
  cargaTotal: number;
  observacoes: string;
  competenciasGerais: string[];
  competenciasEspecificas: string[];
}

export const MODELOS_HISTORICO: ModeloHistorico[] = [
  {
    chave: 'ENFERMAGEM_EAD',
    cursoNome: 'Técnico em Enfermagem EAD',
    titulo: 'HISTÓRICO ESCOLAR DO CURSO TÉCNICO EM ENFERMAGEM EAD',
    resolucao: 'Resolução CEE/CEP nº 059/2023',
    termosCurso: ['ENFERMAGEM EAD', 'ENFERMAGEM À DISTÂNCIA', 'ENFERMAGEM A DISTANCIA'],
    cargaEstagio: 600,
    cargaTotal: 1800,
    observacoes: 'Atividades extra-curriculares: 100 horas',
    modulos: [
      { nome: 'MÓDULO I', disciplinas: [
        { nome: 'Anatomia e Fisiologia Humana', ch: 80 },
        { nome: 'Biossegurança nas Ações de Saúde', ch: 40 },
        { nome: 'Introdução à Enfermagem', ch: 120 },
        { nome: 'Microbiologia e Parasitologia', ch: 40 },
        { nome: 'Noções de Farmacologia', ch: 40 },
        { nome: 'Nutrição', ch: 40 },
        { nome: 'Primeiros Socorros', ch: 40 },
      ] },
      { nome: 'MÓDULO II', disciplinas: [
        { nome: 'Enfermagem em Centro Cirúrgico', ch: 40 },
        { nome: 'Enfermagem em Cent. De Mat. E Esterilização', ch: 20 },
        { nome: 'Enfermagem em Clínica Cirúrgica', ch: 40 },
        { nome: 'Enfermagem em Clínica Médica', ch: 40 },
        { nome: 'Enfermagem em Obstetrícia', ch: 40 },
        { nome: 'Enfermagem em Pediatria', ch: 40 },
        { nome: 'Enfermagem em Saúde Mental', ch: 40 },
        { nome: 'Ética e Legislação Profissional', ch: 20 },
        { nome: 'Psicologia do Trabalho em Saúde', ch: 40 },
        { nome: 'Saúde Coletiva I', ch: 40 },
        { nome: 'Saúde Coletiva', ch: 80 },
      ] },
      { nome: 'MÓDULO III', disciplinas: [
        { nome: 'Cardiologia', ch: 40 },
        { nome: 'Dietoterapia', ch: 40 },
        { nome: 'Enfermagem em Unidade de Terapia Intensiva', ch: 40 },
        { nome: 'Enfermagem em Urgência e Emergência', ch: 40 },
        { nome: 'Introdução ao Trabalho Científico', ch: 40 },
        { nome: 'Fundamentos de Informática', ch: 20 },
        { nome: 'Gastroenterologia', ch: 20 },
        { nome: 'Geriatria', ch: 40 },
        { nome: 'Nefrologia', ch: 40 },
        { nome: 'Neurologia', ch: 40 },
        { nome: 'Queimaduras Graves', ch: 40 },
      ] },
    ],
    competenciasGerais: [
      'Identificar os fatores determinantes e condicionantes do processo saúde-doença.',
      'Identificar a estrutura e a organização do sistema de saúde vigente.',
      'Identificar as funções e responsabilidades dos membros da equipe multiprofissional.',
      'Planejar e organizar a atividade profissional na perspectiva da excelência no atendimento ao cliente /.',
      'Paciente.',
      'Realizar atividade multiprofissional integrando conhecimentos das diversas ciências, tendo em vista o caráter interdisciplinar da área de atuação em saúde.',
      'Aplicar as normas de higiene, saúde pessoal e ambiental.',
      'Identificar e aplicar princípios e normas de conservação dos recursos não renováveis e de preservação.',
      'Aplicar princípios ergonômicos na realização do trabalho.',
      'Avaliar riscos de iatrogenias ao executar procedimentos técnicos.',
      'Interpretar e aplicar normas do exercício profissional e princípios éticos que regem a conduta do.',
      'Profissional da área de atuação em saúde.',
      'Aplicar a legislação referente aos direitos do consumidor / usuário do sistema de saúde.',
      'Atuar conforme as rotinas e protocolos de trabalho avaliando o funcionamento das instalações e operando equipamentos próprios do campo de atuação.',
      'Registrar ocorrências dos serviços prestados de acordo com as exigências do campo de atuação.',
      'Informar ao cliente/paciente, ao sistema de saúde e aos outros profissionais da área sobre os procedimentos de trabalho executados.',
      'Orientar cliente / paciente a assumir com autonomia sua própria condição de saúde.',
      'Aplicar normas de biossegurança.',
      'Coletar, organizar e registrar dados relativos ao campo de atuação.',
      'Utilizar recursos e ferramentas de informática específicas para área de saúde.',
      'Prestar primeiros socorros em situação de emergência.',
    ],
    competenciasEspecificas: [
      'Integrar equipe multiprofissional que atua em saúde.',
      'Executar atividades específicas na prestação de assistência de enfermagem.',
      'Realizar cuidados de conforto, higiene e segurança ao cliente/paciente.',
      'Observar e registrar sinais e sintomas dos vários tipos de afecções, executando procedimentos técnicos de enfermagem específicos.',
      'Verificar sinais vitais.',
      'Administrar medicamentos conforme prescrição.',
      'Executar curativos.',
      'Orientar o cliente/pacientes quanto aos procedimentos pós-consulta, pós-alta, e pós-assistência domiciliar.',
      'Vacinar e registrar conforme calendário básico de vacinação do Ministério da Saúde e Programa.',
      'Nacional de Imunização (PNI).',
      'Contribuir na elaboração de planos de assistência de enfermagem através da absorção de informações colhidas junto aos pacientes, familiares e a comunidade “in locu”.',
      'Colaborar com o enfermeiro para o efetivo exercício de suas atividades.',
      'Orientar o Auxiliar de Enfermagem transmitindo-lhe instruções quanto ao seu desempenho no exercício profissional.',
      'Atuar como agente colaborar no desenvolvimento dos programas educativos focados nas ações comunitárias melhorando os indicadores da qualidade de vida da comunidade.',
    ],
  },
  {
    chave: 'ENFERMAGEM',
    cursoNome: 'Técnico em Enfermagem',
    titulo: 'HISTÓRICO ESCOLAR DO CURSO TÉCNICO EM ENFERMAGEM',
    resolucao: 'Resolução CEE/GO nº 018/2022',
    termosCurso: ['ENFERMAGEM'],
    cargaEstagio: 600,
    cargaTotal: 1800,
    observacoes: 'Atividades extra-curriculares: 100 horas',
    modulos: [
      { nome: 'MÓDULO I', disciplinas: [
        { nome: 'Anatomia e Fisiologia Humana', ch: 80 },
        { nome: 'Biossegurança nas Ações de Saúde', ch: 40 },
        { nome: 'Introdução à Enfermagem', ch: 120 },
        { nome: 'Microbiologia e Parasitologia', ch: 40 },
        { nome: 'Noções de Farmacologia', ch: 40 },
        { nome: 'Nutrição', ch: 40 },
        { nome: 'Primeiros Socorros', ch: 40 },
      ] },
      { nome: 'MÓDULO II', disciplinas: [
        { nome: 'Enfermagem em Centro Cirúrgico', ch: 40 },
        { nome: 'Enfermagem em Cent. De Mat. E Esterilização', ch: 20 },
        { nome: 'Enfermagem em Clínica Cirúrgica', ch: 40 },
        { nome: 'Enfermagem em Clínica Médica', ch: 40 },
        { nome: 'Enfermagem em Obstetrícia', ch: 40 },
        { nome: 'Enfermagem em Pediatria', ch: 40 },
        { nome: 'Enfermagem em Saúde Mental', ch: 40 },
        { nome: 'Ética e Legislação Profissional', ch: 20 },
        { nome: 'Psicologia do Trabalho em Saúde', ch: 40 },
        { nome: 'Saúde Coletiva I', ch: 40 },
        { nome: 'Saúde Coletiva', ch: 80 },
      ] },
      { nome: 'MÓDULO III', disciplinas: [
        { nome: 'Cardiologia', ch: 40 },
        { nome: 'Dietoterapia', ch: 40 },
        { nome: 'Enfermagem em Unidade de Terapia Intensiva', ch: 40 },
        { nome: 'Enfermagem em Urgência e Emergência', ch: 40 },
        { nome: 'Introdução ao Trabalho Científico', ch: 40 },
        { nome: 'Fundamentos de Informática', ch: 20 },
        { nome: 'Gastroenterologia', ch: 20 },
        { nome: 'Geriatria', ch: 40 },
        { nome: 'Nefrologia', ch: 40 },
        { nome: 'Neurologia', ch: 40 },
        { nome: 'Queimaduras Graves', ch: 40 },
      ] },
    ],
    competenciasGerais: [
      'Identificar os fatores determinantes e condicionantes do processo saúde-doença.',
      'Identificar a estrutura e a organização do sistema de saúde vigente.',
      'Identificar as funções e responsabilidades dos membros da equipe multiprofissional.',
      'Planejar e organizar a atividade profissional na perspectiva da excelência no atendimento ao cliente /.',
      'Paciente.',
      'Realizar atividade multiprofissional integrando conhecimentos das diversas ciências, tendo em vista o caráter interdisciplinar da área de atuação em saúde.',
      'Aplicar as normas de higiene, saúde pessoal e ambiental.',
      'Identificar e aplicar princípios e normas de conservação dos recursos não renováveis e de preservação.',
      'Aplicar princípios ergonômicos na realização do trabalho.',
      'Avaliar riscos de iatrogenias ao executar procedimentos técnicos.',
      'Interpretar e aplicar normas do exercício profissional e princípios éticos que regem a conduta do.',
      'Profissional da área de atuação em saúde.',
      'Aplicar a legislação referente aos direitos do consumidor / usuário do sistema de saúde.',
      'Atuar conforme as rotinas e protocolos de trabalho avaliando o funcionamento das instalações e operando equipamentos próprios do campo de atuação.',
      'Registrar ocorrências dos serviços prestados de acordo com as exigências do campo de atuação.',
      'Informar ao cliente/paciente, ao sistema de saúde e aos outros profissionais da área sobre os procedimentos de trabalho executados.',
      'Orientar cliente / paciente a assumir com autonomia sua própria condição de saúde.',
      'Aplicar normas de biossegurança.',
      'Coletar, organizar e registrar dados relativos ao campo de atuação.',
      'Utilizar recursos e ferramentas de informática específicas para área de saúde.',
      'Prestar primeiros socorros em situação de emergência.',
    ],
    competenciasEspecificas: [
      'Integrar equipe multiprofissional que atua em saúde.',
      'Executar atividades específicas na prestação de assistência de enfermagem.',
      'Realizar cuidados de conforto, higiene e segurança ao cliente/paciente.',
      'Observar e registrar sinais e sintomas dos vários tipos de afecções, executando procedimentos técnicos de enfermagem específicos.',
      'Verificar sinais vitais.',
      'Administrar medicamentos conforme prescrição.',
      'Executar curativos.',
      'Orientar o cliente/pacientes quanto aos procedimentos pós-consulta, pós-alta, e pós-assistência domiciliar.',
      'Vacinar e registrar conforme calendário básico de vacinação do Ministério da Saúde e Programa.',
      'Nacional de Imunização (PNI).',
      'Contribuir na elaboração de planos de assistência de enfermagem através da absorção de informações colhidas junto aos pacientes, familiares e a comunidade “in locu”.',
      'Colaborar com o enfermeiro para o efetivo exercício de suas atividades.',
      'Orientar o Auxiliar de Enfermagem transmitindo-lhe instruções quanto ao seu desempenho no exercício profissional.',
      'Atuar como agente colaborar no desenvolvimento dos programas educativos focados nas ações comunitárias melhorando os indicadores da qualidade de vida da comunidade.',
    ],
  },
  {
    chave: 'RADIOLOGIA',
    cursoNome: 'Técnico em Radiologia',
    titulo: 'HISTÓRICO ESCOLAR DO CURSO TÉCNICO EM RADIOLOGIA',
    resolucao: 'Resolução CEE/GO nº 041/2022',
    termosCurso: ['RADIOLOGIA'],
    cargaEstagio: 400,
    cargaTotal: 1744,
    observacoes: 'Atividades extra-curriculares: 144 horas',
    modulos: [
      { nome: 'MÓDULO I', disciplinas: [
        { nome: 'Primeiros Socorros', ch: 40 },
        { nome: 'Biossegurança nas Ações de Saúde', ch: 40 },
        { nome: 'Psicologia do Trabalho em Saúde', ch: 40 },
        { nome: 'Química Aplic.á Radiologia', ch: 40 },
        { nome: 'Anatomia I', ch: 80 },
        { nome: 'Fisiologia', ch: 40 },
        { nome: 'Patologia Aplicada à Radiologia I', ch: 40 },
        { nome: 'Técnicas Radiográficas I', ch: 80 },
      ] },
      { nome: 'MÓDULO II', disciplinas: [
        { nome: 'Física das Radiações', ch: 40 },
        { nome: 'Proteção e Higiene das Radiações I', ch: 40 },
        { nome: 'Equipamentos e Acessórios Radiológicos', ch: 40 },
        { nome: 'Anatomia II', ch: 80 },
        { nome: 'Ética e Legislação', ch: 40 },
        { nome: 'Técnicas Radiográficas II', ch: 80 },
        { nome: 'Patologia Aplicada à Radiologia II', ch: 40 },
        { nome: 'Efeitos B. dos M. de Cont. das Rad. Ionizantes', ch: 40 },
      ] },
      { nome: 'MÓDULO III', disciplinas: [
        { nome: 'Proteção e Higiene das Radiações II', ch: 40 },
        { nome: 'Mamografia', ch: 40 },
        { nome: 'Densitometria Óssea', ch: 40 },
        { nome: 'Tomografia Computadorizada', ch: 40 },
        { nome: 'Radiologia Buco-Maxilo-Facial', ch: 40 },
        { nome: 'Noções de Radioterapia', ch: 40 },
        { nome: 'Saúde Coletiva', ch: 40 },
        { nome: 'Introdução ao Trabalho Científico', ch: 20 },
        { nome: 'Noções de Informática', ch: 20 },
        { nome: 'Ressonância Magnética Nuclear', ch: 40 },
        { nome: 'Gestão e Descarte de Resíduos Radiológicos', ch: 40 },
      ] },
    ],
    competenciasGerais: [
      'Identificar os fatores determinantes e condicionantes do processo saúde-doença.',
      'Identificar a estrutura e a organização do sistema de saúde vigente.',
      'Identificar as funções e responsabilidades dos membros da equipe multiprofissional.',
      'Planejar e organizar a atividade profissional na perspectiva da excelência no atendimento ao cliente /.',
      'Paciente.',
      'Realizar atividade multiprofissional integrando conhecimentos das diversas ciências, tendo em vista o caráter interdisciplinar da área de atuação em saúde.',
      'Aplicar as normas de higiene, saúde pessoal e ambiental.',
      'Identificar e aplicar princípios e normas de conservação dos recursos não renováveis e de preservação.',
      'Aplicar princípios ergonômicos na realização do trabalho.',
      'Avaliar riscos de iatrogenias ao executar procedimentos técnicos.',
      'Interpretar e aplicar normas do exercício profissional e princípios éticos que regem a conduta do.',
      'Profissional da área de atuação em saúde.',
      'Aplicar a legislação referente aos direitos do consumidor / usuário do sistema de saúde.',
      'Atuar conforme as rotinas e protocolos de trabalho avaliando o funcionamento das instalações e operando equipamentos próprios do campo de atuação.',
      'Registrar ocorrências dos serviços prestados de acordo com as exigências do campo de atuação.',
      'Informar ao cliente/paciente, ao sistema de saúde e aos outros profissionais da área sobre os procedimentos de trabalho executados.',
      'Orientar cliente / paciente a assumir com autonomia sua própria condição de saúde.',
      'Aplicar normas de biossegurança.',
      'Coletar, organizar e registrar dados relativos ao campo de atuação.',
      'Utilizar recursos e ferramentas de informática específicas para área de saúde.',
      'Prestar primeiros socorros em situação de emergência.',
    ],
    competenciasEspecificas: [
      'Manejar aparelhos de raios X e outros equipamentos próprios do campo de atuação, zelando pela sua manutenção.',
      'Selecionar os filmes a serem utilizados de acordo com o procedimento radiográfico solicitado pelo médico.',
      'Orientar o paciente quanto ao preparo e precauções para a realização do exame.',
      'Preparar o chassi, écran e o filme para a obtenção da imagem radiográfica.',
      'Identificar as radiografias com segurança objetivando a excelência no diagnóstico.',
      'Preparar o paciente para a realização do exame no tocante a vestimenta apropriada, posicionamento e aos quesitos de proteção radiológica.',
      'Realizar ajustes nos aparelhos e escolher os acessórios para obtenção da imagem radiográfica.',
      'Operar os aparelhos em observância das instruções de funcionamento do fabricante.',
      'Reconhecer os métodos de processamento da imagem através dos modos manual e/ou automático.',
      'Identificar a necessidade do uso de protetores radiológicos em determinadas técnicas radiológicas.',
      'Registrar dados referentes ao exame como: nome do paciente e do técnico, número de radiografias, tipos de incidências e técnicas realizadas.',
      'Preencher relatórios periódicos para análise com objetivo de otimizar as rotinas de trabalho da instituição.',
      'Identificar e solicitar reparos na aparelhagem.',
    ],
  },
  {
    chave: 'SEGURANCA',
    cursoNome: 'Técnico em Segurança do Trabalho',
    titulo: 'HISTÓRICO ESCOLAR DO CURSO TÉC. EM SEG. DO TRABALHO',
    resolucao: 'Resolução CEE/GO nº 221/2019',
    termosCurso: ['SEGURANÇA', 'SEGURANCA'],
    cargaEstagio: 240,
    cargaTotal: 1440,
    observacoes: '',
    modulos: [
      { nome: 'MÓDULO I', disciplinas: [
        { nome: 'Segurança e Saúde Ocupacional I', ch: 80 },
        { nome: 'Desenho Técnico', ch: 40 },
        { nome: 'Psicologia Organizacional e do Trabalho', ch: 40 },
        { nome: 'Legislação Trabalhista e Previdenciária', ch: 80 },
        { nome: 'Expressão e Comunicação', ch: 40 },
        { nome: 'Relações Humanas no Trabalho', ch: 40 },
        { nome: 'Primeiros Socorros', ch: 40 },
        { nome: 'Informática Básica', ch: 40 },
      ] },
      { nome: 'MÓDULO II', disciplinas: [
        { nome: 'Ergonomia do Trabalho', ch: 40 },
        { nome: 'Legislação e Normas Técnicas I', ch: 120 },
        { nome: 'Segurança e Saúde Ocupacional II', ch: 80 },
        { nome: 'Epidemiologia e Toxicologia', ch: 40 },
        { nome: 'Higiene e Saneamento no Trabalho', ch: 40 },
        { nome: 'Prevenção e Combate a Catástrofes e Sinistros', ch: 80 },
      ] },
      { nome: 'MÓDULO III', disciplinas: [
        { nome: 'Educação Ambiental', ch: 40 },
        { nome: 'Legislação e Normas Técnicas II', ch: 120 },
        { nome: 'Programas Prevencionistas', ch: 120 },
        { nome: 'Investigação e Análise de Acidentes', ch: 40 },
        { nome: 'SGI – Sistema de Gestão Integrada: Qualidade, Meio Ambiente, Segurança e Saúde no trabalho.', ch: 80 },
      ] },
    ],
    competenciasGerais: [
      'Identificar e estabelecer diretrizes e normas básicas de prevenção de acidentes no trabalho, de forma a consegir avaliar as condições a que estão expostos os trabalhadores.',
      'Conhecer os equipamentos de proteção individual (EPI\'s), suas características, identificação, certificação e modo de ultilização.',
      'Identificar a necessidade de sinalização nos ambientes de trabalho e propor a adoção da mesma em conformidade com a NR-26.',
      'Prevenir, controlar e avaliar a contaminação do meio ambiente pro meio da utilização de técnicas adequadas de transporte, armazenamento e descarte de resíduos sólidos e/ou líquidos.',
      'Reconhecer a estrutura e conteúdo da personalidade humana, referente aos fatores físicos, biológicos, psíquicos e sócio-culturais.',
      'Conhecer as técnicas de dinâmicas de grupo aplicadas ao treinamento.',
      'Analisar os serviços e funções de sistemas operacionais, utilizando suas ferramentas e recursos em atividades de configuração, manipulação de arquivos, segurança e outras.',
      'Coordenar atividades de garantia da segurança dos dados armazenados em sistemas cumputacionais, efetuando cópias de segurança, restauração de dados e atividades de prevençã, detecção e remoção de vírus.',
      'Estabelecer relação entre o trabalho e a saúde do trabalhador e compreeeder as interfaces com o meio ambiente.',
      'Atuar como cidadão e proficional de Saúde na prestação de primeiros socorros a vítima de acidentes ou mal súbito visando manter a vida e prevenir complicações até a chegada de atendimento médico.',
      'Estruturar e desenvolver avaliação ergonômica nos ambientes de trabalho em suas variadas condições, relacionadas ao levantamento, transporte e descarga de materiais, ao mobiliário, aos equipamentos e às condições ambientais do posto de trabalho, e à própria organização do trabalho.',
      'Conhecer as entidades de classes e as organizações de interesses da área: Ambiente, Saúde e Segurança e de defesa das cidadanias.',
      'Avaliar os perigos e riscos que caracterizam o trabalho.',
      'Avaliar os impactos das tecnologias nos processos de produção, buscando reduzir os riscos oriundos dos novos procesos.',
      'Conhecer as fontes e meios de contaminação.',
      'Elaborar projetos de sinalização para identificação da proteção ativa.',
      'Interpretar os dispositivos legais (Normas Regulamentadoras) que orientam a formação e exercício dos proficionais de segurança do trabalho.',
      'Interpretar plantas, desenhos e croquis de uma organização, tendo como foco os ambientes de trabalho.',
      'Elaborar programas prevencionais para neutralizar ou minimizar os riscos ambientais e ocupacionais adivindos do proceso ou do ambiente de trabalho.',
      'Definir metodologias e recursos utilizados na inverstigação de acidentes.',
      'Avaliar e mensurar as ações corretivas desenvolvidas pelo SESMT.',
    ],
    competenciasEspecificas: [
      'Planejar a política de segurança do trabalho.',
      'Acompanhar a implantação de políticas de segurança do trabalho.',
      'Elaborar e acompanhar programas preventivos e corretivos.',
      'Validar indicadores de eficiência e eficácia.',
      'Verificar implementação de ações preventivas e corretivas.',
      'Realizar análises preliminares dos riscos ambientais.',
      'Avaliar procedimentos de atendimentos emergenciais.',
      'Supervisionar procedimentos técnicos.',
      'Promover ações educativas em segurança do trabalho.',
      'Elaborar recursos e materiais didáticos de ações educativas de segurança.',
      'Elaborar laudos periciais.',
      'Exigir o cumprimento das cláusulas contratuais relativas à segurança do trabalho.',
      'Avaliar impacto da adoção.',
      'Documentar procedimentos e normas de sistemas de segurança.',
      'Selecionar metodologia para investigação de acidentes.',
      'Demonstrar capacidade de observação técnica.',
    ],
  },
];

/**
 * Acha o modelo do curso do aluno. Devolve null se nenhum servir.
 *
 * O CASAMENTO É PELO TERMO MAIS ESPECÍFICO, não pelo primeiro encontrado.
 * "Técnico em Enfermagem EAD" contém "ENFERMAGEM", então bateria também no
 * modelo presencial. Comparando o tamanho do termo, "ENFERMAGEM EAD" ganha
 * de "ENFERMAGEM" e o aluno recebe o histórico certo.
 */
export function modeloDoCurso(nomeCurso?: string): ModeloHistorico | null {
  const c = (nomeCurso || '').toUpperCase();
  if (!c) return null;

  let melhor: ModeloHistorico | null = null;
  let tamanho = 0;
  for (const m of MODELOS_HISTORICO) {
    for (const t of m.termosCurso) {
      if (c.includes(t.toUpperCase()) && t.length > tamanho) {
        melhor = m;
        tamanho = t.length;
      }
    }
  }
  return melhor;
}

/**
 * Resoluções que a escola já usou. A secretaria escolhe qual sai no
 * cabeçalho, porque o histórico de aluno antigo precisa trazer a resolução
 * vigente na época em que ele cursou, e não a de hoje. Também dá para
 * digitar uma que não esteja na lista.
 */
export const RESOLUCOES_DISPONIVEIS: string[] = [
  'Resolução CEE/GO nº 018/2022',
  'Resolução CEE/GO nº 041/2022',
  'Resolução CEE/GO nº 221/2019',
  'Resolução CEE/CEP nº 059/2023',
  'Resolução CEE/GO nº 018/2006',
  'Resolução CEE/GO nº 036/2008',
  'Resolução CEE/GO nº 034/2009',
  'Resolução CEE/GO nº 014/2010',
  'Resolução CEE/GO nº 092/2018',
];

/**
 * CONCEITO POR LETRA.
 * O histórico completo imprime letra, não número — a legenda impressa no
 * rodapé é a fonte: A (86 a 100), B (76 a 85), C (60 a 75), D (00 a 59).
 * As notas do portal são de 0 a 10, então multiplicamos por 10 antes de
 * comparar. Nota vazia devolve traço, e não "D", porque não lançada é
 * diferente de reprovado.
 */
export function conceitoDaNota(nota: number | null | undefined): string {
  if (nota === null || nota === undefined || isNaN(nota)) return '----';
  const p = nota <= 10 ? nota * 10 : nota;
  if (p >= 86) return 'A';
  if (p >= 76) return 'B';
  if (p >= 60) return 'C';
  return 'D';
}

export const LEGENDA_CONCEITOS = 'A - 86 a 100     B - 76 a 85     C - 60 a 75     D - 00 a 59';
