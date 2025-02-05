import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger("Auth Service")

    async onModuleInit() {
        await this.$connect();
        this.logger.log("Auth Database connected")
    }
}
