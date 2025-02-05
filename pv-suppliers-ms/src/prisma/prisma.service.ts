import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger('Suppliers Service');

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Suppliers Database connected');
    }
}
