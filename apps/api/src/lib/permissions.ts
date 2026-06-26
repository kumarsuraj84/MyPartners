// Role-based permissions — no complex ACL matrices.
// Add a new permission key here and map it in ROLE_PERMISSIONS below.

export type SystemRole = 'owner' | 'executive' | 'manager' | 'assistant' | 'administrator'

export interface Permission {
  // Configuration
  manageConfig: boolean
  viewConfig: boolean
  // Integrations
  manageIntegrations: boolean
  // Users
  manageUsers: boolean
  // Messages & tasks
  viewMessages: boolean
  manageMessages: boolean
  viewTasks: boolean
  manageTasks: boolean
  // Intelligence
  viewBriefs: boolean
  viewMemory: boolean
  manageMemory: boolean
  triggerAI: boolean
  viewAIActivity: boolean
  // Compliance
  viewAuditLog: boolean
}

const ROLE_PERMISSIONS: Record<SystemRole, Permission> = {
  owner: {
    manageConfig: true,  viewConfig: true,
    manageIntegrations: true,
    manageUsers: true,
    viewMessages: true,  manageMessages: true,
    viewTasks: true,     manageTasks: true,
    viewBriefs: true,
    viewMemory: true,    manageMemory: true,
    triggerAI: true,     viewAIActivity: true,
    viewAuditLog: true,
  },
  administrator: {
    manageConfig: true,  viewConfig: true,
    manageIntegrations: true,
    manageUsers: true,
    viewMessages: true,  manageMessages: true,
    viewTasks: true,     manageTasks: true,
    viewBriefs: true,
    viewMemory: true,    manageMemory: true,
    triggerAI: true,     viewAIActivity: true,
    viewAuditLog: true,
  },
  executive: {
    manageConfig: false, viewConfig: true,
    manageIntegrations: true,
    manageUsers: false,
    viewMessages: true,  manageMessages: true,
    viewTasks: true,     manageTasks: true,
    viewBriefs: true,
    viewMemory: true,    manageMemory: true,
    triggerAI: true,     viewAIActivity: true,
    viewAuditLog: false,
  },
  manager: {
    manageConfig: false, viewConfig: false,
    manageIntegrations: false,
    manageUsers: false,
    viewMessages: true,  manageMessages: false,
    viewTasks: true,     manageTasks: true,
    viewBriefs: false,
    viewMemory: true,    manageMemory: false,
    triggerAI: false,    viewAIActivity: false,
    viewAuditLog: false,
  },
  assistant: {
    manageConfig: false, viewConfig: false,
    manageIntegrations: false,
    manageUsers: false,
    viewMessages: false, manageMessages: false,
    viewTasks: true,     manageTasks: true,
    viewBriefs: false,
    viewMemory: false,   manageMemory: false,
    triggerAI: false,    viewAIActivity: false,
    viewAuditLog: false,
  },
}

export function can(role: string, permission: keyof Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as SystemRole] ?? ROLE_PERMISSIONS.executive
  return perms[permission] === true
}

export function getPermissions(role: string): Permission {
  return ROLE_PERMISSIONS[role as SystemRole] ?? ROLE_PERMISSIONS.executive
}
