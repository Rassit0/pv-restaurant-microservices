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
@Controller('inventory/movements')
export class MovementsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  @Post()
  create(@Body() createMovementDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send('inventory.createMovement', { ...createMovementDto, createdByUserId: userId })
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
    return this.client.send("inventory.findAllMovement", paginationDto)
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
    return this.client.send("inventory.findOneMovement", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateMovementDto: any) {
  //   return this.client.send("inventory.updateMovement", { id, ...updateMovementDto })
  //     .pipe(
  //       catchError(error => {
  //         throw new RpcException(error);
  //       })
  //     )
  // }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch('updateDetailsAndStatus/:id')
  changeStatus(@Param('id') id: string, @Body() updateDetailsAndStatusDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send("inventory.updateDetailsAndStatusMovement", { id, ...updateDetailsAndStatusDto, updatedByUserId: userId })
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
    return this.client.send("inventory.removeMovement", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  removeDetailSupplier(@Param('id') id: string) {
    return this.client.send("inventory.removeDetailSupplier", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
