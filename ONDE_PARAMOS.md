# Portal Acadêmico COC — onde paramos

## Se algo travar, leia o `SOCORRO.txt`

Está na mesma pasta. Cobre servidor que não liga, tela branca, aviso de "não
salvou", professor sem turma e senha esquecida. Escrito para resolver sem
depender de mim.

---

## Estado dos menus que você pediu

| Menu | Situação |
|---|---|
| Cadastrar Novo Curso | **salva** — verificado na tabela |
| Funcionários do Sistema | **salva** — verificado |
| Dependências | **salva** — verificado |
| Turmas, Professores & Alunos | **salva** — verificado |
| Importar Planilhas | **salva** — 14 alunos importados e conferidos |
| Importador de Histórico (JSON) | **salva** — turma, alunos e notas |
| Assistente (robozinho) | **funciona** — testado nos 3 perfis |
| Mensagens & Avisos | **funciona** — mensagem chega ao aluno certo |

---

## OS MAPAS DE NOTAS: prontos para importar, ainda NÃO importados

O arquivo **`MAPAS/mapas_importacao.json`** está gerado e conferido:

- 14 turmas (5 em 2025.2, 9 em 2026.1)
- 258 matrículas (aluno × semestre)
- 1.902 lançamentos de nota
- **zero divergência** na conferência automática

**Como importar** (leva 2 minutos):

1. Entre como admin
2. Aba **Importar Planilhas**
3. Role até **Importador de Dados Históricos (JSON)**
4. **Arraste o arquivo** `MAPAS/mapas_importacao.json` para a área indicada
5. Confirme

Fiz assim porque o arquivo tem 337 KB e não passa pelo canal de automação que
eu uso. O caminho está validado — importei uma turma de teste e ela entrou no
semestre certo (2025/2), com as notas preservadas.

### ⚠️ Um problema conhecido antes de importar

O resultado **`F. NOTA`** (aluno sem nota lançada) está sendo gravado como
**`NÃO APTO`**. São coisas diferentes.

Já corrigi três pontos disso — a marca de histórico, a normalização do texto e
a exibição no boletim, que mostrava "F. NOTA" como "REP. FALTAS". Mas o
problema persiste: a conversão acontece **dentro do próprio importador**, antes
do meu conserto agir. Não consegui isolar onde.

**Impacto real:** nos mapas, quem tem "F. NOTA" aparecerá como "NÃO APTO". A
nota e a frequência ficam corretas; só o rótulo do resultado muda. Se isso for
aceitável para você agora, pode importar. Se não, espere o conserto.

---

## Extração dos mapas: sete defeitos silenciosos corrigidos

Nenhum deles daria erro na tela — os dados sairiam errados sem aviso:

1. **Notas na coluna errada.** Aluna com S1=24 e PF=24 virava "S1=24, S2=24".
   Resolvido lendo por posição da coluna, não pela ordem dos números.
2. **Uma turma inteira descartada.** No mapa do EAD três campos são impressos
   na mesma altura e o PDF embaralha as letras. 11 páginas viravam zero.
3. **Alunos sem conceito**, por um arredondamento que partia a linha em duas.
4. **Páginas de continuação perdidas** — quando a lista transborda, a página
   seguinte não repete o cabeçalho e ia inteira para o lixo.
5. **Nomes longos comendo a nota** ("...SIQUEI30,00").
6. **Turma duplicada** — páginas do mesmo arquivo saindo com módulos diferentes.
7. **TST 3 virando módulo 1**, colidindo com a turma do módulo 1.

O extrator é o `MAPAS/extrair_mapas.py`, comentado. Para reprocessar se os
mapas mudarem: `python3 extrair_mapas.py` dentro da pasta MAPAS.

---

## Pendente

1. **`F. NOTA` virando `NÃO APTO`** (descrito acima)
2. **Importar os 14 mapas** — arrastar o arquivo, como descrito acima
3. **Enviar mensagem para várias pessoas de uma vez**, e áudio/anexo só pelo
   admin — pedido novo, ainda não comecei
4. **Acessos dos alunos importados** — os mapas trazem só o nome, sem
   matrícula. Se gerar os logins agora, o usuário será um código interno que o
   aluno não conhece. Vi um `Alunos_e_Matriculas.xlsx` nos seus Downloads: o
   certo é cruzar por nome antes de criar os acessos.

---

# O que foi feito antes

## Resumo em uma linha

O sistema está salvando tudo no banco de dados. **51 testes de segurança
passando.** Falta você rodar um arquivo SQL — instruções logo abaixo.

---

## Ativação: já feita

Você rodou `supabase/09_aluno_salva_no_banco.sql` e as quatro linhas voltaram
`sim`. Não há mais nada pendente do seu lado.

---

## A lentidão para digitar o nome do professor

Você reclamou que tinha voltado. Medi antes de mexer, e o número era feio:
**635 ms de tela congelada a cada letra digitada**.

A causa não era o banco nem a internet. O painel administrativo é um único
componente de 5 mil linhas que desenha ~11 mil caixas na tela, entre elas 1.200
ícones e uma lista com 586 turmas. O texto que você digitava era guardado no
estado *desse* componente — e no React, mudar o estado redesenha o componente
inteiro. Ou seja: cada letra remontava o painel todo.

Duas correções:

1. O formulário de cadastro de docente virou um componente separado
   (`FormularioDocente`). O texto digitado agora mora dentro dele; o painel
   atrás nem fica sabendo.
2. As contas do topo do painel (alunos ativos, diários, faltas, aprovação) só
   são refeitas quando os dados mudam. Uma delas percorria a lista inteira de
   notas **uma vez por aluno** — com 250 alunos e 2.500 notas dá 625 mil
   comparações, e piorava ao quadrado conforme a escola lançasse nota.

**Resultado medido depois:** 4,6 ms por letra, e zero alterações no resto da
tela. Cerca de 138 vezes mais rápido.

Depois disso cadastrei um docente de ponta a ponta para conferir que a mudança
não quebrou nada: conta criada, ficha criada, as duas ligadas, senha forte
gerada pelo servidor e troca obrigatória no primeiro acesso.

**Vale dizer:** os outros formulários deste painel (nova turma, nova
disciplina, matrícula de aluno) têm exatamente o mesmo problema, pela mesma
razão. Corrigi o que estava te atrapalhando; os demais seguem o mesmo molde e
são rápidos de fazer quando incomodarem.

---

## Os menus que você pediu — todos testados no banco

| O que | Situação |
|---|---|
| Cadastrar Novo Curso | **salva** — criei um curso e conferi na tabela `cursos` |
| Funcionários do Sistema | **salva** — criei um funcionário e conferi no retrato do servidor |
| Dependências | **salva** — matriculei um aluno em dependência e conferi |
| Turmas, Professores & Alunos | **salva** — testado ontem e hoje |
| Importador de Dados Históricos (JSON) | **salva** — turma, alunos e notas chegaram ao banco |
| Assistente (robozinho) | **funciona** — responde certo por perfil |
| Mensagens & Avisos | corrigido, ainda não testado na tela |

### O assistente

A chave da IA estava **vazia** no arquivo de configuração (`GEMINI_API_KEY=""`).
Não era defeito de código: nunca foi preenchida. Por sua decisão, em vez de
contratar a IA, reescrevi as respostas prontas com as regras e telas reais.

O texto anterior citava abas que não existem ("Registros Acadêmicos") e dizia
que os backups ficam no **Firebase**, que removemos do projeto.

Agora ele cobre, com resposta diferente para cada perfil: regras de nota,
senhas, atribuir professor, importar planilha, matricular, transferir, prazos,
boletim, desistente/dispensado, estágios e backup. Testado nos três perfis.

Se um dia você preencher a chave da Gemini, a IA assume sozinha e esses textos
deixam de ser usados.

### O importador de histórico ignorava o ano do arquivo

Importei um histórico marcado como **2024/2** e ele entrou como **2026/1** — o
semestre corrente. O ano e o semestre escritos no arquivo eram descartados,
misturando histórico antigo com as turmas em andamento. E o modelo mostrado na
tela traz justamente os campos `year` e `semester`, prometendo o contrário.

Corrigido: **o arquivo manda**. O período ativo só entra quando o arquivo não
informa nada. Reimportei e confirmei: entrou como 2024/2.

---

## A causa raiz, e onde mais ela estava

Depois de achar o problema da atribuição de professor, fui procurar o mesmo
padrão no resto do arquivo. Estava em **sete** lugares.

O padrão: o efeito espera alguns segundos antes de gravar, e tem `currentUser`
na lista de dependências. `currentUser` é um objeto, e o React o recria a cada
renderização — muda de identidade mesmo sem mudar de conteúdo. O efeito é
desmontado e remontado junto, a espera é cancelada, e o relógio nunca chega ao
fim.

Isso explica por que o sintoma era intermitente e tão difícil de achar: com a
tela parada, gravava; com qualquer movimento (uma nota sendo salva, por
exemplo), nunca.

Corrigidos os sete, dependendo do **id e do papel** (texto, que só muda quando a
pessoa troca) em vez do objeto:

| O que passa por ali | Situação |
|---|---|
| Estrutura: cursos, turmas, disciplinas, professores, alunos, diários | corrigido e **testado** |
| Retrato geral: funcionários, dependências, notificações, estágios, declarações | corrigido |
| Notas | corrigido |
| Frequência (chamada do professor) | corrigido |
| Faltas diretas | corrigido |
| Documentos do aluno | corrigido |
| Mensagens | corrigido |

Só o primeiro foi confirmado no banco de ponta a ponta. Os outros seis seguem a
mesma correção, mas **não testei um por um** — e não vou dizer que estão prontos
sem ver.

---

## A MESMA FALHA ATINGIA MUITO MAIS COISA

Ao investigar o assistente e o importador de histórico, descobri que o relógio
travado não afetava só a atribuição de professor. Havia **dois** relógios com o
mesmo defeito, e o segundo é o que carrega:

- funcionários do sistema
- dependências
- documentos enviados pelo aluno
- notificações
- estágios (registro simples)
- configurações de declaração
- eventos e chamadas de frequência

Nada disso chegava ao servidor. O relógio esperava 6 segundos de silêncio e era
zerado a cada mudança em qualquer um de 15 estados — mais o objeto do usuário
logado, que o React recria a cada renderização. Nunca disparava.

Corrigido igual ao outro: intervalo fixo, dependências estáveis.

**Consequência prática:** "Cadastrar Novo Curso", "Funcionários do Sistema",
"Dependências" e o "Importador de Dados Históricos (JSON)" gravam no mesmo
estado que esses relógios levam ao banco. Eles provavelmente também não estavam
salvando, pela mesma causa — e devem ter sido corrigidos junto. **Ainda não
testei um por um**, e não vou dizer que estão prontos sem ver.

---

## O assistente (robozinho)

Dois defeitos:

**1. A chave da IA nunca chegava ao servidor.** O `server.ts` não carregava o
`.env.local` — o Vite carrega para o navegador, o servidor não. Sem a chave, o
assistente caía sempre no texto de emergência: respondia qualquer pergunta com
o mesmo parágrafo pronto. E como o texto de emergência assume "aluno" quando
não reconhece o perfil, o administrador recebia instruções da tela do aluno.
Testei e confirmei: perguntei como ADMIN sobre a AFC e ele explicou a aba
'Aproveitamento' do aluno. Corrigido com `dotenv`.

**2. O que ele sabia estava desatualizado.** Citava abas que não existem mais
("Registros Acadêmicos") e dizia que os backups ficam em **Firebase** — que
removemos. Reescrevi o conhecimento dele com o que foi verificado hoje: as
regras de nota (S1/S2 até 30, AFC até 40, PF até 100, 60 para aprovar, 75% de
frequência), o caminho real de cada tela, a regra da matrícula como senha e o
detalhe de que transferência de turno sozinha não move o aluno.

**Precisa reiniciar o servidor** para a chave ser lida: feche a janela preta e
dê dois cliques em `INICIAR_SERVIDOR.bat`.

---

## Mensagens & Avisos

Dois defeitos, ambos corrigidos:

**1. Professor e aluno não conseguiam enviar.** A gravação usava "inserir ou
atualizar". Reenviar a mesma mensagem virava atualização, e o banco só permite
atualizar mensagem para a gestão — então a mensagem deles era recusada com
"violates row-level security policy". Mensagem enviada não se edita: agora, se
já existe, não faz nada.

**2. Mensagem para um aluno específico não chegava a ninguém.** A coluna de
destinatário aponta para a tabela de logins, mas o portal identifica o aluno
pelo id da ficha. Qualquer id que não parecesse um UUID era tratado como
"grupo" — a mensagem virava um grupo com o nome do id e sumia. Agora o id é
traduzido antes de gravar.

---

## RESOLVIDO: atribuir professor ao diário

Estava quebrado e agora funciona. Marquei as 7 disciplinas da Enfermagem 1º
matutino para o professor pela tela, esperei, apertei F5: **7 de 7 continuam no
banco.**

Foram **três** causas empilhadas, e cada uma escondia a seguinte:

**1. A assinatura contava, não listava.** A verificação que decide se vale
republicar comparava a *quantidade* de diários do professor. Trocar Anatomia
por Nutrição mantém a contagem — a troca nunca subia.

**2. Inanição do relógio.** A publicação esperava 2,5 s de silêncio, mas era
reiniciada a cada mudança em `grades` — e a gravação de notas mexe nisso o tempo
todo. O relógio nunca chegava ao fim. Troquei por um intervalo fixo.

**3. A mesma armadilha, num lugar diferente.** O intervalo dependia do objeto
`currentUser`, que o React recria a cada renderização. Mesmo sem mudar de
conteúdo, ele muda de identidade — então o intervalo era destruído e recriado
antes dos 3 segundos. Passei a depender só do id e do papel.

A terceira só apareceu porque chamei a função de publicação **na mão** e vi que
ela gravava certo. Isso separou "a função está quebrada" de "o gatilho não
dispara" — e o problema era sempre o gatilho.

**Atenção ao atribuir por SQL:** o portal reescreve `diarios.professor_id` a
cada 3 segundos com o que o navegador conhece. Atribuir direto no banco com o
sistema aberto é apagado sozinho. Use a tela.

---

**Este é o item mais importante da lista e não está resolvido.**

Testado: marquei a disciplina para o professor no "Gerenciador de Acessos de
Professores". A tela aceitou e passou a mostrar 3 diários. Conferi a tabela
`diarios`: continuou `professor_id = null`. Recarreguei: o vínculo sumiu.

Descartei o banco como culpado — logado como admin, ler e gravar `cursos`
funciona, e gravar `diarios.professor_id` direto funciona. **O portal
simplesmente não envia.**

Uma causa encontrada e corrigida: a "assinatura" que decide se vale republicar a
estrutura comparava a **quantidade** de diários do professor, não quais. Trocar
Anatomia por Nutrição mantém a contagem igual — a troca nunca chegava ao banco.
Corrigido para comparar a lista.

Só que no meu teste a contagem mudou (2 → 3) e mesmo assim não publicou. **Há
pelo menos mais uma causa, ainda não isolada.**

Por que isso importa: sem professor no diário, ninguém lança nota. É o passo
entre "os alunos estão no sistema" e "a escola consegue usar".

**Contorno enquanto não conserto:** dá para gravar direto pelo SQL Editor do
Supabase:

```sql
update public.diarios
   set professor_id = '<id do professor>'
 where turma_id = '<id da turma>'
   and disciplina_id = '<id da disciplina>';
```

Já apliquei isso para o `prof_eu` em Anatomia da Enfermagem 1º matutino.

Sobre dois professores na mesma disciplina: **o bloqueio já existe** no código —
recusa com "A disciplina já está atribuída ao professor X". E o banco também
impede por desenho: cada diário tem um único `professor_id`. Ainda não testei
esse bloqueio na tela.

---

## "Cadastrar Administrador": o rótulo não bate com o que é criado

Testado: funciona e grava. Conta criada em `usuarios`, senha forte do servidor,
troca obrigatória no primeiro acesso.

**Mas o botão diz "Administração (Admin)" e o que nasce no banco é SECRETARIA,
não ADMIN.** Você decidiu deixar assim — fica registrado aqui para quando
alguém disser "me cadastraram como admin e não consigo fazer X".

O que a secretaria PODE: cadastrar aluno, professor e funcionário, matricular,
transferir, importar planilha, financeiro, CRM, estágios, ver tudo.

O que ela NÃO pode (é do ADMIN): mexer em permissões de módulo e editar diário
depois do fechamento definitivo.

Segundo detalhe: a ficha em `funcionarios` não é criada — só a conta de login.
A tabela existe no banco e está vazia; os dados de funcionário seguem no retrato
geral do estado. Mesmo padrão que o calendário tinha antes de ser corrigido.

---

## Importação de planilha: testada com a sua planilha real

Importei o TESTE.xlsx (14 alunos, Enfermagem 1º matutino). Duas mudanças e um
bug sério encontrado.

### Escolher o semestre antes da turma

A tela tinha uma lista só, com as **585 turmas de todos os períodos
misturadas** — o semestre aparecia escondido no meio do texto de cada linha.
Era fácil importar uma turma inteira para o ano errado sem perceber.

Agora são dois passos: **1. Semestre** → **2. Turma** (só as daquele semestre).
Com 2026/1 selecionado, a lista cai de 585 para 65. Se você trocar o semestre, a
turma é trocada junto — antes dava para escolher 2026/2 e continuar com uma
turma de 2025/1 selecionada.

Abaixo dos dois campos aparece, em texto claro, o que vai acontecer: turma,
semestre, "todos os diários" e a regra da senha. É a última chance de perceber
que o destino está errado.

### O bug: dois alunos ficavam fora de todos os diários

Importei os 14 e fui conferir no banco: os 7 diários da turma tinham **12 alunos
cada**, não 14. Faltavam sempre os **dois primeiros da lista**.

É uma corrida. As notas dos primeiros alunos eram enviadas ao servidor **antes
de o aluno existir** na tabela `alunos`, e o banco recusava por chave
estrangeira. Segundos depois o aluno já estava lá — mas ninguém tentava de novo.

O que isso significaria na prática: você importa a turma, a tela diz que deu
certo, e dois alunos simplesmente não aparecem em nenhuma planilha de notas. O
professor abriria o diário com 38 dos 40 alunos e provavelmente culparia a
secretaria.

Corrigido: o que falha agora é tentado de novo, até 6 vezes. Se a falha for
permanente (sem permissão, por exemplo), ele para e o aviso de erro fica aceso —
não entra em laço infinito.

### Verificado depois da correção

Apaguei os 14 e importei de novo, acompanhando o banco segundo a segundo:

- 0s → 12 alunos por diário (a corrida ainda acontece)
- **6s → 14 em cada um dos 7 diários** (a retentativa recuperou)
- 12s → estável

As 14 matrículas e nomes batem exatamente com a planilha. Depois cliquei em
"Gerar acessos": **14 contas criadas, 0 falhas**.

Uma observação sobre o formato: a planilha traz `ANO/SEMESTRE`, `Turma` e
`Comp. Curricular` no cabeçalho, e o importador **ignora tudo isso de
propósito** — quem manda é o que você escolhe na tela. Assim a mesma planilha
serve para qualquer turma, sem precisar editar o arquivo.

---

## Calendário acadêmico: agora em tabela própria

**Onde preencher:** aba **Dashboard** → cartão "Programação de Prazos &
Fechamento Automático". Quatro campos de data. Salva sozinho, sem botão.

As datas estavam viajando dentro do retrato geral do estado — o JSON único com
o portal inteiro. Funcionava, mas com três fragilidades, e essas datas travam o
lançamento de nota da escola inteira:

- o arquivo é gravado por completo, então dois administradores mexendo ao mesmo
  tempo se sobrescreviam;
- ao trocar a "geração" dos dados o retrato é descartado, e as datas voltavam
  sozinhas para o padrão de fábrica;
- se a gravação falhasse, a data ficava só no computador de quem alterou — e os
  professores seguiam com o prazo antigo, sem ninguém perceber.

Passaram para a tabela `eventos_calendario`, que já existia pronta no banco e
não estava sendo usada. Uma linha por data: mudar a S1 não toca nas outras três.
Se a gravação falhar agora, aparece um aviso dizendo exatamente isso.

Verificado: mudei a data pela tela, conferi na tabela, apaguei a cópia local,
recarreguei — a data voltou do servidor. Também acertei a ordem de exibição, que
saía embaralhada (S1 aparecia depois do Conselho de Classe).

---

## O lançamento de nota pelo professor — o pior bug de todos

Este era o item que faltava conferir. Entrei como professor, digitei a nota,
cliquei em "Salvar Notas". A tela não reclamou de nada. **A nota não chegou ao
banco.**

Três defeitos empilhados, um escondendo o outro:

**1. O professor não via diário nenhum.** O painel docente abria com "Diários
Ativos: 0" mesmo com os diários corretamente atribuídos a ele. A tela decide o
que mostrar por um campo (`assignedJournals`) que deixou de ser preenchido
quando o portal passou a montar o usuário a partir do banco — ficou para trás
na migração. Agora a lista vem da tabela `diarios`, que é quem sabe de verdade
quem leciona o quê.

**2. Recarregar a página não atualizava o usuário.** O portal só conferia o
papel e mantinha o resto do que estava guardado no navegador. Corrigido: a cada
carregamento a pessoa é remontada a partir do servidor. De quebra, transferir um
aluno passa a valer na tela dele sem precisar sair e entrar de novo.

**3. Salvar a nota tentava criar o diário primeiro.** O banco recusa que
professor crie diário — e com razão. Só que o código desistia da nota junto. O
diário já existia; ele apenas não era quem podia criá-lo. Agora procura antes de
criar: se já está lá, grava a nota direto.

O terceiro é o mais perigoso dos três, porque **falhava em silêncio**. O
professor lançaria as notas do bimestre inteiro achando que estava tudo salvo.

Verificado depois da correção, entrando como professor de verdade: digitei AV1 9
e AV2 8, salvei, e conferi no banco — `av1: 9, av2: 8, s1: 17`.

---

## Três bugs que só apareceram clicando na tela

Testei pelo sistema rodando, com o banco aberto do lado conferindo cada clique.
Os três passavam despercebidos porque **a tela dizia que tinha dado certo**.

### 1. Conta de aluno órfã

"Gerar acessos" falhava com *"o login 26109001 já está em uso"* e nunca mais
resolvia — tentava criar de novo, esbarrava no mesmo login, falhava de novo.

A conta existia, mas a ficha do aluno não apontava para ela (a criação tinha
sido interrompida no meio). O efeito era traiçoeiro: **o aluno entrava e o
portal abria vazio**, sem erro nenhum na tela.

Agora, quando a conta já existe, o sistema amarra as duas pontas em vez de
tentar recriar. Confere o papel antes — se aquele login pertencer a um professor
ou funcionário, recusa e avisa.

### 2. Transferência de aluno que não transferia

A tela registrava o histórico ("De Enfermagem 2º matutino ➔ Para ENF-M2-VESP"),
mostrava mensagem de sucesso — e **o aluno continuava na turma antiga** no
banco. Boletim, diários, notas e chamada seguiam todos no lugar errado.

Agora a transferência move a ficha e a matrícula de verdade, apaga a matrícula
antiga (senão o aluno aparecia nas duas turmas) e **só mostra "transferido" se o
banco confirmar**. Se falhar, diz exatamente isso.

Um detalhe: "Transferência de Turno" sozinha não move ninguém, porque turno é
característica da turma, não do aluno. A tela agora explica isso e manda usar
"Transferência de Turma" escolhendo uma turma do turno desejado.

### 3. A tela de transferência não enxergava aluno nenhum

Abria com "Selecione o Aluno **(0)**" mesmo havendo alunos matriculados: ela lia
de um cadastro paralelo, próprio do módulo, onde aluno matriculado pelo caminho
normal nunca entrava. Agora parte dos alunos de verdade.

---

## O último buraco de "salvar tudo", fechado

Além dos três acima, o espelho tinha dois problemas.

**Primeiro:** só copiava chaves que começassem com três nomes específicos.
Qualquer coisa fora deles nascia fora do banco sem ninguém perceber. Inverti a
regra — agora salva tudo por padrão, com uma lista curta e comentada do que
*não* deve subir.

**Segundo, e pior:** só gravações **novas** subiam. Tudo que já estava no
navegador ficava parado ali para sempre, porque ninguém o reescrevia. Descobri
isso conferindo o banco: as aulas previstas e dadas de cada diário estavam na
tela e não no servidor. Agora, ao entrar, o que só existe no navegador é
enviado.

| O que era | Antes | Agora |
|---|---|---|
| Aceite da taxa de seguro de estágio, marcado pelo aluno | só no navegador dele | no banco |
| Aulas previstas/dadas e datas do módulo, por diário | só no navegador | no banco |
| Widgets do painel executivo | só no navegador | no banco |
| Agendamento de backup | só no navegador | no banco |

O caso do seguro era o pior: o aluno pagava, marcava, entrava pelo celular e o
sistema cobrava de novo.

---

## O último buraco de "salvar tudo", fechado

O espelho que leva os dados do navegador para o banco só copiava chaves que
começassem com três nomes específicos. Qualquer coisa fora desses três nomes
nascia **fora do banco, sem ninguém perceber**. Três casos já tinham escapado:

| O que era | Onde estava | Agora |
|---|---|---|
| Aceite da taxa de seguro de estágio, marcado pelo próprio aluno | só no navegador dele | no banco |
| Widgets do painel executivo | só no navegador | no banco |
| Agendamento de backup | só no navegador | no banco |

O caso do seguro era o pior: o aluno pagava, marcava, e ao entrar pelo celular
o sistema cobrava de novo.

**Inverti a regra.** Agora tudo é salvo por padrão, e existe uma lista curta e
comentada do que *não* deve ser salvo — coisas que já têm tabela própria (para
não existirem duas versões da mesma informação, que discordam) ou que só valem
naquele navegador (tema escuro, token de sessão). Chave nova criada daqui para
frente já nasce salvando, sem precisar lembrar de cadastrá-la em lugar nenhum.

Para o aluno conseguir gravar a marcação dele, o banco precisou de uma
liberação nova — é o que o arquivo do passo acima faz. Ela é estreita: o aluno
só grava linha que aponte para a ficha dele. Continua sem conseguir mexer no
financeiro, no CRM, nos estágios, nem na marcação de outro aluno. **Há um teste
automatizado para cada uma dessas quatro tentativas**, e as quatro são
bloqueadas pelo banco.

---

## O buraco mais grave que encontrei

**O diário de classe do professor não estava sendo salvo em lugar nenhum.**

Aulas e chamada eram gravadas junto com o "retrato geral da escola" — um bloco
que só a gestão tem permissão de escrever. Como quem lança aula é o professor,
na prática o diário dele nunca chegava ao servidor. Funcionaria durante o dia e
sumiria ao trocar de computador ou limpar o navegador.

Isso valia também para:

- **Mensagens** enviadas por professor e aluno
- **Documentos** enviados pelo aluno (RG, CPF, diploma)

Os três agora têm tabela própria, com gravação linha a linha e regras de acesso
testadas.

---

## O que foi corrigido nesta madrugada

| # | Problema | Situação |
|---|---|---|
| 1 | Diário de classe do professor não era salvo | Corrigido — tabelas `aulas` e `frequencia` |
| 2 | Mensagens de professor e aluno não eram salvas | Corrigido — tabela `mensagens` |
| 3 | Documentos do aluno não eram salvos | Corrigido — tabela `documentos_aluno` |
| 4 | Mensagem para grupo derrubava a gravação | Corrigido — grupo e pessoa são tratados separadamente |
| 5 | Dois salvamentos automáticos rodando para professor | Corrigido — só a gestão grava o estado geral |
| 6 | Aviso laranja falso no painel do professor | Corrigido |
| 7 | Troca de senha obrigatória era contornável com F5 | Corrigido — a exigência vem do banco |
| 8 | Identidade vinha do navegador, não do servidor | Corrigido — sem sessão válida, não há login |
| 9 | Botão "Cadastrar Docente" não fazia nada | Corrigido — campo de senha era obrigatório |
| 10 | Matriz curricular era apagada pelo banco vazio | Corrigido |
| 11 | Permissões do servidor (`service_role`) | Corrigido — rodei o SQL |
| 12 | Função `criar-usuario` quebrada | Corrigido e publicado |

O item 8 merece atenção: a identidade ficava guardada no navegador, e o portal
acreditava nela ao recarregar. Um aluno podia editar esse valor pelo DevTools,
trocar o papel para ADMIN e abrir as telas administrativas. Agora, a cada
carregamento, quem diz quem você é é o servidor.

O item 7 é da mesma família: como a senha inicial do aluno é a matrícula — que a
turma inteira conhece — bastava apertar F5 na tela de troca para entrar na conta
de outro sem nunca definir senha.

---

## O que está testado, com prova

**51 testes automatizados** rodando contra um PostgreSQL real
(`supabase/testes/testar_seguranca.py`). Entre eles:

- Visitante sem login não lê **nada**
- Aluno vê só as próprias notas; a nota do colega volta vazia
- Aluno não altera nem apaga a própria nota
- Aluno não se promove a administrador
- Aluno não registra aula nem altera a própria presença
- Aluno não envia documento no nome de outro aluno
- Aluno não envia mensagem se passando por professor
- Professor grava aula e chamada **só no diário dele**
- Professor não lança em diário fechado
- Professor não vê financeiro, auditoria nem documentos de aluno
- Toda alteração de nota e frequência fica auditada
- Nem o administrador apaga a auditoria
- Aluno grava a própria marcação, mas não a de outro aluno
- Aluno não grava nem apaga dado da secretaria (financeiro, CRM, estágios)
- Professor não grava no espelho de dados administrativos

Para rodar de novo a qualquer momento:

```
python3 supabase/testes/testar_seguranca.py
```

**No sistema rodando, verifiquei pessoalmente** (clicando, e conferindo no banco
depois de cada clique):

- Cadastro de professor → conta criada com senha de 14 caracteres gerada no servidor
- Login do professor → troca de senha obrigatória → nova senha → login de novo
- Matrícula de aluno → 10 diários criados automaticamente para a turma
- **Gerar acessos** → conta criada e ligada à ficha (`alunos.usuario_id` conferido)
- **Boletim** → gravei nota direto no banco, apaguei o cache do navegador,
  recarreguei: o boletim mostrou S1 7,75 · conceito B · APTO. Ele lê do servidor.
- **Transferência** → aluno movido em `alunos` e `matriculas`, matrícula antiga
  apagada, uma linha só
- Painel do professor sem nenhum erro no console
- Banco com 5 cursos, 103 disciplinas, 585 turmas, 3 professores, mensagens gravando

---

## Como está o cadastro de cada perfil

| Perfil | Usuário | Senha inicial |
|---|---|---|
| Aluno | matrícula | a própria matrícula |
| Professor | `prof_nome` | gerada, 14 caracteres |
| Funcionário | `admin_nome_NN` | gerada, 14 caracteres |
| Administrador | criado no Supabase | definida por você |

Nos três primeiros a senha aparece **uma vez** na confirmação. Anote e entregue.
Todos são obrigados a trocar no primeiro acesso.

---

## Duas coisas que você precisa fazer

**1. Troque a senha do administrador.** Ela apareceu escrita na nossa conversa,
então deixou de ser secreta. Supabase → Authentication → Users → seu usuário →
Reset password.

**2. Apague a conta de teste** quando terminar de conferir: o professor
`prof_teste` (TESTE SILVA PEREIRA). A senha dele também passou pela conversa.

---

## O que ainda NÃO está pronto

Sendo direto, para você não descobrir na quarta:

1. **Hospedagem.** O portal só roda no seu computador, com `npm run dev`. Para a
   escola acessar de outras máquinas, falta publicar (Netlify, grátis).
2. **Financeiro, CRM e estágios** salvam como bloco na tabela `registros_modulo`,
   não em tabelas próprias. Os dados **estão salvos e protegidos** — o que falta
   é formato, não persistência. A consequência prática: não dá para fazer
   relatório em SQL nem o banco impedir dado inconsistente. Não é trabalho para
   véspera de prazo; deixei para depois de quarta de propósito.
3. **Envio de arquivo do aluno** ainda é demonstração na tela. O registro do
   documento salva; o arquivo em si não sobe.
4. **`imageAssets.ts`** tem 248 KB de imagens dentro do código. Deixa o portal
   mais lento para todo mundo.
5. **`xlsx` desatualizado** — vulnerabilidade conhecida na importação de planilhas.
6. **Os outros formulários do painel** (nova turma, nova disciplina, matrícula
   de aluno) ainda têm a lentidão de digitação. Mesma causa, mesma correção.
7. **Resíduos dos meus testes, para apagar:**
   - Aluno "ALUNO TESTE DA SILVA" (26109001) — está em ENF-M2-VESP 2026/2
     porque usei ele para testar a transferência
   - Professor `prof_eu` (matrícula 1004) — senha agora é `TesteCOC2026`
   - Professor `prof_prof` / "PROF PERF TESTE" (matrícula 1005)

---

## Para usar na quarta

O núcleo acadêmico está pronto: cadastros, turmas, disciplinas, professores,
alunos, diários, notas, faltas, diário de classe, mensagens.

Sugestão de sequência:

1. Ligue: `npm run dev` na pasta do projeto
2. Entre como `admin`
3. Cadastre os professores reais (anote as senhas que aparecerem)
4. Em **Cadastros Acadêmicos → Gerenciador de Acessos de Professores**,
   defina turmas e disciplinas de cada um
5. Matricule os alunos (a senha deles é a matrícula)
6. Peça a um professor para lançar uma nota de teste
7. Confira em `supabase/PASSO_G_conferir.txt` se ela chegou

O passo 6 é o único que ainda não vi funcionando de ponta a ponta. Se falhar,
me chame que resolvo rápido — a parte difícil, que era a permissão no banco,
já está testada.
