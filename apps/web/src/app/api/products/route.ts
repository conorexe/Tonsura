import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createProduct, listProducts, updateProduct } from "@tonsura/db";
import { CreateProductSchema } from "@tonsura/validators";

export async function GET(): Promise<NextResponse> {
  const db = getDb();
  return NextResponse.json(await listProducts(db));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = CreateProductSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const product = await createProduct(db, {
    projectId: body.data.projectId,
    masterKeyId: body.data.masterKeyId,
    name: body.data.name,
    description: body.data.description,
    slug: body.data.slug,
    pathAlias: body.data.pathAlias,
    unitType: body.data.unitType,
    pricePerMillionTokens: body.data.pricePerMillionTokens,
    costPerMillionTokens: body.data.costPerMillionTokens,
    transformConfig: body.data.transformConfig ?? null,
    defaultRpmLimit: body.data.defaultRpmLimit,
    defaultRpdLimit: body.data.defaultRpdLimit,
    defaultDailyTokenLimit: body.data.defaultDailyTokenLimit,
  });

  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = CreateProductSchema.partial().safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const product = await updateProduct(
    db,
    id,
    body.data as Parameters<typeof updateProduct>[2]
  );
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(product);
}
