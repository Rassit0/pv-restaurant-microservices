import { SetMetadata } from '@nestjs/common';

export const ModuleGuard = (module: string) => SetMetadata('module', module);
