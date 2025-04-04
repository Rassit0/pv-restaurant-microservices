import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { NATS_SERVICE } from 'src/config';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('NOTIFICATIONS')
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy // Ayuda a enviar mensajes
  ) { }

  @Get('get-low-stock-products')
  getLowStockProducts() {
    return this.client.send("get_low_stock_products", {})
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      )
  }
}
