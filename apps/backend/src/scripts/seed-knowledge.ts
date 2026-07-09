/**
 * Seed knowledge embeddings vào DB.
 * Chỉ re-embed section nào có content thay đổi (so sánh SHA-256 hash).
 * Hỗ trợ Jina fallback khi OpenAI fail.
 *
 * Chạy: pnpm --filter @xcash/backend seed:knowledge
 */

import * as crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { BILLING_SETTINGS_KNOWLEDGE } from '../modules/ai/knowledge/billing-settings';
import { CASSO_KNOWLEDGE } from '../modules/ai/knowledge/casso';
import { TT133_KNOWLEDGE } from '../modules/ai/knowledge/tt133';
import { XCASH_FEATURES_KNOWLEDGE } from '../modules/ai/knowledge/xcash-features';

const ALL_SECTIONS = [
  ...CASSO_KNOWLEDGE,
  ...TT133_KNOWLEDGE,
  ...XCASH_FEATURES_KNOWLEDGE,
  ...BILLING_SETTINGS_KNOWLEDGE,
];

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status === 429 || status === 402 || (status >= 500 && status <= 503)) {
      return true;
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('insufficient_quota') ||
      msg.includes('econnreset') ||
      msg.includes('etimedout')
    ) {
      return true;
    }
  }
  return false;
}

async function createEmbeddingWithFallback(
  openai: OpenAI,
  jinaClient: OpenAI | null,
  model: string,
  jinaModel: string,
  input: string,
): Promise<number[] | null> {
  // Try OpenAI first
  try {
    const res = await openai.embeddings.create({ model, input });
    return res.data[0]?.embedding ?? null;
  } catch (err) {
    if (isRetryableError(err) && jinaClient) {
      console.log(
        `    ⚠️  OpenAI failed (${err instanceof Error ? err.message : String(err)}), falling back to Jina...`,
      );
    } else {
      throw err;
    }
  }

  // Fallback: Jina
  if (jinaClient) {
    const res = await jinaClient.embeddings.create({
      model: jinaModel,
      input,
    });
    return res.data[0]?.embedding ?? null;
  }

  return null;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY chưa cấu hình trong .env');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

  // Jina fallback
  const jinaKey = process.env.JINA_API_KEY ?? '';
  const jinaModel = process.env.JINA_EMBEDDING_MODEL ?? 'jina-embeddings-v3';
  const jinaClient = jinaKey
    ? new OpenAI({ apiKey: jinaKey, baseURL: 'https://api.jina.ai/v1' })
    : null;

  if (jinaClient) {
    console.log('🔄 Jina embedding fallback enabled\n');
  }

  console.log(`📚 Tổng ${ALL_SECTIONS.length} sections cần kiểm tra...\n`);

  let embedded = 0;
  let skipped = 0;

  for (const section of ALL_SECTIONS) {
    const contentHash = sha256(`${section.title}\n${section.content}`);

    const existing = await prisma.knowledgeEmbedding.findUnique({
      where: { sectionId: section.id },
      select: { contentHash: true },
    });

    if (existing?.contentHash === contentHash) {
      console.log(`  ⏭  ${section.id} — không đổi, bỏ qua`);
      skipped++;
      continue;
    }

    console.log(`  ⚡ ${section.id} — embedding...`);
    const input = `${section.title}\n\n${section.content}`;
    const vector = await createEmbeddingWithFallback(openai, jinaClient, model, jinaModel, input);

    if (!vector) {
      console.warn(`  ⚠️  ${section.id} — không có embedding, bỏ qua`);
      continue;
    }

    // Upsert với raw SQL vì Prisma chưa hỗ trợ vector type native
    await prisma.$executeRaw`
      INSERT INTO knowledge_embeddings (id, section_id, title, content, content_hash, embedding, updated_at)
      VALUES (
        gen_random_uuid(),
        ${section.id},
        ${section.title},
        ${section.content},
        ${contentHash},
        ${`[${vector.join(',')}]`}::vector,
        NOW()
      )
      ON CONFLICT (section_id) DO UPDATE SET
        title        = EXCLUDED.title,
        content      = EXCLUDED.content,
        content_hash = EXCLUDED.content_hash,
        embedding    = EXCLUDED.embedding,
        updated_at   = NOW()
    `;

    console.log(`  ✅ ${section.id} — done`);
    embedded++;
  }

  await prisma.$disconnect();

  console.log(`\n✨ Xong: ${embedded} embedded, ${skipped} bỏ qua (không đổi)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
