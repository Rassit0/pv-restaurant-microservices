import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseGuards, Req } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { catchError } from 'rxjs';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { ModulePermissionsGuard } from 'src/auth-ms/auth/decorators/module.permission';
import { ModulePermissionAccessGuard } from 'src/auth-ms/auth/guards/auth.module.permission.guard';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('INVENTORY')
@Controller('inventory/transaction')
export class TransactionController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  @Post()
  create(@Body() createTransactionDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send('inventory.createTransaction', { ...createTransactionDto, createdByUserId: userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get()
  findAll(@Query() paginationDto: any) {
    return this.client.send("inventory.findAllTransaction", paginationDto)
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send("inventory.findOneTransaction", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateTransactionDto: any) {
  //   return this.client.send("inventory.updateTransaction", { id, ...updateTransactionDto })
  //     .pipe(
  //       catchError(error => {
  //         throw new RpcException(error);
  //       })
  //     )
  // }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch('changeStatus/:id')
  changeStatus(@Param('id') id: string, @Body() changeStatusDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send("inventory.changeStatusTransaction", { id, ...changeStatusDto, updatedByUserId: userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send("inventory.removeTransaction", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
