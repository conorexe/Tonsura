import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createProject, listProjects } from "@tonsura/db";
import { CreateProjectSchema } from "@tonsura/validators";

export async function GET(): Promise<NextResponse> {
  const db = getDb();
  return NextResponse.json(await listProjects(db));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = CreateProjectSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const project = await createProject(db, {
    name: body.data.name,
    slug: body.data.slug,
    description: body.data.description,
  });

  return NextResponse.json(project, { status: 201 });
}
