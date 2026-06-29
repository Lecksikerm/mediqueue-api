import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      ...(redisPassword ? { password: redisPassword } : {}),
      ...(isProduction ? { tls: {} } : {}),
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getQueueKey(doctorId: string): Promise<string> {
    return `queue:doctor:${doctorId}`;
  }

  async addToQueue(doctorId: string, patientId: string): Promise<number> {
    const key = await this.getQueueKey(doctorId);
    return this.client.rpush(key, patientId);
  }

  async removeFromQueue(doctorId: string, patientId: string): Promise<void> {
    const key = await this.getQueueKey(doctorId);
    await this.client.lrem(key, 0, patientId);
  }

  async getQueueList(doctorId: string): Promise<string[]> {
    const key = await this.getQueueKey(doctorId);
    return this.client.lrange(key, 0, -1);
  }

  async getQueuePosition(doctorId: string, patientId: string): Promise<number> {
    const queue = await this.getQueueList(doctorId);
    const index = queue.indexOf(patientId);
    return index === -1 ? -1 : index + 1;
  }

  async getQueueLength(doctorId: string): Promise<number> {
    const key = await this.getQueueKey(doctorId);
    return this.client.llen(key);
  }

  async clearQueue(doctorId: string): Promise<void> {
    const key = await this.getQueueKey(doctorId);
    await this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }
}
