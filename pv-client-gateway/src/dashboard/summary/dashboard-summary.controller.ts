import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { ModulePermissionsGuard } from 'src/auth-ms/auth/decorators/module.permission';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { ModulePermissionAccessGuard } from 'src/auth-ms/auth/guards/auth.module.permission.guard';
import { NATS_SERVICE } from 'src/config';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { catchError, firstValueFrom } from 'rxjs';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('HOME')
@Controller('dashboard/summary')
export class DashboardSummaryController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy // Ayuda a enviar mensajes
  ) { }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get('ordersCount')
  async getOrdersCount(@Query() dto: any) {
    return this.client.send("production.countProductionOrders", dto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get('countRecipes')
  async getCountRecipes(@Query() dto: any) {
    return this.client.send("production.countRecipes", dto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }
}
