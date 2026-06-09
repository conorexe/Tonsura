import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  createMasterKey,
  createCustomProvider,
  listMasterKeys,
  revokeMasterKey,
} from "@tonsura/db";
import { encryptKey } from "@tonsura/crypto";
import { z } from "zod";

// Either attach a key to an existing provider, or define a brand-new custom
// upstream inline (any API on any platform) by giving its base URL + auth.
const CustomProviderSchema = z.object({
  name: z.string().min(1).max(120),
  baseUrl: z.string().url(),
  type: z
    .enum(["llm", "generic", "openai", "anthropic", "elevenlabs"])
    .default("generic"),
  authScheme: z.enum(["bearer", "header", "query"]).default("bearer"),
  authParam: z.string().max(120).optional(),
});

const CreateMasterKeyBody = z
  .object({
    providerId: z.string().uuid().optional(),
    customProvider: CustomProviderSchema.optional(),
    label: z.string().min(1).max(200),
    plainKey: z.string().min(1),
  })
  .refine((d) => !!d.providerId || !!d.customProvider, {
    message: "Provide either providerId or customProvider",
  });

export async function GET(): Promise<NextResponse> {
  const db = getDb();
  return NextResponse.json(await listMasterKeys(db));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = CreateMasterKeyBody.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const encryptedKey = encryptKey(
    body.data.plainKey,
    process.env["MASTER_ENCRYPTION_SECRET"]!
  );

  // Resolve the provider: an existing one, or a custom upstream created on the fly.
  let providerId = body.data.providerId;
  if (!providerId && body.data.customProvider) {
    const cp = body.data.customProvider;
    const provider = await createCustomProvider(db, {
      name: cp.name,
      baseUrl: cp.baseUrl,
      type: cp.type,
      authScheme: cp.authScheme,
      authParam: cp.authParam ?? null,
    });
    providerId = provider.id;
  }

  const key = await createMasterKey(db, {
    providerId: providerId!,
    label: body.data.label,
    encryptedKey,
  });

  return NextResponse.json({ id: key.id, label: key.label }, { status: 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getDb();
  await revokeMasterKey(db, id);
  return NextResponse.json({ ok: true });
}
