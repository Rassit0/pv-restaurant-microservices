import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {

    private readonly logger = new Logger("Products Service");

    async onModuleInit() {
        await this.$connect();
        this.logger.log("Products Database connected")
    }
}
