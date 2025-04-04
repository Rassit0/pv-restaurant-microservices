import { SetMetadata } from '@nestjs/common';

export const ModulePermissionsGuard = (permissions: string[]) => SetMetadata('permissions', permissions);
