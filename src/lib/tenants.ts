import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { memberships, tenants } from "@/db/schema";
import { slugify } from "@/lib/utils";

export async function listTenantsForUser(userId: string) {
  const db = getDb();
  return db
    .select({
      id: tenants.id,
      name: tenants.name,
      slug: tenants.slug,
      systemPrompt: tenants.systemPrompt,
      role: memberships.role,
      createdAt: tenants.createdAt,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId));
}

export async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: memberships.id, role: memberships.role })
    .from(memberships)
    .where(
      and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)),
    )
    .limit(1);

  if (!row) {
    throw new Error("Forbidden: no access to this tenant");
  }
  return row;
}

export async function createTenantForUser(params: {
  userId: string;
  name: string;
  systemPrompt?: string;
}) {
  const db = getDb();
  const base = slugify(params.name) || "tenant";
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: params.name.trim(),
      slug,
      systemPrompt: params.systemPrompt?.trim() || null,
    })
    .returning();

  await db.insert(memberships).values({
    tenantId: tenant.id,
    userId: params.userId,
    role: "owner",
  });

  return tenant;
}

export async function ensureDefaultTenant(userId: string) {
  const existing = await listTenantsForUser(userId);
  if (existing.length > 0) return existing[0];
  return createTenantForUser({
    userId,
    name: "Workspace Saya",
    systemPrompt:
      "Anda adalah asisten BalAI untuk workspace ini. Jawab hanya dari knowledge yang tersedia.",
  });
}
