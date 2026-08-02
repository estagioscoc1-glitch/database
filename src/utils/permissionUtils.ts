import { User, UserRole, PermissionModule, ModuleActions, StaffPermissions } from '../types';

export const PERMISSION_MODULES: { id: PermissionModule; label: string; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Acesso ao painel principal e relatórios visuais' },
  { id: 'cadastros', label: 'Cadastros Acadêmicos', description: 'Gestão geral de turmas, alunos e matérias' },
  { id: 'cursos', label: 'Cursos', description: 'Cadastrar, editar e visualizar cursos' },
  { id: 'disciplinas', label: 'Disciplinas', description: 'Cadastrar e gerenciar disciplinas por curso' },
  { id: 'turmas', label: 'Turmas', description: 'Gerenciar seções e turmas das turmas' },
  { id: 'matriculas', label: 'Matrículas', description: 'Matricular e transferir alunos' },
  { id: 'dependencias', label: 'Dependências', description: 'Gestão de dependências e diários automáticos' },
  { id: 'funcionarios', label: 'Funcionários do Sistema', description: 'Gestão de equipe interna e permissões de acesso' },
  { id: 'diarios', label: 'Diário dos Professores', description: 'Lançamentos de notas e frequências' },
  { id: 'frequencia', label: 'Frequência', description: 'Visualização e controle de presenças' },
  { id: 'boletins', label: 'Boletins', description: 'Geração e impressão de boletins' },
  { id: 'historico', label: 'Histórico Escolar', description: 'Histórico acadêmico oficial dos alunos' },
  { id: 'certificados', label: 'Certificados & Declarações', description: 'Emissão de certificados e documentos' },
  { id: 'financeiro', label: 'Financeiro', description: 'Módulo de tesouraria e cobranças' },
  { id: 'relatorios', label: 'Relatórios', description: 'Relatórios gerenciais e estatísticos' },
  { id: 'usuarios', label: 'Usuários', description: 'Gerenciamento de usuários e senhas' },
  { id: 'importacoes', label: 'Importações', description: 'Importação de planilhas Excel' },
  { id: 'exportacoes', label: 'Exportações', description: 'Exportação de relatórios e relatórios em PDF/Excel' },
  { id: 'configuracoes', label: 'Configurações', description: 'Configurações globais do sistema' },
  { id: 'administracao', label: 'Administração Geral', description: 'Acesso às configurações administrativas avançadas' },
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
 * Checks if a user has a specific permission on a module.
 * Admin users have full permissions on all modules by default.
 */
export function hasPermission(
  user: User | null,
  module: PermissionModule,
  action: keyof ModuleActions = 'view'
): boolean {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.TEACHER) {
    // Teachers have default access to relevant teacher modules
    if (['dashboard', 'diarios', 'frequencia', 'boletins'].includes(module) && action === 'view') {
      return true;
    }
    return false;
  }
  if (user.role === UserRole.STUDENT) {
    if (['dashboard', 'boletins', 'historico'].includes(module) && action === 'view') {
      return true;
    }
    return false;
  }
  if (user.role === UserRole.STAFF) {
    if (!user.staffPermissions) return false;
    const modPerm = user.staffPermissions[module];
    if (!modPerm) return false;
    return !!modPerm[action];
  }
  return false;
}
