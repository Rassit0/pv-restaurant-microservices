import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger = new Logger("Branch Service");

    async onModuleInit() {
        await this.$connect();
        this.logger.log("Persons Database connected");
    }
}
