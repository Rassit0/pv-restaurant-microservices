import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseGuards, Req } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { catchError } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { ModulePermissionsGuard } from 'src/auth-ms/auth/decorators/module.permission';
import { ModulePermissionAccessGuard } from 'src/auth-ms/auth/guards/auth.module.permission.guard';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('PRODUCTS')
@Controller('products')
export class ProductsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy // Ayuda a enviar mensajes
  ) { }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  @Post()
  create(@Body() createProductDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send("createProduct", { ...createProductDto, userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get()
  findAll(@Query() paginationDto: any) {
    return this.client.send("findAllProducts", paginationDto)
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.client.send("findOneProduct", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send("updateProduct", { id, ...updateProductDto, userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send("removeProduct", { id, userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get('/getSupplierIdsByProduct/:term')
  getSupplierIdsByProduct(@Param('term') term: string) {
    return this.client.send("products.getSupplierIdsByProduct", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
