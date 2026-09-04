/**
 * DIPLOMAS E CERTIFICADOS — modelos.
 *
 * São TRÊS DOCUMENTOS JURIDICAMENTE DIFERENTES, não variações do mesmo:
 *
 *  1) DIPLOMA — "a Habilitação Profissional de:". Para quem concluiu um curso
 *     técnico completo. Base: Decreto Federal 5.154/2004.
 *
 *  2) CERTIFICADO DE AUXILIAR — "o curso de Qualificação Técnica em:". Para
 *     quem concluiu os módulos I e II do Técnico em Enfermagem. Base:
 *     Decreto Federal 2.208/1997, que é OUTRO decreto, mais antigo. Não é
 *     engano de digitação da escola: qualificação técnica se apoia nele.
 *
 *  3) CERTIFICADO DE ESPECIALIZAÇÃO — "a Especialização Técnica em:". Usado
 *     na Instrumentação Cirúrgica, que é especialização de quem já é técnico.
 *     Traz um histórico no verso, com componentes, conceito e competências.
 *
 * Tudo aqui é PADRÃO DE FÁBRICA e pode ser editado na tela antes de imprimir.
 * O texto legal foi transcrito palavra por palavra dos arquivos oficiais.
 */

export type TipoDiploma = 'DIPLOMA' | 'CERTIFICADO_AUXILIAR' | 'CERTIFICADO_ESPECIALIZACAO';

export interface ModeloDiploma {
  tipo: TipoDiploma;
  nome: string;
  explica: string;
  /** Termos que o curso do aluno precisa conter. Vazio = qualquer curso. */
  termosCurso?: string[];
  /** Parágrafo legal de abertura. Contém {{RESOLUCAO}}. */
  textoLegal: string;
  /** Linha que apresenta o que foi concluído. Contém {{CONCLUSAO}} e {{CURSO}}. */
  linhaConclusao: string;
  /** Parágrafo de fecho. */
  textoFecho: string;
  /** Palavra grande impressa no fecho: DIPLOMA ou CERTIFICADO. */
  palavraDocumento: string;
}

export const MODELOS_DIPLOMA: ModeloDiploma[] = [
  {
    tipo: 'DIPLOMA',
    nome: 'Diploma de Curso Técnico',
    explica: 'Para quem concluiu um curso técnico completo, com estágio.',
    textoLegal:
      'Nos termos da Lei nº 9.394 de 29 de dezembro de 1996, Decreto Federal nº 5.154 de 23 de julho de 2004, Parecer CNE/CEB nº 16 de 08 de outubro de 1999, Resolução CNE/CEB nº 04 de 08 de dezembro de 1999, Lei Complementar Estadual nº 26 de 28 de dezembro de 1998 e de acordo com a {{RESOLUCAO}} do Conselho Estadual de Educação, a direção do Colégio Oswaldo Cruz confere a:',
    linhaConclusao:
      'Natural de {{NATURAL}} Estado {{UF}}, nascido(a) em {{NASCIMENTO}} por ter concluído em {{CONCLUSAO}} a Habilitação Profissional de :',
    textoFecho:
      'Área da Saúde, o Presente DIPLOMA que outorga os diretos e prerrogativas a ele inerentes com validade em todo o Território Nacional.',
    palavraDocumento: 'DIPLOMA',
  },
  {
    tipo: 'CERTIFICADO_AUXILIAR',
    nome: 'Certificado de Auxiliar de Enfermagem',
    explica: 'Qualificação técnica de quem concluiu os módulos I e II. Só para alunos de Enfermagem.',
    termosCurso: ['ENFERMAGEM'],
    textoLegal:
      'Nos termos da Lei nº 9.394 de 20 de dezembro de 1.996, Decreto Federal nº 2.208 de 17 de abril de 1.997, Parecer CNE / CEB nº 16 de 08 de outubro de 1.999, Resolução CNE / CEB nº 04 de 08 de dezembro de 1.999, Lei Complementar Estadual nº 26 de 28 de dezembro de 1.998 e de acordo com a {{RESOLUCAO}} do Conselho Estadual de Educação, a direção do Colégio Oswaldo Cruz confere a :',
    linhaConclusao:
      'Natural de {{NATURAL}} Estado {{UF}} nascido(a) em {{NASCIMENTO}} por ter concluído em {{CONCLUSAO}} o curso de Qualificação Técnica em:',
    textoFecho:
      'O presente CERTIFICADO que outorga os direitos e prerrogativas a ele inerentes com validade em todo território Nacional.',
    palavraDocumento: 'CERTIFICADO',
  },
  {
    tipo: 'CERTIFICADO_ESPECIALIZACAO',
    nome: 'Certificado de Especialização Técnica',
    explica: 'Especialização de quem já é técnico. É o caso da Instrumentação Cirúrgica.',
    textoLegal:
      'Nos termos da Lei nº 9.394 de 20 de dezembro de 1.996, Decreto Federal nº 5.154 de 23 de julho de 2.004, Parecer CNE/CEB nº 16 de 08 de outubro de 1.999, Resolução CNE/CEB nº 04 de 08 de outubro de 1.999, Lei complementar Estadual nº 26 de 28 de dezembro de 1.998, e de acordo com a {{RESOLUCAO}} do Conselho Estadual de Educação, a direção do Colégio Oswaldo Cruz confere a:',
    linhaConclusao:
      'Natural de {{NATURAL}} Estado {{UF}} nascido(a) em {{NASCIMENTO}} por ter concluído em {{CONCLUSAO}} a Especialização Técnica em:',
    textoFecho:
      'Área de Saúde, o presente CERTIFICADO que outorga os direitos e prerrogativas a ele inerentes com validade em todo Território Nacional.',
    palavraDocumento: 'CERTIFICADO',
  },
];

/** Resolução citada no texto legal, por curso. Editável na tela. */
export const RESOLUCOES_DIPLOMA: { rotulo: string; texto: string }[] = [
  { rotulo: 'Enfermagem / Auxiliar / Instrumentação', texto: 'Resolução nº 018 de 24 de fevereiro de 2022' },
  { rotulo: 'Radiologia', texto: 'Resolução nº 041 de 26 de agosto de 2022' },
  { rotulo: 'Segurança do Trabalho', texto: 'Resolução nº 221 de 13 de dezembro de 2019' },
  { rotulo: 'Enfermagem EAD', texto: 'Resolução nº 059 de 22 de setembro de 2023' },
];

export function resolucaoSugeridaDiploma(nomeCurso?: string): string {
  const c = (nomeCurso || '').toUpperCase();
  if (c.includes('RADIOLOGIA')) return RESOLUCOES_DIPLOMA[1].texto;
  if (c.includes('SEGURANÇA') || c.includes('SEGURANCA')) return RESOLUCOES_DIPLOMA[2].texto;
  if (c.includes('EAD')) return RESOLUCOES_DIPLOMA[3].texto;
  return RESOLUCOES_DIPLOMA[0].texto;
}

/** Trava por curso, igual à das declarações. */
export function cursoPermiteDiploma(m: ModeloDiploma, nomeCurso?: string): boolean {
  if (!m.termosCurso || m.termosCurso.length === 0) return true;
  const c = (nomeCurso || '').toUpperCase();
  if (!c) return false;
  return m.termosCurso.some(t => c.includes(t.toUpperCase()));
}

/** Campos do verso, preenchidos à mão pela secretaria. */
export interface VersoDiploma {
  cursoAnterior: string;
  unidadeEscolar: string;
  localDataConclusao: string;
  observacoes: string;
  registro: string;
  livro: string;
  folha: string;
}

export const VERSO_VAZIO: VersoDiploma = {
  cursoAnterior: '', unidadeEscolar: '', localDataConclusao: '',
  observacoes: '', registro: '', livro: '', folha: '',
};

/** Observação padrão do Certificado de Auxiliar, transcrita do modelo. */
export const OBSERVACAO_AUXILIAR =
  'Este certificado foi expedido a pedido de seu portador, uma vez que o mesmo alcançou todas as competências curriculares dos módulos I e II, indispensáveis ao perfil profissional para a Qualificação Técnica em Auxiliar de Enfermagem conforme as prerrogativas previstas no Plano de Curso deste estabelecimento de ensino de acordo com a Lei Federal Nº 9394/96; Decreto Federal 5154/2004; Parecer CNE/CEB Nº 16/1999; Resolução CNE/CEB Nº 04/1999; Lei Complementar Estadual Nº 26/1998 e Resolução CEE/GO Nº 018/2022';
