import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {

    private readonly logger = new Logger("Warehouses Service");

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Warehouses Database conncected');
    }
}
