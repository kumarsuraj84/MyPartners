/**
 * Business Memory Entity Resolver
 *
 * Turns raw AI-extracted data into structured domain objects (Person, Organization,
 * Project, Decision) and links them to the originating message.
 *
 * Resolution rules:
 * - Person: match by email (exact), then by name (case-insensitive) within tenant
 * - Organization: match by domain (exact), then by name (case-insensitive)
 * - Project: match by name (case-insensitive) within tenant
 * - Decision: always create (decisions are point-in-time events)
 *
 * Deduplication avoids growing the graph with noise — we'd rather miss a link
 * than create a duplicate entity.
 */

import { prisma } from './prisma.js'

// Personal email domains — don't infer an Organization from these
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'me.com', 'live.com', 'aol.com', 'protonmail.com', 'hey.com',
])

export interface ResolverInput {
  userId:       string
  messageId:    string
  fromAddress:  string
  fromName:     string | null
  entities:     Array<{ name: string; type: string; context: string }>
  memoryItems:  Array<{ title: string; type: string; content: string }>
}

export async function resolveEntities(input: ResolverInput): Promise<void> {
  const tenantId = input.userId // V1: tenant === user

  // Always resolve the sender — 100% confidence
  const senderOrg = await resolveSenderOrganization(tenantId, input.fromAddress, input.userId)
  const senderPerson = await resolveSenderPerson(tenantId, input.fromAddress, input.fromName, senderOrg?.id ?? null, senderOrg?.name ?? null, input.userId)

  await linkToMessage(tenantId, input.messageId, 'person', { personId: senderPerson.id }, 1.0, input.fromName ?? input.fromAddress)

  if (senderOrg) {
    await linkToMessage(tenantId, input.messageId, 'organization', { organizationId: senderOrg.id }, 1.0, senderOrg.name)
  }

  // Process AI-extracted entities
  for (const entity of input.entities) {
    const type = entity.type.toLowerCase()

    if (type === 'person') {
      const person = await resolvePersonByName(tenantId, entity.name, input.userId)
      if (person) {
        await linkToMessage(tenantId, input.messageId, 'person', { personId: person.id }, 0.8, entity.context)
      }

    } else if (type === 'company' || type === 'organization') {
      const org = await resolveOrganizationByName(tenantId, entity.name, input.userId)
      await linkToMessage(tenantId, input.messageId, 'organization', { organizationId: org.id }, 0.85, entity.context)

    } else if (type === 'project') {
      const project = await resolveProject(tenantId, entity.name, input.userId)
      await linkToMessage(tenantId, input.messageId, 'project', { projectId: project.id }, 0.8, entity.context)
    }
  }

  // Decisions from memory items — these are point-in-time records, always create
  for (const item of input.memoryItems) {
    if (item.type === 'decision') {
      const businessDecision = await prisma.businessDecision.create({
        data: {
          tenantId,
          title: item.title,
          description: item.content,
          status: 'made',
          createdBy: input.userId,
        },
      })
      await linkToMessage(tenantId, input.messageId, 'decision', { businessDecisionId: businessDecision.id }, 0.9, item.title)
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function resolveSenderOrganization(tenantId: string, email: string, userId: string) {
  const domain = email.split('@')[1]
  if (!domain || PERSONAL_DOMAINS.has(domain)) return null
  return resolveOrganizationByDomain(tenantId, domain, userId)
}

async function resolveSenderPerson(
  tenantId: string,
  email: string,
  name: string | null,
  organizationId: string | null,
  company: string | null,
  userId: string,
) {
  return prisma.person.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: {
      tenantId,
      name: name ?? email,
      email,
      company: company ?? undefined,
      organizationId: organizationId ?? undefined,
      createdBy: userId,
    },
    update: {
      // Only update name if we have one (don't overwrite known name with null)
      ...(name ? { name } : {}),
      ...(company ? { company } : {}),
      ...(organizationId ? { organizationId } : {}),
    },
  })
}

async function resolvePersonByName(tenantId: string, name: string, userId: string) {
  if (!name?.trim()) return null
  // Exact name match within tenant
  const existing = await prisma.person.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return existing
  // Create with low confidence (no email to anchor)
  return prisma.person.create({
    data: { tenantId, name, createdBy: userId },
  })
}

async function resolveOrganizationByDomain(tenantId: string, domain: string, userId: string) {
  const existing = await prisma.organization.findFirst({ where: { tenantId, domain } })
  if (existing) return existing

  // Derive a readable name from domain (acmecorp.com → Acmecorp)
  const name = domain.split('.')[0]!.charAt(0).toUpperCase() + domain.split('.')[0]!.slice(1)

  // Check if an org with this name already exists
  const byName = await prisma.organization.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } },
  })
  if (byName) {
    // Update with domain
    return prisma.organization.update({ where: { id: byName.id }, data: { domain } })
  }

  return prisma.organization.create({ data: { tenantId, name, domain, createdBy: userId } })
}

async function resolveOrganizationByName(tenantId: string, name: string, userId: string) {
  const existing = await prisma.organization.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return existing
  return prisma.organization.create({ data: { tenantId, name, createdBy: userId } })
}

async function resolveProject(tenantId: string, name: string, userId: string) {
  const existing = await prisma.project.findFirst({
    where: { tenantId, name: { equals: name, mode: 'insensitive' } },
  })
  if (existing) return existing
  return prisma.project.create({ data: { tenantId, name, createdBy: userId } })
}

async function linkToMessage(
  tenantId: string,
  messageId: string,
  entityType: string,
  ids: { personId?: string; organizationId?: string; projectId?: string; businessDecisionId?: string },
  confidence: number,
  extractedText?: string,
) {
  // Avoid duplicate links for the same entity
  const existing = await prisma.messageEntity.findFirst({
    where: {
      messageId,
      entityType,
      ...(ids.personId ? { personId: ids.personId } : {}),
      ...(ids.organizationId ? { organizationId: ids.organizationId } : {}),
      ...(ids.projectId ? { projectId: ids.projectId } : {}),
      ...(ids.businessDecisionId ? { businessDecisionId: ids.businessDecisionId } : {}),
    },
  })
  if (existing) return

  await prisma.messageEntity.create({
    data: { tenantId, messageId, entityType, confidence, extractedText, ...ids },
  })
}
