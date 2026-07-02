import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI | null;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.embeddingModel = this.configService.get<string>(
      'OPENAI_EMBEDDING_MODEL',
      'text-embedding-3-small',
    );
    this.client = apiKey ? new OpenAI({ apiKey }) : null;

    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY chưa cấu hình — embedding sẽ bỏ qua, dùng rule-based only');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async createEmbedding(text: string): Promise<number[] | null> {
    if (!this.client || !text.trim()) {
      return null;
    }

    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text.trim(),
    });

    return response.data[0]?.embedding ?? null;
  }
}
