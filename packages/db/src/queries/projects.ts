import { eq } from "drizzle-orm";
import type { DrizzleClient } from "../client";
import { projects } from "../schema/index";

export async function createProject(
  db: DrizzleClient,
  data: typeof projects.$inferInsert
) {
  const [row] = await db.insert(projects).values(data).returning();
  return row;
}

export async function listProjects(db: DrizzleClient) {
  return db.select().from(projects).orderBy(projects.createdAt);
}

export async function getProjectById(db: DrizzleClient, id: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return row ?? null;
}
