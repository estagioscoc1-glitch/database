/**
 * TEXTO PADRÃO DAS DECLARAÇÕES.
 *
 * Igual ao que foi feito com o contrato: o que está aqui é o PADRÃO DE
 * FÁBRICA. Quando a secretaria edita um modelo na tela "Editar Modelos", a
 * versão editada vai para a tabela declaracoes_modelos e passa a valer. Se
 * ninguém nunca editar, vale o que está escrito neste arquivo.
 *
 * Os campos entre chaves duplas são trocados pelos dados reais na hora de
 * gerar. A lista completa está em CAMPOS_DECLARACAO, no fim do arquivo, e
 * aparece como legenda dentro do editor.
 */

export type TipoDeclaracao =
  | 'CONCLUSAO'
  | 'AUXILIAR_ENFERMAGEM'
  | 'ESCOLARIDADE'
  | 'SETRANSP'
  | 'VACINA';

export interface ModeloDeclaracao {
  tipo: TipoDeclaracao;
  /** Nome curto que aparece na lista de escolha. */
  nome: string;
  /** Para que serve — texto de ajuda mostrado ao atendente. */
  explica: string;
  /** Título grande impresso no meio da folha. */
  titulo: string;
  /** Parágrafos do corpo. Podem conter {{CAMPOS}}. */
  paragrafos: string[];
  /** Mostra o rodapé com endereço e telefone da escola. */
  mostrarRodape: boolean;
  /** Mostra a assinatura do secretário. */
  mostrarAssinatura: boolean;
  /**
   * Campos que esta declaração pede à mão porque não existem no cadastro
   * (ex.: a data em que o aluno concluiu o curso). Aparecem como caixas de
   * preenchimento antes de gerar.
   */
  camposManuais?: { chave: string; rotulo: string; tipo: 'texto' | 'data' }[];
}

export const MODELOS_PADRAO: ModeloDeclaracao[] = [
  {
    tipo: 'CONCLUSAO',
    nome: 'Declaração de Conclusão',
    explica: 'Para o aluno que terminou um curso técnico. Usada enquanto o diploma não fica pronto.',
    titulo: 'Declaração de Conclusão',
    paragrafos: [
      'Declaramos para os devidos fins que {{ALUNO}}, filho(a) de {{FILIACAO}}, nascido(a) em {{NATURALIDADE}} no dia {{NASCIMENTO}} concluiu o curso de {{CURSO}}, em {{DATA_CONCLUSAO}}.',
    ],
    mostrarRodape: true,
    mostrarAssinatura: true,
    camposManuais: [
      { chave: 'DATA_CONCLUSAO', rotulo: 'Data em que concluiu o curso', tipo: 'data' },
    ],
  },
  {
    tipo: 'AUXILIAR_ENFERMAGEM',
    nome: 'Declaração de Auxiliar de Enfermagem',
    explica: 'Qualificação intermediária, para quem concluiu os módulos I e II do Técnico em Enfermagem.',
    titulo: 'Declaração',
    paragrafos: [
      'Declaramos para os devidos fins que {{ALUNO}}, filho(a) de {{FILIACAO}}, natural de {{NATURALIDADE}}, nascido(a) em {{NASCIMENTO}}. Concluiu a Qualificação de Auxiliar de Enfermagem em {{DATA_QUALIFICACAO}}, uma vez que a mesma alcançou todas as competências curriculares dos módulos I e II, conforme as prerrogativas previstas no plano de curso deste estabelecimento de ensino de acordo com a Lei Federal Nº 9394/96; Decreto Federal 5154/2004; parecer CNE/CEB Nº 16/1999; Resolução CNE/CEB Nº 04/1999; Lei complementar Estadual Nº 26/1998 e Resolução CEE/GO Nº 018/2022.',
      'O Certificado será entregue conforme requerimento no dia {{DATA_CERTIFICADO}}.',
    ],
    mostrarRodape: true,
    mostrarAssinatura: true,
    camposManuais: [
      { chave: 'DATA_QUALIFICACAO', rotulo: 'Data em que concluiu a qualificação', tipo: 'data' },
      { chave: 'DATA_CERTIFICADO', rotulo: 'Data de entrega do certificado', tipo: 'data' },
    ],
  },
  {
    tipo: 'ESCOLARIDADE',
    nome: 'Declaração de Escolaridade',
    explica: 'Atesta matrícula ativa e frequência regular. O aluno também emite esta pelo painel dele.',
    titulo: 'Declaração',
    paragrafos: [
      'Declaramos, para os devidos fins, que o aluno {{ALUNO}}, está regularmente matriculado neste estabelecimento de ensino, no curso {{CURSO}}, com número de matrícula {{MATRICULA}}. O referido aluno está matriculado no turno {{TURNO}}, com início em {{INICIO}} e término do curso na data de {{TERMINO}}.',
    ],
    mostrarRodape: true,
    mostrarAssinatura: true,
    camposManuais: [
      { chave: 'INICIO', rotulo: 'Início do curso', tipo: 'data' },
      { chave: 'TERMINO', rotulo: 'Término do curso', tipo: 'data' },
    ],
  },
  {
    tipo: 'SETRANSP',
    nome: 'Declaração de SETRANSP (passe escolar)',
    explica: 'Para o cadastro do passe estudantil meia-tarifa. O aluno também emite esta pelo painel dele.',
    titulo: 'Declaração',
    paragrafos: [
      'Declaramos para os fins de AQUISIÇÃO DE PASSE ESCOLAR junto SETRANSP, que {{ALUNO}} é aluno (a) deste Estabelecimento de Ensino no curso de {{CURSO}}, com o número de matrícula {{MATRICULA}} com início em {{INICIO}} e término em {{TERMINO}}.',
    ],
    mostrarRodape: true,
    mostrarAssinatura: true,
    camposManuais: [
      { chave: 'INICIO', rotulo: 'Início do módulo', tipo: 'data' },
      { chave: 'TERMINO', rotulo: 'Término do módulo', tipo: 'data' },
    ],
  },
  {
    tipo: 'VACINA',
    nome: 'Declaração de Vacina (estágio)',
    explica: 'Encaminhamento à Secretaria Municipal de Saúde para o campo de estágio.',
    titulo: 'Declaração',
    paragrafos: [
      'A Gerência de Estágios do Colégio Oswaldo Cruz, vem por intermédio desta, declarar junto à Secretaria Municipal de Saúde desse município que o Sr (a). {{ALUNO}} é aluno (a) desta instituição de ensino e está regularmente matriculado no Curso Técnico em {{CURSO}}, para o {{SEMESTRE}}.',
    ],
    mostrarRodape: true,
    mostrarAssinatura: true,
    camposManuais: [
      { chave: 'SEMESTRE', rotulo: 'Semestre (ex.: 2º semestre de 2026)', tipo: 'texto' },
    ],
  },
];

/** Legenda mostrada à secretaria dentro do editor. */
export const CAMPOS_DECLARACAO: { campo: string; explica: string }[] = [
  { campo: '{{ALUNO}}', explica: 'Nome do aluno, em maiúsculas' },
  { campo: '{{MATRICULA}}', explica: 'Número de matrícula' },
  { campo: '{{CURSO}}', explica: 'Curso, puxado da turma do aluno' },
  { campo: '{{MODULO}}', explica: 'Módulo, puxado da turma do aluno' },
  { campo: '{{TURNO}}', explica: 'Turno da turma (matutino, vespertino, noturno)' },
  { campo: '{{FILIACAO}}', explica: 'Pai e mãe, como estão na ficha' },
  { campo: '{{MAE}}', explica: 'Só o nome da mãe' },
  { campo: '{{PAI}}', explica: 'Só o nome do pai' },
  { campo: '{{NASCIMENTO}}', explica: 'Data de nascimento por extenso' },
  { campo: '{{NATURALIDADE}}', explica: 'Cidade e estado de nascimento' },
  { campo: '{{CPF}}', explica: 'CPF do aluno' },
  { campo: '{{RG}}', explica: 'RG do aluno' },
  { campo: '{{DATA}}', explica: 'Data de emissão, por extenso' },
];
