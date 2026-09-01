import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, HelpCircle, Search } from 'lucide-react';

interface Secao {
  titulo: string;
  itens: { titulo: string; texto: string }[];
}

// MANUAL DO SISTEMA — mantido atualizado sempre que uma funcionalidade nova
// entra no Portal. Ver MANUAL_DO_SISTEMA.md na raiz do projeto pra edição
// mais confortável; este arquivo é a versão que aparece dentro do próprio
// sistema, pro botão "Ajuda".
const SECOES: Secao[] = [
  {
    titulo: 'Dashboard',
    itens: [
      { titulo: 'Visão geral', texto: 'Mostra os números principais da escola: total de alunos, professores, turmas, diários pendentes, matrículas online recebidas, e outros indicadores. É a primeira tela que o Admin vê ao entrar.' },
    ],
  },
  {
    titulo: 'CRM',
    itens: [
      { titulo: 'Dashboard do CRM', texto: 'Resumo de leads, tarefas, matrículas do funil comercial, e agora também o total de matrículas recebidas pelo site externo de matrícula online.' },
      { titulo: 'Leads', texto: 'Cadastro de pessoas interessadas em fazer matrícula. Cada lead tem nome, telefone, curso de interesse, origem, responsável e status (Novo, Em contato, Matriculado, etc).' },
      { titulo: 'Kanban', texto: 'Visão em colunas do funil comercial — arrasta o lead de uma etapa pra outra conforme o atendimento avança.' },
      { titulo: 'Tarefas', texto: 'Lista de tarefas do time comercial, com prazo, prioridade e status.' },
      { titulo: 'Calendário', texto: 'Agenda de compromissos e eventos do CRM.' },
      { titulo: 'Funcionários', texto: 'Cadastro da equipe comercial (diferente dos professores/secretaria do resto do sistema).' },
      { titulo: 'Atendimento', texto: 'Linha do tempo de tudo que já aconteceu com um lead específico (ligações, observações, mudanças de status).' },
    ],
  },
  {
    titulo: 'Cadastros Acadêmicos',
    itens: [
      { titulo: 'Cadastrar Novo Curso', texto: 'Cria um curso técnico novo: nome, descrição, carga horária, turnos oferecidos, status. Também é aqui que se escolhe o Coordenador do curso (um professor) e a Resolução (ato legal que autoriza o curso) — os dois são opcionais.' },
      { titulo: 'Funcionários do Sistema', texto: 'Gerencia contas de Secretaria/Admin (diferente de professor/aluno).' },
      { titulo: 'Dependências', texto: 'Tela de matricular um aluno em dependência de uma disciplina específica. Gera o diário automaticamente.' },
      { titulo: 'Turmas, Professores & Alunos — Cadastrar Nova Turma', texto: 'Cria uma turma: nome, código, curso, turno, módulo.' },
      { titulo: 'Turmas, Professores & Alunos — Nova Disciplina', texto: 'Cadastra uma disciplina dentro de um curso/módulo, com carga horária. Tem também Código (opcional) e Ementa (resumo oficial pra documento, opcional).' },
      { titulo: 'Turmas, Professores & Alunos — Cadastrar Usuário (Docente ou Administração)', texto: 'Cadastro rápido de professor ou admin — só nome, e-mail, senha.' },
      { titulo: 'Turmas, Professores & Alunos — Matricular Aluno na Turma', texto: 'Cadastro rápido de aluno — nome e matrícula (digitada à mão), vincula direto numa turma.' },
      { titulo: 'Turmas, Professores & Alunos — Cadastro Completo (Aluno ou Professor)', texto: 'Card roxo, mais completo: já sugere a próxima matrícula automaticamente, e permite preencher endereço, filiação, documentos e (pra professor) conselho de classe, tudo na hora do cadastro. Cria a ficha e o acesso de login juntos.' },
      { titulo: 'Turmas, Professores & Alunos — Gerenciar Usuários Cadastrados', texto: 'Lista de todo mundo já cadastrado, com busca. Cada linha tem: Editar (nome, e-mail, senha, papel, matrícula, CPF), Ficha Completa (ícone de cartão de identidade — endereço, filiação, documentos), e Apagar Tudo (só pra cadastro de teste). Pra professor, também aparecem os botões "Ver Histórico" e "Ver Acessos", que dão permissão extra pra esse professor específico (sem virar admin).' },
      { titulo: 'Turmas, Professores & Alunos — Gerenciador de Acessos de Professores', texto: 'Define quais salas/diários cada professor pode ver e lançar nota.' },
      { titulo: 'Turmas, Professores & Alunos — Transferência de Aluno', texto: 'Move um aluno de uma turma pra outra. Também tem o botão "Remover da Turma" — tira o aluno de uma turma errada sem precisar indicar outra na hora (não apaga nota real já lançada, por segurança).' },
      { titulo: 'Turmas, Professores & Alunos — Controle de Documentos Obrigatórios', texto: 'Mostra quais documentos cada aluno já entregou. Tem uma opção de marcar o sexo do aluno (Homem/Mulher) — isso decide se o Certificado de Reservista aparece na lista de documentos obrigatórios dele. Alunos de Instrumentação Cirúrgica também veem, além dos documentos normais, Diploma e Histórico de Técnico ou Graduação em Enfermagem.' },
      { titulo: 'Turmas, Professores & Alunos — Histórico de Matrículas', texto: 'Busca um aluno e mostra tudo: em quais semestres/salas ele já foi matriculado, as dependências (com opção de cancelar), e os estágios (Realizados/Pendentes). Também é aqui que se cancela a matrícula do semestre atual (vira "Desistente" em todas as disciplinas daquela turma, e já aparece assim no diário do professor).' },
      { titulo: 'Turmas, Professores & Alunos — Matrículas Semestrais', texto: 'Clica em "Pesquisar" e mostra o resumo do período letivo ativo: quantos alunos são novos, quantos são veteranos, quantas dependências e estágios, o total geral, e a quebra por sala.' },
      { titulo: 'Grades Curriculares', texto: 'Escolhe um curso e mostra a matriz curricular oficial completa (todos os módulos, componentes e carga horária), com o mesmo cabeçalho oficial usado nas declarações. Tem botão de imprimir/baixar em PDF. Conteúdo fixo, baseado nos documentos oficiais da escola — se a grade de algum curso mudar oficialmente, precisa avisar pra atualizar aqui também.' },
      { titulo: 'Ver Como', texto: 'Permite o Admin "virar" a tela de um professor ou aluno específico, pra ver o sistema com os olhos dessa pessoa (mesmas permissões). Fica registrado no log de segurança.' },
    ],
  },
  {
    titulo: 'Importar Planilhas',
    itens: [
      { titulo: 'Importação em massa', texto: 'Sobe uma planilha (Excel/CSV) com vários alunos de uma vez, já matriculando numa turma escolhida.' },
    ],
  },
  {
    titulo: 'Mensagens & Avisos',
    itens: [
      { titulo: 'Comunicação', texto: 'Envia avisos e mensagens pra alunos e/ou professores, por turma ou individualmente.' },
    ],
  },
  {
    titulo: 'Histórico do Aluno',
    itens: [
      { titulo: 'Boletim completo', texto: 'Busca um aluno e mostra o boletim de todas as disciplinas de todos os módulos que ele já cursou, com opção de imprimir o Histórico Completo oficial.' },
    ],
  },
  {
    titulo: 'Estágio (Secretaria de Estágios)',
    itens: [
      { titulo: 'Lançar nota de estágio', texto: 'Busca o aluno e mostra a grade de componentes curriculares de estágio do curso dele — carga horária, local, professor e nota, com botão "Lançar" em cada um. Mostra automaticamente o que já foi feito e o que está pendente.' },
    ],
  },
  {
    titulo: 'Movimentação',
    itens: [
      { titulo: 'Estágios (Vagas)', texto: 'Sistema separado de vagas de estágio — vincula um grupo de alunos a uma empresa/campo específico, com professor responsável, cronograma e ficha de avaliação. Tem a sub-aba "Estágios Realizados e Pendentes" que busca o aluno e mostra as duas colunas lado a lado.' },
      { titulo: 'Minicursos e Eventos', texto: 'Cadastra um minicurso ou evento (título, instrutor, local, data, carga horária, taxa). Inscreve participantes, marca presença, e gera certificado de participação (usando um modelo pronto ou enviando um PDF já pronto).' },
    ],
  },
  {
    titulo: 'Requerimentos',
    itens: [
      { titulo: 'O que é', texto: 'Fila de pedidos de documento da secretaria: Histórico Escolar, Declaração de Conclusão, Diploma, Segunda Via de Diploma, Transferência, Contrato, Requerimento de Matrícula, Certificado de Auxiliar de Enfermagem e Relatório do Estágio. Grava no banco de dados, então o pedido aberto num computador aparece em todos os outros na hora. Não confundir com a tela antiga de mesmo nome escondida dentro de Movimentação, que guardava tudo só no navegador e não deve ser usada.' },
      { titulo: 'Fila de Pedidos', texto: 'Mostra todos os requerimentos. Os cinco quadradinhos de cima contam quantos estão em cada situação (Solicitado, Em andamento, Pronto, Entregue, Cancelado) — e clicar num deles filtra a lista. Tem busca por nome, matrícula, protocolo ou tipo. Pedido que passou do prazo aparece com a tarja vermelha "Prazo vencido". A situação se muda pela caixinha na própria linha; ao marcar "Entregue", a data da entrega é gravada sozinha.' },
      { titulo: 'Novo Requerimento', texto: 'Busca o aluno pelo nome ou matrícula, escolhe o que ele está pedindo, e o prazo de entrega já é calculado sozinho a partir do prazo cadastrado naquele tipo. O número de protocolo (REQ-2026-0001) também é gerado automaticamente.' },
      { titulo: 'Tipos e Prazos', texto: 'O catálogo do que pode ser pedido. Aqui a secretaria edita nome, prazo em dias, valor da taxa e a explicação que aparece na hora de abrir o pedido — sem precisar chamar ninguém pra mexer no código. Os nove tipos da escola já vêm cadastrados, e o botão "Novo Tipo" cadastra outros a qualquer momento.' },
      { titulo: 'Taxa', texto: 'O botão com o valor alterna entre PAGA e A PAGAR, marcado à mão pela secretaria. A conferência automática de aluno inadimplente depende do menu Financeiro, que ainda não foi ligado ao banco de dados.' },
      { titulo: 'Apagar x Cancelar', texto: 'Prefira mudar a situação para "Cancelado" quando o aluno desistir do pedido — assim fica registrado no histórico. O botão da lixeira apaga de vez e não tem volta.' },
    ],
  },
  {
    titulo: 'Criador de Provas (painel do professor)',
    itens: [
      { titulo: 'Montar uma prova', texto: 'O professor escolhe turma/disciplina, monta o cabeçalho, adiciona questões (múltipla escolha, objetiva, ou correlacionar colunas), pode inserir imagem e tabela dentro de uma questão, define frase motivacional (com alinhamento escolhido) e imprime — com timbre oficial da escola.' },
      { titulo: 'Gabarito', texto: 'Ao imprimir, tem a opção de incluir uma folha de gabarito separada, só pro professor.' },
    ],
  },
];

interface Props {
  onClose: () => void;
}

export const AjudaModal: React.FC<Props> = ({ onClose }) => {
  const [busca, setBusca] = useState('');

  const secoesFiltradas = busca.trim().length < 2
    ? SECOES
    : SECOES.map(s => ({
        ...s,
        itens: s.itens.filter(i =>
          i.titulo.toLowerCase().includes(busca.toLowerCase()) ||
          i.texto.toLowerCase().includes(busca.toLowerCase())
        ),
      })).filter(s => s.itens.length > 0);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Manual do Sistema</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por palavra (ex: matrícula, resolução, prova...)"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none text-sm text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {secoesFiltradas.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">Nenhum resultado encontrado pra essa busca.</p>
          ) : (
            secoesFiltradas.map(secao => (
              <div key={secao.titulo}>
                <h4 className="font-black text-xs text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  {secao.titulo}
                </h4>
                <div className="space-y-2.5">
                  {secao.itens.map(item => (
                    <div key={item.titulo} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{item.titulo}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{item.texto}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50">
          <p className="text-[10px] text-slate-400 text-center">
            Este manual é atualizado sempre que uma funcionalidade nova entra no sistema.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
