/**
 * Migration: Drop and recreate knowledge_embeddings.embedding column from vector(1536) to vector(1024).
 * This is needed because Jina embedding returns 1024 dims (Matryoshka truncation not supported via API).
 *
 * Chạy: pnpm --filter @xcash/backend migrate:embedding-dims
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('🔄 Dropping embedding column...');
  await prisma.$executeRawUnsafe('ALTER TABLE knowledge_embeddings DROP COLUMN embedding');

  console.log('🔄 Recreating embedding column as vector(1024)...');
  await prisma.$executeRawUnsafe(
    'ALTER TABLE knowledge_embeddings ADD COLUMN embedding vector(1024)',
  );

  console.log('🔄 Creating index...');
  await prisma.$executeRawUnsafe(
    'CREATE INDEX idx_knowledge_embeddings_embedding ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 5)',
  );

  console.log('🔄 Clearing contentHash to force re-seed...');
  await prisma.$executeRawUnsafe(
    "UPDATE knowledge_embeddings SET content_hash = '', embedding = NULL",
  );

  console.log('✅ Column altered to vector(1024). Run seed:knowledge to re-seed.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
