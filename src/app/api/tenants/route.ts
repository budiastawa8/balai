import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createTenantForUser,
  ensureDefaultTenant,
  listTenantsForUser,
} from "@/lib/tenants";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDefaultTenant(userId);
    const tenants = await listTenantsForUser(userId);
    return NextResponse.json({ tenants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list tenants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      systemPrompt?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const tenant = await createTenantForUser({
      userId,
      name: body.name,
      systemPrompt: body.systemPrompt,
    });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tenant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
