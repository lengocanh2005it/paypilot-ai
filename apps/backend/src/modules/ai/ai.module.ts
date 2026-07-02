import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WEBHOOK_QUEUE } from '../../queue/queue.module';
import { EmbeddingService } from './embedding.service';
import { MatchingProcessor } from './matching.processor';
import { MatchingService } from './matching.service';
import { OpenAiService } from './openai.service';

@Module({
  imports: [BullModule.registerQueue({ name: WEBHOOK_QUEUE })],
  providers: [OpenAiService, EmbeddingService, MatchingService, MatchingProcessor],
  exports: [OpenAiService, EmbeddingService, MatchingService],
})
export class AiModule {}
