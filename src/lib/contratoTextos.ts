/**
 * TEXTO PADRÃO DOS CONTRATOS — transcrito dos modelos oficiais da escola.
 *
 * POR QUE ESTE ARQUIVO EXISTE SEPARADO:
 * A secretaria precisa poder editar o contrato sem depender de programador.
 * Então o texto daqui é só o PADRÃO DE FÁBRICA. Quando alguém edita o modelo
 * na tela "Modelos de Contrato", a versão editada é gravada na tabela
 * contratos_modelos do banco e passa a valer no lugar deste arquivo. Se nunca
 * ninguém editar, vale o que está aqui.
 *
 * Os campos entre chaves duplas — {{NOME}}, {{MODULO}}, {{CURSO}} etc. — são
 * trocados pelos dados reais na hora de gerar. A lista completa dos campos
 * disponíveis está em CAMPOS_DISPONIVEIS, no fim deste arquivo, e aparece
 * como legenda para a secretaria dentro do editor.
 */

export interface ClausulaContrato {
  titulo: string;
  paragrafos: string[];
}


// ---------------------------------------------------------------------------
// TEXTO DO CONTRATO — PRESENCIAL (todos os cursos menos EAD)
// Transcrito do PDF oficial da escola. Resolução CEE/GO nº 092/2018.
// ---------------------------------------------------------------------------
export const CLAUSULAS_PRESENCIAL: ClausulaContrato[] = [
  {
    titulo: 'Cláusula Primeira',
    paragrafos: [
      'O objeto do presente acordo é a prestação de todos os serviços educacionais a partir de {{ANO}}, correspondentes ao {{MODULO}}º módulo do curso {{CURSO}} a ser ministrado conforme a legislação de ensino em vigor e o plano de curso dessa Instituição de Ensino, o qual se obriga a acolher o estudante beneficiário no preâmbulo deste.',
      '§1º - Como serviços mencionados nesta cláusula se entendem os obrigatoriamente prestados a toda turma, coletivamente, não incluídos os facultativos, de caráter individual ou de grupo, tais como: avaliação de 2ª chamada, realização de estágios quando o estudante for reprovado no primeiro encaminhamento, Progressão Parcial e alhures.',
      '§ 2º - Quando indeferido a solicitação para a realização da 2ª Chamada de Avaliações o/a estudante pagará 10% do valor da mensalidade vigente por cada avaliação agendada conforme Calendário Escolar.',
      '§ 3º - O estudante beneficiário estará sujeito às normas do Plano de Curso e do Regimento Interno do CONTRATADO à disposição do 1º acordante; cujas determinações integram o presente instrumento para aplicação subsidiária e em casos omissos.',
      '§ 4º - O Colégio Oswaldo Cruz Ltda poderá a seu critério utilizar de recursos didáticos diversos, dentre eles: recursos multimídia e da internet para o desenvolvimento das atividades pedagógicas correspondentes aos cursos ministrados.',
    ],
  },
  {
    titulo: 'Cláusula Segunda',
    paragrafos: [
      'Pelos serviços educacionais referidos na cláusula primeira, o contratante pagará ao contratado o valor de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXT}}) para este módulo, sendo: {{ENTRADA}} ({{ENTRADA_EXT}}) no ato da celebração deste e o restante divido em {{NUM_PARCELAS}} parcelas mensais consecutivas, no valor de {{VALOR_PARCELA}} ({{VALOR_PARCELA_EXT}}) sendo que, com a pontualidade o contratante obterá um desconto para o pagamento.',
      '§ 1º - O vencimento de cada parcela ocorrerá até o dia 30 de cada mês.',
      '§ 2º - Será concedido um desconto, para o PAGAMENTO RIGOROSAMENTE até o quinto dia útil do mês subsequente a parcela vencida no dia 30. Sendo eles: turno matutino: {{DESC_MAT}}, turno vespertino: {{DESC_VESP}}, turno noturno: {{DESC_NOT}}. Não havendo o pagamento até o quinto dia útil subsequente, será devido o valor integral, acrescido de multa e demais encargos.',
      '§ 3º - Havendo transferência entre turnos o aluno deverá pagar o valor de acordo com o turno, perderá automaticamente o desconto recebido, devendo pagar o valor integral do semestre.',
      '§ 4º - A CONTRATADA, por liberdade, poderá oferecer condições especiais de pagamento sem que isso implique em modificação contratual, conforme vencimento das parcelas.',
      '§ 5º - Havendo atraso no pagamento de qualquer das parcelas descritas, o(a) contratante paga o valor nominal acrescido de multa contratual de 2% (dois por cento), acrescido de 0,033% de juros por dia de atraso.',
      '§ 6º - Após o 30º (trigésimo) dia do vencimento, o título poderá ser remetido para o cartório de protestos, para ser negativado junto aos serviços de proteção de créditos (SPC, SERASA e outros), e mover ações que couber através de advogados ou empresas especializadas em cobrança judicial de contratos e outros.',
      '§ 7º - Em caso de cobrança judicial as despesas, custas e honorários advocatícios são suportados pelo(a) Contratante.',
      '§ 8º - O aluno que não frequentar as aulas ou atividades escolares, e que não requerer o cancelamento, desistência, trancamento ou transferência de matrícula, não é desobrigado(a) do pagamento das parcelas do módulo vencidas e vincendas.',
      '§ 9º - Em caso de trancamento, desistência do curso ou pedido de transferência o(a) Contratante não é desobrigado ao pagamento das parcelas vencidas, inclusive, ao pagamento do mês em que é formalizado o respectivo pedido.',
      '§ 10º - A transferência, o cancelamento, a desistência e o trancamento da matrícula devem ser requeridos na secretaria e tesouraria por escrito, dependendo para a concessão definitiva da quitação de débitos a caso existentes.',
      '§ 11º - Não será devida a parcela com vencimento após o trigésimo dia da data em que o aluno oficialmente se desligar desse estabelecimento de ensino.',
      '§ 12º - Em caso de utilização por parte do(a) Contratante de bolsas de estudos de quaisquer natureza o mesmo é responsável pela renovação e demais procedimento para manutenção do benefício junto à parte concedente e a escola.',
      '§ 13º - O(a) Contratante manifesta ciência e concordância de que os valores referentes às disciplinas em dependências ofertadas em caráter extraordinário em horários alternativos e os custos com materiais de uso individual para as atividades de estágios e outras não são objeto de cobertura por bolsas de estudo.',
      '§ 14º - Os Custos referentes à Supervisão dos Estágios estão inclusos no valor total do curso. Para frequentar o campo de estágio o/a estudante deverá estar rigorosamente em dia com as parcelas do curso. Em caso de reprovação ou não comparecimento o/a estudante arcará com as despesas referentes à Supervisão do Estágio, para poder repeti-lo.',
      '§ 15º - O estudante favorecido com desconto de qualquer natureza perderá o benefício em decorrência do atraso da mensalidade.',
      '§ 16º - O aluno reprovado em qualquer Componente Curricular matricular-se-á para Progressão Parcial, onde estará ciente das taxas de custos operacionais, pagando 20% do valor da mensalidade vigente por componente curricular, durante todo o semestre, em relação ao horário será em contra turno.',
      '§ 17º - Caso o aluno solicite a análise de itinerário curricular e/ou ementa para o fim de Aproveitamento de Estudos, o mesmo arcará com as despesas para montagem da banca examinadora que corresponde ao valor de 01 (uma) mensalidade do curso técnico solicitado.',
    ],
  },
  {
    titulo: 'Cláusula Terceira',
    paragrafos: [
      'Conforme Parecer CNE/CEB nº 16/99 item 7 no 5º parágrafo; Resolução CNE/CEB Nº 1 de 21 de Janeiro de 2004, artigo 2º inciso 4º, para a Conclusão do Curso Técnico em Nível Médio, o aluno terá o prazo de cinco anos transcorridos entre a Matrícula Inicial e a Conclusão do Módulo III (Aulas Teóricas + Estágios Supervisionados) para obtenção do título de Técnico em Nível Médio.',
      '§ 1º - Conforme o Regimento Interno dessa Instituição de Ensino, a vigência do contrato do aluno é de dois anos e seis meses, devendo a matrícula ser renovada semestralmente, sendo que, concluindo o curso em um ano e meio o aluno tem mais um ano para a conclusão de todas as atividades pedagógicas, não concluindo neste período terá que renovar o contrato pagando um novo semestre até a conclusão das atividades pedagógicas.',
      '§ 2º - Para que se iniciem as aulas, as novas turmas deverão ter no mínimo 35 alunos matriculados. Caso contrário haverá o cancelamento e a devolução do valor inicial.',
    ],
  },
  {
    titulo: 'Cláusula Quarta',
    paragrafos: [
      'O CONTRATADO se reserva o direito de cancelar esse contrato e a matrícula, expedindo a transferência do aluno, nas seguintes condições:',
      '§ 1º - Por motivo disciplinar, de incompatibilidade com o Regimento Escolar e Normas Internas, bem como no caso de divergência ou conflito entre as partes.',
      '§ 2º - Por comprovada utilização de documentos e informações falsas, fraudes, ilícitos ou atos contraditórios às normas institucionais, em benefício próprio ou de terceiros. Nesse caso a autoridade competente é comunicada.',
      '§ 3º - Em caso de cancelamento deste contrato por parte do CONTRATANTE, por quaisquer motivos, não haverá devolução, em nenhuma hipótese, do(s) valor(es) pago(s) ao COLÉGIO. Caso o cancelamento venha ocorrer após 8º (oitavo) dia da celebração deste, o contratante pagará, a título de multa rescisória, o valor correspondente a 25% (vinte e cinco por cento) do valor total do contrato.',
      '§ 4º - A matrícula para o período letivo seguinte não será aceita (ou será recusada), em caso de inadimplência, conforme autoriza o Artigo 5º da Lei 9.870/1999 em vigor, com o que concorda o CONTRATANTE.',
      '§ 5º - Os atos pedagógicos praticados por alunos não matriculados no semestre letivo não terão validade.',
    ],
  },
  {
    titulo: 'Cláusula Quinta',
    paragrafos: [
      'Não estão inclusos nas parcelas de cada módulo os materiais de uso individual, como: (camisetas, jalecos, crachá, seringas, luvas, garrote, máscaras, termômetro, aparelho para verificar pressão arterial e alhures), diplomas, certificados, declarações e material didático.',
      '§ 1º - O uso da camiseta de uniforme nas dependências do colégio é obrigatório durante todas as atividades pedagógicas desenvolvidas pelo aluno.',
      '§ 2º - No primeiro módulo o aluno deverá adquirir o material de biossegurança para as aulas práticas em laboratório contendo: o jaleco, o crachá de identificação para uso em campo de estágio e os materiais de uso individual, no valor de {{VALOR_BIOSSEGURANCA}} ({{VALOR_BIOSSEGURANCA_EXT}}). Sendo o jaleco considerado uniforme de uso obrigatório para todas as atividades práticas desenvolvidas no decorrer do curso.',
    ],
  },
  {
    titulo: 'Cláusula Sexta',
    paragrafos: [
      'Durante o período de estágio o aluno apresentará à instituição concedente o comprovante do seguro contra acidentes pessoais, nos termos do artigo 9 parágrafo IV da Lei 11.788/2008.',
    ],
  },
  {
    titulo: 'Cláusula Sétima',
    paragrafos: [
      'O aluno deverá ter disponibilidade de tempo fora do horário das aulas teóricas para a realização dos estágios supervisionados bem como para as visitas técnicas e o treinamento prático no C.T. de Caldas Novas, aplicado ao CURSO DE BOMBEIRO CIVIL, ficando o mesmo responsável pelas custas com transporte e alimentação.',
    ],
  },
  {
    titulo: 'Cláusula Oitava',
    paragrafos: [
      'Os materiais didáticos de consumo obrigatório, de uso individual nos diversos campos de estágios públicos e privados terão um custo de {{VALOR_MATERIAL}} ({{VALOR_MATERIAL_EXT}}) dividido nas parcelas 7ª, 8ª, 9ª, 10ª, 11ª, 12ª referentes ao módulo dois, não se aplicando aos cursos de: TÉCNICO EM SEGURANÇA DO TRABALHO E BOMBEIRO CIVIL.',
    ],
  },
  {
    titulo: 'Cláusula Nona',
    paragrafos: [
      'O CONTRATANTE autoriza desde já, sem ônus à CONTRATADA, a utilização de sua imagem para fins exclusivos de divulgação do Colégio Oswaldo Cruz e de suas atividades, assim como arquivar e publicar seus trabalhos de produção científica, de igual modo sem ônus à CONTRATADA, podendo para tanto utilizar como veículos a internet os jornais e todos os demais meios de comunicação, público ou privado, moralmente legítimos.',
    ],
  },
  {
    titulo: 'Cláusula Décima',
    paragrafos: [
      'A política de privacidade e proteção de dados da Contratada está em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados) que é aplicada para os fins específicos, explícitos e legítimos aos dados pessoais do(a) Contratante.',
    ],
  },
  {
    titulo: 'Cláusula Décima Primeira',
    paragrafos: [
      'Ao assinar o presente Contrato o(a) Contratante (pai/mãe ou responsável) concorda e dá o seu consentimento (conforme Termo anexado que integra este instrumento) para a coleta, tratamento e destinação dos dados pessoais, para o cadastro como estudante, para a matrícula e demais fins acadêmicos institucionais imprescindíveis para a entrega dos serviços educacionais e para a respectiva contrapartida.',
      '§ 1º - Os dados pessoais são atualizados pelo(a) Contratante sempre que houver alteração e são mantidos pela Contratada pelo tempo necessário e para as finalidades para as quais são coletados e processados.',
      '§ 2º - A Contratada assegura medidas técnicas e organizacionais apropriadas para proteger os dados pessoais do(a) Contratante contra alteração, perda acidental ou ilegal, ou de uso, divulgação ou acesso não autorizado, de acordo com uma adequada política de segurança de informações.',
      '§ 3º - A Contratada compartilha os dados pessoais do(a) Contratante, internamente ou com colaboradores devidamente autorizados, contratados/subcontratados para exercer as atividades administrativas de apoio aos serviços educacionais.',
      '§ 4º - A Contratada pode ser obrigada a divulgar os dados pessoais do(a) Contratante para as autoridades reguladoras, tribunais e agências governamentais, quando exigido por lei, regulamento ou processo legal, ou para defender os interesses, direitos ou propriedade da Instituição ou de terceiros relacionados.',
      '§ 5º - A Contratada não compartilha dados pessoais do(a) Contratante com outras partes, a não ser mediante o consentimento prévio e expresso e para os fins declarados.',
      '§ 6º - A Contratada utiliza os dados voluntariamente cedidos pelo(a) Contratante para comunicações diversas referentes a prestação dos serviços educacionais e outras relacionadas ao ensino, segmentações estatísticas e análises de perfil.',
      '§ 7º - A Contratada não solicita informações confidenciais, como número ou senha de cartão de crédito, ou login e senha de acesso aos serviços online no site da Instituição. Os demais dados pessoais do(a) Contratante que coleta são mantidos em sigilo e jamais são divulgados sem autorização, salvo quando exigido por Lei ou mediante determinação judicial.',
      '§ 8º - Para o cadastro e a respectiva matrícula o Contratante fornece o seu endereço de e-mail, pessoal e intransferível, endereço residencial completo, inscrição no cadastro de pessoas físicas/Ministério da Fazenda, título de eleitor, carteira de identidade, certidão de nascimento, certidão de casamento, certificado de reservista e outros documentos exigidos na legislação que não serão fornecidos a terceiros, a não ser por exigência legal.',
      '§ 9º - O(a) Contratante obriga-se a manter os dados descritos no parágrafo oitavo devidamente atualizados, durante todo o Curso, conforme disposição contida no Regimento Interno.',
      '§ 10 - A Contratada envia ao(a) Contratante mensagens eletrônicas e por telefone para tratar de assuntos referentes a entrega dos serviços educacionais e, outros, conexos.',
      '§ 11 - O(a) Contratante pode solicitar à Contratada: a) acesso aos seus dados pessoais; b) correção de dados pessoais imprecisos; c) ter dados pessoais incompletos completados; d) qualquer informação disponível sobre a fonte dos dados pessoais, e, e) cópia dos seus dados pessoais que estão sendo processados (tratados) pela Instituição.',
      '§ 12 - A política de privacidade e proteção de dados da Contratada pode ser alterada, caso em que o(a) Contratante é comunicado sobre a alteração.',
    ],
  },
  {
    titulo: 'Cláusula Décima Segunda',
    paragrafos: [
      'Fica eleito o foro da Comarca de Goiânia-GO, para dirimir todas e quaisquer questões oriundas deste instrumento, renunciando-se expressamente a qualquer outro, por mais privilegiado que seja.',
    ],
  },
];

// ---------------------------------------------------------------------------
// TEXTO DO CONTRATO — EAD (Enfermagem a distância)
// Resolução CEE/CEP nº 059/2023. Difere do presencial principalmente na
// Cláusula Primeira (§1º sobre 50% EAD / 50% presencial) e na Cláusula
// Segunda (desconto por percentual, e não por turno).
// ---------------------------------------------------------------------------
export const CLAUSULAS_EAD: ClausulaContrato[] = [
  {
    titulo: 'Cláusula Primeira',
    paragrafos: [
      'O objeto do presente acordo é a prestação de todos os serviços educacionais a partir de {{ANO}}, correspondentes ao {{MODULO}}º módulo do curso {{CURSO}} na modalidade a distância ("EaD"), a ser ministrado conforme a legislação de ensino em vigor e o plano de curso dessa Instituição de Ensino, o qual se obriga a acolher o estudante beneficiário no preâmbulo deste.',
      '§ 1º - Na modalidade a distância ("EaD"), o curso será oferecido conforme está previsto no Plano de Curso aprovado e o Regimento Interno da Instituição, sendo 50% com aulas EAD e 50% com aulas presenciais conforme calendário escolar.',
      '§ 2º - Como serviços mencionados nesta cláusula se entendem os obrigatoriamente prestados a toda turma, coletivamente, não incluídos os facultativos, de caráter individual ou de grupo, tais como: avaliação de 2ª chamada, realização de estágios quando o estudante for reprovado no primeiro encaminhamento, Progressão Parcial e alhures.',
      '§ 3º - Quando indeferido a solicitação para a realização da 2ª Chamada de Avaliações o/a estudante pagará 10% do valor da mensalidade vigente por cada avaliação agendada conforme Calendário Escolar.',
      '§ 4º - O estudante beneficiário estará sujeito às normas do Plano de Curso e do Regimento Interno do CONTRATADO à disposição do 1º acordante; cujas determinações integram o presente instrumento para aplicação subsidiária e em casos omissos.',
      '§ 5º - O Colégio Oswaldo Cruz Ltda poderá a seu critério utilizar de recursos didáticos diversos, dentre eles: recursos multimídia e da internet para o desenvolvimento das atividades pedagógicas correspondentes aos cursos ministrados.',
    ],
  },
  {
    titulo: 'Cláusula Segunda',
    paragrafos: [
      'Pelos serviços educacionais referidos na cláusula primeira, o contratante pagará ao contratado o valor de {{VALOR_TOTAL}} ({{VALOR_TOTAL_EXT}}) para este módulo, sendo: {{ENTRADA}} ({{ENTRADA_EXT}}) no ato da celebração deste e o restante divido em {{NUM_PARCELAS}} parcelas mensais consecutivas, sendo que, com a pontualidade o contratante obterá um desconto para o pagamento.',
      '§ 1º - O vencimento de cada parcela ocorrerá até o dia 30 de cada mês.',
      '§ 2º - Se o pagamento ocorrer até o quinto dia útil do mês o contratante obterá um desconto de {{DESC_EAD}} na parcela.',
      '§ 3º - A CONTRATADA, por liberdade, poderá oferecer condições especiais de pagamento sem que isso implique em modificação contratual, conforme vencimento das parcelas.',
      '§ 4º - Havendo atraso no pagamento de qualquer das parcelas descritas, o(a) contratante paga o valor nominal acrescido de multa contratual de 2% (dois por cento), acrescido de 0,033% de juros por dia de atraso.',
      '§ 5º - Após o 30º (trigésimo) dia do vencimento, o título poderá ser remetido para o cartório de protestos, para ser negativado junto aos serviços de proteção de créditos (SPC, SERASA e outros), e mover ações que couber através de advogados ou empresas especializadas em cobrança judicial de contratos e outros.',
      '§ 6º - Em caso de cobrança judicial as despesas, custas e honorários advocatícios são suportados pelo(a) Contratante.',
      '§ 7º - O aluno que não frequentar as aulas ou atividades escolares, e que não requerer o cancelamento, desistência, trancamento ou transferência de matrícula, não é desobrigado(a) do pagamento das parcelas do módulo vencidas e vincendas.',
      '§ 8º - Em caso de trancamento, desistência do curso ou pedido de transferência o(a) Contratante não é desobrigado ao pagamento das parcelas vencidas, inclusive, ao pagamento do mês em que é formalizado o respectivo pedido.',
      '§ 9º - A transferência, o cancelamento, a desistência e o trancamento da matrícula devem ser requeridos na secretaria e tesouraria por escrito, dependendo para a concessão definitiva da quitação de débitos a caso existentes.',
      '§ 10º - Não será devida a parcela com vencimento após o trigésimo dia da data em que o aluno oficialmente se desligar desse estabelecimento de ensino.',
      '§ 11º - Em caso de utilização por parte do(a) Contratante de bolsas de estudos de quaisquer naturezas o mesmo é responsável pela renovação e demais procedimento para manutenção do benefício junto à parte concedente e a escola.',
      '§ 12º - O(a) Contratante manifesta ciência e concordância de que os valores referentes às disciplinas em dependências ofertadas em caráter extraordinário em horários alternativos e os custos com materiais de uso individual para as atividades de estágios e outras não são objeto de cobertura por bolsas de estudo.',
      '§ 13º - Os Custos referentes à Supervisão dos Estágios estão inclusos no valor total do curso. Para frequentar o campo de estágio o/a estudante deverá estar rigorosamente em dia com as parcelas do curso. Em caso de reprovação ou não comparecimento o/a estudante arcará com as despesas referentes à Supervisão do Estágio, para poder repeti-lo.',
      '§ 14º - O estudante favorecido com desconto de qualquer natureza perderá o benefício em decorrência do atraso da mensalidade.',
      '§ 15º - O aluno reprovado em qualquer Componente Curricular matricular-se-á para Progressão Parcial, onde estará ciente das taxas de custos operacionais, pagando 20% do valor da mensalidade vigente por componente curricular, durante todo o semestre, em relação ao horário será em contra turno.',
      '§ 16º - Caso o aluno solicite a análise de itinerário curricular e/ou ementa para o fim de Aproveitamento de Estudos, o mesmo arcará com as despesas para montagem da banca examinadora que corresponde ao valor de 01 (uma) mensalidade do curso técnico solicitado.',
    ],
  },
  ...CLAUSULAS_PRESENCIAL.slice(2).map(c => ({ ...c })),
];

/** Legenda mostrada à secretaria dentro do editor de modelos. */
export const CAMPOS_DISPONIVEIS: { campo: string; explica: string }[] = [
  { campo: '{{NOME}}', explica: 'Nome de quem assina o contrato' },
  { campo: '{{ESTADO_CIVIL}}', explica: 'Estado civil do contratante' },
  { campo: '{{CPF}}', explica: 'CPF do contratante' },
  { campo: '{{RG}}', explica: 'RG do contratante' },
  { campo: '{{RG_ORGAO}}', explica: 'Órgão emissor do RG (ex.: SSPGO)' },
  { campo: '{{NACIONALIDADE}}', explica: 'Nacionalidade do contratante' },
  { campo: '{{ENDERECO}}', explica: 'Rua e número' },
  { campo: '{{BAIRRO}}', explica: 'Bairro' },
  { campo: '{{CIDADE}}', explica: 'Cidade e estado' },
  { campo: '{{ALUNO}}', explica: 'Nome do aluno beneficiário' },
  { campo: '{{ANO}}', explica: 'Ano letivo' },
  { campo: '{{MODULO}}', explica: 'Número do módulo (puxado da turma do aluno)' },
  { campo: '{{CURSO}}', explica: 'Nome do curso (puxado da turma do aluno)' },
  { campo: '{{VALOR_TOTAL}}', explica: 'Valor total do módulo — R$ 2.400,00' },
  { campo: '{{VALOR_TOTAL_EXT}}', explica: 'O mesmo valor por extenso' },
  { campo: '{{ENTRADA}}', explica: 'Valor da entrada' },
  { campo: '{{ENTRADA_EXT}}', explica: 'A entrada por extenso' },
  { campo: '{{NUM_PARCELAS}}', explica: 'Quantidade de parcelas' },
  { campo: '{{VALOR_PARCELA}}', explica: 'Valor de cada parcela' },
  { campo: '{{VALOR_PARCELA_EXT}}', explica: 'A parcela por extenso' },
  { campo: '{{DESC_MAT}}', explica: 'Valor com desconto — matutino' },
  { campo: '{{DESC_VESP}}', explica: 'Valor com desconto — vespertino' },
  { campo: '{{DESC_NOT}}', explica: 'Valor com desconto — noturno' },
  { campo: '{{DESC_EAD}}', explica: 'Percentual de desconto do EAD' },
  { campo: '{{VALOR_BIOSSEGURANCA}}', explica: 'Material de biossegurança' },
  { campo: '{{VALOR_BIOSSEGURANCA_EXT}}', explica: 'Biossegurança por extenso' },
  { campo: '{{VALOR_MATERIAL}}', explica: 'Material didático de estágio' },
  { campo: '{{VALOR_MATERIAL_EXT}}', explica: 'Material de estágio por extenso' },
  { campo: '{{DATA}}', explica: 'Data do contrato' },
];


// ---------------------------------------------------------------------------
// ADITIVO DE DEPENDÊNCIA
//
// Documento separado do contrato, assinado só por quem está matriculado em
// dependência. Vale para as duas modalidades (presencial e EAD), porque o que
// muda é a cobrança da disciplina em dependência, não o formato do curso.
//
// Campos próprios deste documento, além dos que já existem no contrato:
//   {{DISCIPLINAS}}      lista das matérias em dependência do aluno
//   {{QTD_DISCIPLINAS}}  quantas são
//   {{DEP_VALOR}}        valor da parcela mensal — R$ 80,00
//   {{DEP_VALOR_EXT}}    o mesmo valor por extenso
//   {{DEP_PARCELAS}}     quantidade de parcelas — 6
//   {{DEP_TOTAL}}        valor total (parcela x quantidade)
//   {{DEP_TOTAL_EXT}}    o total por extenso
// ---------------------------------------------------------------------------
export const CLAUSULAS_ADITIVO_DEPENDENCIA: ClausulaContrato[] = [
  {
    titulo: 'Cláusula Primeira — Do objeto',
    paragrafos: [
      'O presente instrumento é aditivo ao Contrato de Prestação de Serviços Educacionais firmado entre as partes, e tem por objeto a matrícula do(a) estudante {{ALUNO}} em regime de Progressão Parcial (dependência), referente à(s) seguinte(s) disciplina(s): {{DISCIPLINAS}}.',
      'Parágrafo único - Permanecem inalteradas todas as demais cláusulas e condições do contrato original, que continua em pleno vigor naquilo que não conflitar com este aditivo.',
    ],
  },
  {
    titulo: 'Cláusula Segunda — Do valor',
    paragrafos: [
      'Pela prestação dos serviços educacionais em regime de dependência, o(a) CONTRATANTE pagará o valor de {{DEP_VALOR}} ({{DEP_VALOR_EXT}}) por mês, divididos em {{DEP_PARCELAS}} parcelas mensais consecutivas, totalizando {{DEP_TOTAL}} ({{DEP_TOTAL_EXT}}).',
      '§ 1º - O vencimento de cada parcela ocorrerá até o dia 30 de cada mês, nas mesmas condições de multa e juros por atraso previstas no contrato original.',
      '§ 2º - O valor aqui pactuado é devido independentemente do resultado final obtido na disciplina cursada em dependência, e não se confunde com as parcelas do módulo regular.',
      '§ 3º - Conforme já previsto no contrato original, os valores referentes a disciplinas cursadas em dependência não são objeto de cobertura por bolsas de estudo de qualquer natureza.',
    ],
  },
  {
    titulo: 'Cláusula Terceira — Do funcionamento',
    paragrafos: [
      'As aulas da dependência serão ministradas em contra turno, conforme horário divulgado pela Instituição, ficando o(a) estudante ciente de que deverá ter disponibilidade para frequentá-las.',
      'Parágrafo único - A desistência da disciplina em dependência, depois de iniciadas as aulas, não desobriga o(a) CONTRATANTE do pagamento das parcelas vencidas e da parcela do mês em que o pedido for formalizado na secretaria.',
    ],
  },
];
