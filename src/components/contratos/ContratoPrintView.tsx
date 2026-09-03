import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, FileSignature, AlertTriangle } from 'lucide-react';
import { LOGO_COLEGIO_OSWALDO_CRUZ } from '../../lib/imageAssets';
import type { DadosContrato } from '../../lib/supabaseContratos';
import { formatarDinheiro, porExtenso } from '../../lib/supabaseContratos';

// ===========================================================================
//  CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS — documento para impressão
//
//  ASSINATURA EM TODAS AS FOLHAS — como isso funciona:
//  A escola exige que o aluno viste cada página. Não dá pra saber de antemão
//  onde o navegador vai quebrar as páginas (depende do tamanho do nome, do
//  endereço, da fonte instalada). A solução é um rodapé com
//  "position: fixed" dentro do @media print: o navegador REPETE elementos
//  fixos em todas as folhas impressas. Assim a linha de visto aparece no pé
//  de cada página, quantas forem. O padding-bottom do corpo reserva o espaço
//  pra ele não cobrir o texto.
//
//  IMPRESSÃO — mesmo padrão já testado no ProvaPrintView e no
//  GradeCurricularModule: portal preso ao document.body + @media print que
//  esconde o #root. Chamar window.print() direto imprimiria o portal inteiro.
// ===========================================================================

interface Props {
  dados: DadosContrato;
  onClose: () => void;
}

const CSS_IMPRESSAO = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 1.2cm 1.6cm 2.2cm 1.6cm;
    }
    #root, .no-print { display: none !important; }
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .contrato-portal {
      position: static !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .contrato-corpo {
      font-size: 10pt;
      line-height: 1.35;
      text-align: justify;
      color: #000;
      /* espaço reservado pro timbre (topo) e pro visto (rodapé) que se repetem */
      padding-top: 2.1cm;
      padding-bottom: 1.4cm;
    }
    /* O NAVEGADOR REPETE ISTO EM TODAS AS FOLHAS. É o timbre por página. */
    .contrato-logo-topo {
      position: fixed !important;
      top: 0;
      left: 0;
      right: 0;
      display: block !important;
      text-align: center;
      background: #fff;
      padding-bottom: 4px;
      border-bottom: 1px solid #000;
    }
    .contrato-logo-topo img {
      width: 100%;
      max-height: 1.7cm;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }
    .contrato-logo-tela { display: none !important; }
    /* O NAVEGADOR REPETE ISTO EM TODAS AS FOLHAS. É o visto por página. */
    .contrato-visto-rodape {
      position: fixed !important;
      bottom: 0;
      left: 0;
      right: 0;
      display: block !important;
      font-size: 8pt;
      color: #000;
      border-top: 1px solid #000;
      padding-top: 3px;
      background: #fff;
    }
    .contrato-clausula { break-inside: auto; }
    .contrato-nao-quebrar { break-inside: avoid; page-break-inside: avoid; }
    .contrato-assinaturas { break-inside: avoid; page-break-inside: avoid; }
  }
  @media screen {
    .contrato-visto-rodape { display: none; }
    .contrato-logo-topo { display: none; }
  }
`;

/** Substitui {{CAMPO}} pelos valores reais. */
function preencher(texto: string, d: DadosContrato): string {
  const mapa: Record<string, string> = {
    NOME: d.contratanteNome || '____________________________',
    ESTADO_CIVIL: d.estadoCivil || '____________',
    CPF: d.cpf || '______________',
    RG: d.rg || '____________',
    RG_ORGAO: d.rgOrgao || '________',
    NACIONALIDADE: d.nacionalidade || 'BRASILEIRA',
    ENDERECO: d.endereco || '________________________________',
    BAIRRO: d.bairro || '______________',
    CIDADE: d.cidade || 'GOIÂNIA-GO',
    ALUNO: d.alunoNome || d.contratanteNome || '____________________________',
    ANO: d.ano || String(new Date().getFullYear()),
    MODULO: d.modulo || '1',
    CURSO: (d.cursoNome || '____________________').toUpperCase(),
    VALOR_TOTAL: formatarDinheiro(d.valorTotal),
    VALOR_TOTAL_EXT: porExtenso(d.valorTotal),
    ENTRADA: formatarDinheiro(d.entrada),
    ENTRADA_EXT: porExtenso(d.entrada),
    NUM_PARCELAS: String(d.numParcelas).padStart(2, '0'),
    VALOR_PARCELA: formatarDinheiro(d.valorParcela),
    VALOR_PARCELA_EXT: porExtenso(d.valorParcela),
    DESC_MAT: formatarDinheiro(d.descontoMatutino),
    DESC_VESP: formatarDinheiro(d.descontoVespertino),
    DESC_NOT: formatarDinheiro(d.descontoNoturno),
    DESC_EAD: `${d.descontoEadPercentual ?? 37.5}%`.replace('.', ','),
    VALOR_BIOSSEGURANCA: formatarDinheiro(d.valorBiosseguranca),
    VALOR_BIOSSEGURANCA_EXT: porExtenso(d.valorBiosseguranca),
    VALOR_MATERIAL: formatarDinheiro(d.valorMaterialEstagio),
    VALOR_MATERIAL_EXT: porExtenso(d.valorMaterialEstagio),
    DATA: d.dataContrato
      ? new Date(d.dataContrato + 'T12:00:00').toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR'),
  };
  return texto.replace(/\{\{(\w+)\}\}/g, (_, chave) => mapa[chave] ?? `{{${chave}}}`);
}

// ---------------------------------------------------------------------------
// TEXTO DO CONTRATO — PRESENCIAL (todos os cursos menos EAD)
// Transcrito do PDF oficial da escola. Resolução CEE/GO nº 092/2018.
// ---------------------------------------------------------------------------
const CLAUSULAS_PRESENCIAL: { titulo: string; paragrafos: string[] }[] = [
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
const CLAUSULAS_EAD: { titulo: string; paragrafos: string[] }[] = [
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

export const ContratoPrintView: React.FC<Props> = ({ dados, onClose }) => {
  const [imprimindo, setImprimindo] = useState(false);
  const ead = dados.modalidade === 'EAD';
  const clausulas = ead ? CLAUSULAS_EAD : CLAUSULAS_PRESENCIAL;
  const resolucao = ead
    ? 'Resolução CEE/CEP nº 059/2023'
    : 'Resolução CEE/GO nº 092/2018';

  useEffect(() => {
    if (!imprimindo) return;
    const style = document.createElement('style');
    style.setAttribute('data-contrato-print', 'true');
    style.innerHTML = CSS_IMPRESSAO;
    document.head.appendChild(style);

    const encerrar = () => setImprimindo(false);
    window.addEventListener('afterprint', encerrar);
    const t = window.setTimeout(() => window.print(), 150);
    const destravar = window.setTimeout(() => setImprimindo(false), 15000);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(destravar);
      window.removeEventListener('afterprint', encerrar);
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, [imprimindo]);

  const p = (t: string) => preencher(t, dados);

  const Documento = (
    <div className="contrato-corpo" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      {/* TIMBRE QUE SE REPETE EM TODAS AS FOLHAS (só na impressão) */}
      <div className="contrato-logo-topo">
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Na tela o timbre aparece uma vez só, no fluxo normal */}
      <div className="contrato-logo-tela contrato-nao-quebrar" style={{ textAlign: 'center', marginBottom: '8px' }}>
        <img
          src={LOGO_COLEGIO_OSWALDO_CRUZ}
          alt="Colégio Oswaldo Cruz"
          style={{ width: '100%', maxWidth: '640px', maxHeight: '70px', objectFit: 'contain' }}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Identificação da escola e título — uma vez só, na primeira folha */}
      <div className="contrato-nao-quebrar" style={{ textAlign: 'center', marginBottom: '10px' }}>
        <p style={{ fontSize: '8.5pt', margin: '4px 0 0' }}>
          Rua 20 nº 796 - Centro Goiânia - Goiás CEP 74020-170 — "{resolucao}"
        </p>
        <p style={{ fontSize: '8.5pt', margin: 0 }}>
          Fone: (62) 3223.7602 &nbsp;•&nbsp; www.colegiooswaldocruz.com.br
        </p>
        <h1 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '10px 0 8px' }}>
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS
        </h1>
      </div>

      {/* Qualificação do contratante */}
      <div className="contrato-nao-quebrar" style={{ marginBottom: '10px', fontSize: '9.5pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Contratante:</strong> {p('{{NOME}}')}</span>
          <span><strong>Estado Civil:</strong> {p('{{ESTADO_CIVIL}}')}</span>
        </div>
        <div>
          <strong>CPF:</strong> {p('{{CPF}}')} &nbsp;&nbsp;
          <strong>RG.:</strong> {p('{{RG}}')} {p('{{RG_ORGAO}}')} &nbsp;&nbsp;
          <strong>Nacionalidade:</strong> {p('{{NACIONALIDADE}}')}
        </div>
        <div>
          <strong>Endereço:</strong> {p('{{ENDERECO}}')} &nbsp;&nbsp;
          <strong>Bairro:</strong> {p('{{BAIRRO}}')} &nbsp;&nbsp;
          <strong>Cidade:</strong> {p('{{CIDADE}}')}
        </div>
      </div>

      <p style={{ textIndent: '2em', margin: '0 0 8px' }}>
        {p('Como primeiro acordante ou contratante que indica como beneficiário (a) deste contrato e de sua inteira responsabilidade, o (a) estudante {{ALUNO}}. Como segundo acordante ou contratado, o Colégio Oswaldo Cruz Ltda, situado à Rua 20 nº 796 Centro, Goiânia - Goiás, inscrita no CNPJ sob o nº 37.653.128/0001-64 mediante as cláusulas e condições a seguir.')}
      </p>

      {/* Cláusulas */}
      {clausulas.map((c, i) => (
        <div key={i} className="contrato-clausula" style={{ marginBottom: '7px' }}>
          {c.paragrafos.map((par, j) => (
            <p key={j} style={{ margin: '0 0 4px', textIndent: j === 0 ? 0 : '2em' }}>
              {j === 0 && <strong>{c.titulo} - </strong>}
              {p(par)}
            </p>
          ))}
        </div>
      ))}

      {/* Fecho e assinaturas */}
      <div className="contrato-assinaturas" style={{ marginTop: '14px' }}>
        <p style={{ textIndent: '2em', margin: '0 0 14px' }}>
          E, por estarem as partes justas e contratadas, assinam o presente instrumento em duas vias
          de igual teor e forma, na presença das testemunhas abaixo, para que produzam os efeitos legais.
        </p>
        <p style={{ margin: '0 0 22px' }}>Goiânia, {p('{{DATA}}')}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '22px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              Contratante
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              Colégio Oswaldo Cruz Ltda
            </div>
          </div>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: '9.5pt' }}><strong>Testemunhas:</strong></p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              1º — Nome / CPF
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '9pt' }}>
              2º — Nome / CPF
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ QUE SE REPETE EM TODAS AS FOLHAS — o visto por página */}
      <div className="contrato-visto-rodape">
        <table style={{ width: '100%', fontSize: '8pt' }}>
          <tbody>
            <tr>
              <td style={{ width: '52%' }}>
                Visto do(a) contratante: ______________________________
              </td>
              <td style={{ width: '48%', textAlign: 'right' }}>
                {dados.alunoNome} — {dados.cursoNome} — {p('{{DATA}}')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <FileSignature className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-black text-slate-700 dark:text-slate-200 truncate">
              Contrato — {dados.alunoNome}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase flex-shrink-0">
              {ead ? 'EAD' : 'Presencial'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImprimindo(true)}
              disabled={imprimindo}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> {imprimindo ? 'Preparando…' : 'Imprimir / Baixar PDF'}
            </button>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="no-print px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
            Na caixa do navegador, desmarque <strong>Cabeçalhos e rodapés</strong> — senão a URL e a data
            do navegador saem por cima da linha de visto. Marque <strong>Gráficos de fundo</strong> para o
            timbre sair com cor.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
          <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: '820px', padding: '2.5cm 2cm' }}>
            {Documento}
          </div>
        </div>
      </div>

      {/* Cópia limpa, fora do #root, só durante a impressão */}
      {imprimindo && createPortal(
        <div className="contrato-portal" style={{ position: 'fixed', left: '-10000px', top: 0, width: '210mm' }}>
          {Documento}
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};
