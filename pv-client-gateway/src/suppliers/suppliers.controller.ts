import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseGuards } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { ModulePermissionAccessGuard } from 'src/auth-ms/auth/guards/auth.module.permission.guard';
import { ModulePermissionsGuard } from 'src/auth-ms/auth/decorators/module.permission';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('SUPPLIERS')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  @Post()
  create(@Body() createSupplierDto: any) {
    return this.natsClient.send('createSupplier', createSupplierDto)
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get()
  findAll() {
    return this.natsClient.send("findAllSuppliers", {})
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get(':id')
  findOne(@Param('id') term: string) {
    return this.natsClient.send("findOneSupplier", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierDto: any) {
    return this.natsClient.send("updateSupplier", { id, ...updateSupplierDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.natsClient.send("removeSupplier", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

  @UseGuards(ModuleAccessGuard, ModulePermissionAccessGuard)
  @ModuleGuard('SUPPLIERS_CONTACTS')
  @ModulePermissionsGuard(['DELETE'])
  @Delete('remove-contact/:id')
  removeContact(@Param('id') id: number) {
    return this.natsClient.send("removeContactSupplier", +id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }
}
