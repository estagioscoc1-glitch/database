import { User, UserRole, PermissionModule, ModuleActions, StaffPermissions } from '../types';

/**
 * MÓDULOS QUE O ADMINISTRADOR PODE LIBERAR.
 *
 * Esta lista espelha as abas do painel do administrador, uma linha por aba.
 * A lista anterior não espelhava: trazia Cursos, Disciplinas, Turmas,
 * Matrículas e Boletins, que não são abas próprias, e não trazia CRM,
 * Movimentação, Requerimentos, Estágios, Mensagens, Acessos nem Backup. Quem
 * marcasse aquelas caixinhas não estava liberando nada.
 *
 * O `id` de cada módulo é o mesmo nome que a aba usa dentro do
 * AdminDashboard (`activeTab`). É essa igualdade que faz o menu obedecer:
 * mudou um, tem que mudar o outro.
 *
 * Financeiro e Relatórios entram já preparados, mesmo ocultos para todos
 * hoje — quando forem destravados, a permissão já existe.
 */
export const PERMISSION_MODULES: { id: PermissionModule; label: string; description: string }[] = [
  { id: 'visu',               label: 'Dashboard',            description: 'Painel principal com números e gráficos' },
  { id: 'crm',                label: 'CRM',                  description: 'Leads, funil de vendas, tarefas e atendimento' },
  { id: 'reg',                label: 'Cadastros Acadêmicos', description: 'Alunos, professores, cursos, turmas e funcionários' },
  { id: 'orientacao',         label: 'Movimentação',         description: 'Estágios, minicursos e eventos' },
  { id: 'estagio',            label: 'Estágios',             description: 'Tela de estágios do menu principal' },
  { id: 'requerimentos',      label: 'Requerimentos',        description: 'Fila de pedidos, contratos e declarações' },
  { id: 'historico_completo', label: 'Histórico do Aluno',   description: 'Histórico escolar completo e parcial' },
  { id: 'imp',                label: 'Importar Planilhas',   description: 'Importação de dados por planilha' },
  { id: 'msg',                label: 'Mensagens & Avisos',   description: 'Comunicados para alunos e professores' },
  { id: 'acessos',            label: 'Acessos e Presença',   description: 'Quem entrou no sistema e de onde' },
  { id: 'sec',                label: 'Backup & Segurança',   description: 'Cópias de segurança e registros do sistema' },
  { id: 'financeiro',         label: 'Financeiro',           description: 'Mensalidades, inadimplência e cobrança' },
  { id: 'relatorios',         label: 'Relatórios',           description: 'Relatórios gerenciais e estatísticos' },
];

export const ALL_MODULE_KEYS: PermissionModule[] = PERMISSION_MODULES.map(m => m.id);

export function getDefaultStaffPermissions(fullAccess = false): StaffPermissions {
  const perms: StaffPermissions = {};
  ALL_MODULE_KEYS.forEach(mod => {
    perms[mod] = {
      view: fullAccess,
      create: fullAccess,
      edit: fullAccess,
      delete: false,
      print: fullAccess,
      export: fullAccess,
    };
  });
  return perms;
}

/**
 * Diz se a pessoa pode fazer alguma coisa num módulo.
 *
 * Administrador pode tudo, sempre. Isso é proposital: evita a situação de um
 * administrador se trancar para fora do próprio sistema.
 */
export function hasPermission(
  user: User | null,
  module: PermissionModule,
  action: keyof ModuleActions = 'view'
): boolean {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true;

  if (user.role === UserRole.TEACHER) {
    if (['visu', 'msg'].includes(module) && action === 'view') return true;
    return false;
  }

  if (user.role === UserRole.STUDENT) {
    if (['visu', 'historico_completo'].includes(module) && action === 'view') return true;
    return false;
  }

  if (user.role === UserRole.STAFF) {
    /* Funcionário sem nada gravado enxerga só o Dashboard. É de propósito:
       quem foi cadastrado antes desta tela existir não deve herdar acesso
       total por descuido. O administrador libera na mão. */
    if (!user.staffPermissions) return module === 'visu' && action === 'view';
    const modPerm = user.staffPermissions[module];
    if (!modPerm) return false;
    return !!modPerm[action];
  }

  return false;
}
