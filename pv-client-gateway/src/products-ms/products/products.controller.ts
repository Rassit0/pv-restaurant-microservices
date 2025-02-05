import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseGuards } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { catchError } from 'rxjs';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy // Ayuda a enviar mensajes
  ) { }

  // @UseGuards(AuthGuard)
  @Post()
  create(@Body() createProductDto: any) {
    return this.client.send("createProduct", createProductDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @Get()
  findAll(@Query() paginationDto: ProductPaginationDto) {
    return this.client.send("findAllProducts", paginationDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.client.send("findOneProduct", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any) {
    return this.client.send("updateProduct", { id, ...updateProductDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send("removeProduct", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
