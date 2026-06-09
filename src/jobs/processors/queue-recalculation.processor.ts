import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ConsultationQueue } from '../../queues/entities/consultation-queue.entity';
import { RedisService } from '../../common/redis/redis.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { QueueStatus } from '../../common/enums';

const AVG_CONSULTATION_MINUTES = 15;

@Processor('queue-recalculation')
export class QueueRecalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueRecalculationProcessor.name);

  constructor(
    @InjectRepository(ConsultationQueue)
    private readonly queueRepository: Repository<ConsultationQueue>,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
  ) {
    super();
  }

  async process(job: Job) {
    const { doctorId } = job.data;
    this.logger.log(`Recalculating queue for doctor ${doctorId}`);

    const waitingEntries = await this.queueRepository.find({
      where: { doctorId, status: QueueStatus.WAITING },
      order: { position: 'ASC' },
    });

    for (let i = 0; i < waitingEntries.length; i++) {
      const newPosition = i + 1;
      const estimatedWait = i === 0 ? 0 : i * AVG_CONSULTATION_MINUTES;

      await this.queueRepository.update(waitingEntries[i].id, {
        position: newPosition,
        estimatedWaitMinutes: estimatedWait,
      });
    }

    // Emit live update
    const liveQueue = await this.redisService.getQueueList(doctorId);
    this.websocketGateway.emitQueueUpdate(doctorId, {
      doctorId,
      queueLength: liveQueue.length,
      queue: liveQueue.map((patientId, index) => ({
        patientId,
        position: index + 1,
        estimatedWaitMinutes: index === 0 ? 0 : index * AVG_CONSULTATION_MINUTES,
        estimatedWaitFormatted:
          index === 0 ? 'Next up' : `~${index * AVG_CONSULTATION_MINUTES} mins`,
      })),
    });

    this.logger.log(`Queue recalculated for doctor ${doctorId} — ${waitingEntries.length} entries updated`);
  }
}
