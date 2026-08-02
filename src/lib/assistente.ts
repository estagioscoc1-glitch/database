/**
 * O ASSISTENTE DO PORTAL (respostas por palavra-chave)
 *
 * Ficava dentro do `server.ts`, que só roda em servidor Node. Como o portal
 * vai para o Cloudflare — que não executa Express — a lógica precisou sair
 * daqui para poder ser usada nos dois lugares:
 *
 *   - `server.ts`            (rodando no computador da escola)
 *   - `functions/api/...`    (rodando no Cloudflare)
 *
 * Assim a resposta é exatamente a mesma nos dois, e só existe UMA cópia do
 * texto para manter.
 *
 * Se um dia a chave da Gemini for preenchida, a IA responde e este arquivo
 * deixa de ser usado — mas continua aqui como rede de segurança para quando o
 * serviço externo estiver fora do ar.
 */

export type PapelAssistente = "admin" | "teacher" | "student" | undefined;

export function responderAssistente(message: string, role: PapelAssistente): string {
  const m = message.toLowerCase();
  const tem = (...termos: string[]) => termos.some(t => m.includes(t));
  let reply = "";

  const REGRAS_NOTA =
    "### Como a nota é calculada\n" +
    "- **S1** = AV1 + AV2 + AV3, no máximo **30 pontos**. A Rec S1 **substitui a menor** das três (só se for maior), não soma.\n" +
    "- **S2** = AV4 + AV5 + AV6, no máximo **30 pontos**. A Rec S2 funciona igual.\n" +
    "- **AFC** vale até **40 pontos**. Lançada em uma disciplina, ela se repete **automaticamente em todas as disciplinas daquele módulo** para aquele aluno.\n" +
    "- **Nota final (PF)** = S1 + S2 + AFC + Extra + Conselho, limitada a **100**.\n" +
    "- **Aprovado** com PF de **60 ou mais** E frequência de **75% ou mais**.\n" +
    "- Frequência abaixo de 75% da carga horária = **REP. FALTAS**, independente da nota.\n" +
    "- Conceitos: **A** 86–100 · **B** 76–85 · **C** 60–75 · **D** 0–59.";

  const SENHAS =
    "### Login e senha\n" +
    "- **Aluno**: o usuário é a **matrícula**. No primeiro acesso a senha também é a matrícula, e o sistema **obriga a trocar** (mínimo 8 caracteres, com letra e número).\n" +
    "- **Professor e funcionário**: o usuário é gerado no cadastro e a **senha aparece uma única vez** na confirmação — anote e entregue à pessoa.\n" +
    "- O usuário nunca muda; só a senha.\n" +
    "- Esqueceu a senha: a secretaria não vê a senha de ninguém. É preciso redefinir pelo painel do Supabase.";

  if (role === "admin") {
    if (tem("nota", "afc", "s1", "s2", "media", "média", "conceito", "aprova", "reprova", "calcul")) {
      reply = REGRAS_NOTA;
    } else if (tem("senha", "login", "acesso", "entrar")) {
      reply = SENHAS;
    } else if (tem("professor", "docente", "atribui", "diario", "diário", "vincul")) {
      reply = "### Cadastrar professor e dar acesso aos diários\n" +
      "1. **Cadastros Acadêmicos → Turmas, Professores & Alunos**.\n" +
      "2. Em *Cadastrar Docente*, preencha nome e e-mail. **A senha aparece uma vez** — anote.\n" +
      "3. Role até **Gerenciador de Acessos de Professores**, clique no professor e marque as disciplinas dele.\n" +
      "- **Sem esse passo 3 o professor entra e não vê turma nenhuma.**\n" +
      "- A mesma disciplina não aceita dois professores: o sistema recusa e avisa quem já está nela.";
    } else if (tem("import", "planilha", "excel", "xlsx")) {
      reply = "### Importar alunos por planilha\n" +
      "1. Aba **Importar Planilhas**.\n" +
      "2. Escolha primeiro o **Semestre**, depois a **Turma** (a lista de turmas filtra pelo semestre).\n" +
      "3. Arraste o arquivo. O sistema lê **apenas matrícula e nome** — o que estiver no cabeçalho do arquivo é ignorado.\n" +
      "4. Confirme. Os alunos entram em **todos os diários** da turma.\n" +
      "5. Depois clique em **Gerar acessos** para criar o login de cada um (matrícula como usuário e senha).";
    } else if (tem("matricul", "aluno", "cadast")) {
      reply = "### Matricular aluno\n" +
      "- **Cadastros Acadêmicos → Turmas, Professores & Alunos**, bloco *Matricular Aluno na Turma*.\n" +
      "- Ao matricular, o aluno é vinculado **automaticamente a todos os diários** daquela turma.\n" +
      "- Para vários alunos de uma vez, use a aba **Importar Planilhas**.\n" +
      "- O acesso dele é criado no botão **Gerar acessos**.";
    } else if (tem("transfer", "mudar de turma", "trocar de turma")) {
      reply = "### Transferir aluno\n" +
      "- **Movimentação → Transferências**.\n" +
      "- Escolha o aluno, a turma de destino e confirme.\n" +
      "- O aluno entra nos diários da turma nova; as notas da turma antiga ficam no histórico.\n" +
      "- **Atenção**: *Transferência de Turno* sozinha não move o aluno — turno é característica da turma. Use *Transferência de Turma* escolhendo uma turma do turno desejado.";
    } else if (tem("prazo", "bloque", "fechar", "fechamento", "limite", "calendario", "calendário")) {
      reply = "### Prazos e fechamento automático\n" +
      "- Aba **Dashboard**, cartão **Programação de Prazos & Fechamento Automático**.\n" +
      "- Quatro datas: fechamento da **S1**, da **S2**, **definitivo** e o **conselho de classe**.\n" +
      "- Salva sozinho, sem botão.\n" +
      "- O bloqueio só vale com o **fechamento automático ligado** (interruptor no mesmo cartão).\n" +
      "- Depois do fechamento definitivo, só o administrador edita o diário.";
    } else if (tem("boletim", "aproveitamento", "histórico", "historico")) {
      reply = "### Boletim\n" +
      "- Aba **Boletim Completo**. Busque por **matrícula ou nome**, ou selecione a turma.\n" +
      "- Resultados possíveis: **APTO**, **NÃO APTO**, **REP. FALTAS**, **Pendente**, **DISPENSADO**, **DESISTENTE**.\n" +
      "- Dá para imprimir o boletim de um aluno ou da turma inteira.";
    } else if (tem("desistente", "dispensado", "trancou", "desistiu")) {
      reply = "### Marcar aluno como DESISTENTE ou DISPENSADO\n" +
      "- Abra a **planilha de notas** da disciplina.\n" +
      "- Na coluna **Resultado**, use o seletor da linha do aluno.\n" +
      "- Esse seletor só aparece para o **administrador**, e some se o diário estiver fechado.";
    } else if (tem("estagio", "estágio")) {
      reply = "### Estágios\n" +
      "- Botão **Gerenciar Estágios** no topo do painel.\n" +
      "- Cadastre campos (empresas), professores supervisores, vagas e notas.\n" +
      "- Sem local ou nota lançada, o item aparece **laranja como PENDENTE** para o aluno.";
    } else if (tem("backup", "seguran")) {
      reply = "### Backup e segurança\n" +
      "- Aba **Backup & Segurança**.\n" +
      "- Os dados ficam no **Supabase (PostgreSQL)**, com cópia do estado geral no armazenamento em nuvem.\n" +
      "- Notas, alunos, professores, turmas e diários ficam em **tabelas próprias**.";
    } else {
      reply = "### O que você pode fazer aqui\n" +
      "- **Cadastros Acadêmicos**: cursos, turmas, professores, funcionários, alunos e o acesso de cada professor aos diários.\n" +
      "- **Importar Planilhas**: entrada de alunos em lote.\n" +
      "- **Movimentação**: transferências, cancelamentos, dependências, estágios.\n" +
      "- **Dashboard**: indicadores e os prazos de fechamento.\n" +
      "- **Boletim Completo** e **Histórico do Aluno**.\n" +
      "- **Mensagens & Avisos** e **Backup & Segurança**.\n\n" +
      "Pergunte sobre um assunto específico — notas, senha, importação, transferência, prazos, estágio — que eu detalho.";
    }
  } else if (role === "teacher") {
    if (tem("nota", "afc", "s1", "s2", "media", "média", "conceito", "aprova", "reprova", "calcul")) {
      reply = REGRAS_NOTA + "\n\n**Para lançar**: botão *Lançar Notas (Abrir Janela)*, preencha a planilha e clique em **Salvar Notas**. Sem clicar em salvar, nada é gravado.";
    } else if (tem("falta", "frequencia", "frequência", "chamada", "presenca", "presença")) {
      reply = "### Frequência\n" +
      "- Aba **Frequência (Chamadas)**.\n" +
      "- Registre a aula e marque presença ou falta de cada aluno.\n" +
      "- Reprova por falta quem ficar **abaixo de 75%** da carga horária da disciplina, mesmo com nota boa.";
    } else if (tem("não vejo", "nao vejo", "vazio", "nenhuma turma", "sem turma", "não aparece", "nao aparece")) {
      reply = "### Não aparece nenhuma turma?\n" +
      "- O professor só enxerga as turmas e disciplinas que o **administrador atribuiu** a ele.\n" +
      "- Peça à secretaria para abrir *Cadastros Acadêmicos → Turmas, Professores & Alunos → Gerenciador de Acessos de Professores* e marcar suas disciplinas.\n" +
      "- Depois disso, saia e entre de novo.";
    } else if (tem("senha", "login", "acesso", "entrar")) {
      reply = SENHAS;
    } else if (tem("prazo", "bloque", "fechad", "limite")) {
      reply = "### Prazos\n" +
      "- Os prazos aparecem no topo do seu painel.\n" +
      "- Passada a data, o diário é **bloqueado automaticamente** e o lançamento fica indisponível.\n" +
      "- Para lançar fora do prazo, peça a reabertura à secretaria.";
    } else if (tem("aula", "conteudo", "conteúdo", "diario de classe", "diário de classe")) {
      reply = "### Diário de classe\n" +
      "- Aba **Diário de Classe**.\n" +
      "- Registre a data, a quantidade de aulas e o conteúdo ministrado.\n" +
      "- A chamada daquela aula fica na aba **Frequência (Chamadas)**.";
    } else {
      reply = "### Seu painel\n" +
      "- **Lançar Notas (Abrir Janela)**: planilha de notas. Sempre clique em **Salvar Notas** ao terminar.\n" +
      "- **Frequência (Chamadas)**: presença e faltas.\n" +
      "- **Diário de Classe**: conteúdo das aulas.\n" +
      "- No topo ficam os **prazos de fechamento**.\n\n" +
      "Se não aparecer nenhuma turma, é porque a secretaria ainda não atribuiu suas disciplinas.";
    }
  } else {
    if (tem("nota", "media", "média", "boletim", "aproveitamento", "conceito", "aprova")) {
      reply = "### Suas notas\n" +
      "- Aba **Aproveitamento**: notas, médias e frequência de cada disciplina.\n" +
      "- Você precisa de **60 pontos** e **75% de frequência** para ser aprovado.\n" +
      "- Faltar mais de 25% das aulas reprova mesmo com nota boa.";
    } else if (tem("falta", "frequencia", "frequência")) {
      reply = "### Suas faltas\n" +
      "- Aba **Aproveitamento**, coluna de frequência.\n" +
      "- O mínimo para aprovação é **75%** da carga horária da disciplina.";
    } else if (tem("senha", "login", "acesso", "entrar", "esqueci")) {
      reply = "### Seu acesso\n" +
      "- Seu usuário é a sua **matrícula**, e não muda.\n" +
      "- No primeiro acesso a senha também é a matrícula, e o sistema pede para você criar uma senha pessoal (mínimo 8 caracteres, com letra e número).\n" +
      "- Esqueceu a senha? Procure a secretaria — ninguém consegue ver a sua senha, ela precisa ser redefinida.";
    } else if (tem("declara", "documento", "atestado", "comprovante")) {
      reply = "### Declarações e documentos\n" +
      "- **Solicitar Declarações**: escolaridade/matrícula, transporte e vacina, emitidas na hora.\n" +
      "- Para enviar RG, CPF ou diploma, use a aba de documentos.";
    } else if (tem("estagio", "estágio")) {
      reply = "### Seus estágios\n" +
      "- Aba **Meus Estágios**: horas, local e notas.\n" +
      "- O que estiver **laranja com PENDENTE** ainda não foi lançado pela coordenação.";
    } else {
      reply = "### Seu portal\n" +
      "- **Aproveitamento**: notas, médias e faltas.\n" +
      "- **Solicitar Declarações**: documentos emitidos na hora.\n" +
      "- **Meus Estágios**: horas e notas de estágio.\n" +
      "- Envio de documentos (RG, CPF, diploma).\n\n" +
      "Pergunte sobre notas, faltas, senha, declarações ou estágio que eu detalho.";
    }
  }


  return reply;
}
