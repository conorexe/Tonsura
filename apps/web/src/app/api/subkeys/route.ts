import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  createSubKey,
  revokeSubKey,
  listSubKeys,
  getProjectById,
  listActiveProductsByProject,
} from "@tonsura/db";
import { generateSubKey, hashSubKey } from "@tonsura/crypto";
import { CreateSubKeySchema } from "@tonsura/validators";

export async function GET(): Promise<NextResponse> {
  const db = getDb();
  return NextResponse.json(await listSubKeys(db));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = CreateSubKeySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const db = getDb();

  // Feature key: authorize a whole project (feature). Resolve a primary
  // productId (preferring an aliased product) for the sub_keys row.
  let productId = body.data.productId;
  let projectId: string | undefined;
  if (body.data.projectId) {
    const project = await getProjectById(db, body.data.projectId);
    if (!project) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }
    const products = await listActiveProductsByProject(db, body.data.projectId);
    if (products.length === 0) {
      return NextResponse.json(
        { error: "Feature has no active products to bind. Add a product first." },
        { status: 400 }
      );
    }
    // A feature key routes by path alias, so at least one product must carry one
    // — otherwise the key would authorize the feature but no call could resolve.
    if (!products.some((p) => p.pathAlias)) {
      return NextResponse.json(
        {
          error:
            "No product in this feature has a path alias, so requests can't be routed. Set a path alias on a product first.",
        },
        { status: 400 }
      );
    }
    projectId = body.data.projectId;
    productId =
      productId ?? (products.find((p) => p.pathAlias) ?? products[0]).id;
  }

  if (!productId) {
    return NextResponse.json(
      { error: "productId or projectId is required" },
      { status: 400 }
    );
  }

  const plainKey = generateSubKey();
  const keyHash = hashSubKey(plainKey);

  const subKey = await createSubKey(db, {
    productId,
    projectId,
    keyHash,
    label: body.data.label,
    rpmLimit: body.data.rpmLimit,
    rpdLimit: body.data.rpdLimit,
    dailyTokenLimit: body.data.dailyTokenLimit,
    expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : undefined,
  });

  // Return plaintext key ONCE — never stored
  return NextResponse.json({ ...subKey, plainKey }, { status: 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  await revokeSubKey(db, id);

  // The gateway's in-process meta cache holds revoked keys for up to 60s.
  return NextResponse.json({ ok: true });
}
