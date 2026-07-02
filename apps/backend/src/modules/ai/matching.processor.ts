import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WEBHOOK_QUEUE } from '../../queue/queue.module';
import { MatchingService } from './matching.service';

export const AI_MATCHING_JOB = 'ai-matching';

export interface AiMatchingJobData {
  transactionDbId: string;
}

@Processor(WEBHOOK_QUEUE)
export class MatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(private readonly matchingService: MatchingService) {
    super();
  }

  async process(job: Job<AiMatchingJobData>): Promise<void> {
    if (job.name !== AI_MATCHING_JOB) {
      return;
    }

    try {
      await this.matchingService.processTransaction(job.data.transactionDbId);
    } catch (error) {
      this.logger.error(
        `AI matching failed for transaction ${job.data.transactionDbId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
