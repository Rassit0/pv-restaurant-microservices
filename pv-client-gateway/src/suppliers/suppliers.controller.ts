import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';

@Controller('suppliers')
export class SuppliersController {
  constructor(
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

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

  @Get(':id')
  findOne(@Param('id') term: string) {
    return this.natsClient.send("findOneSupplier", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSupplierDto: any) {
    return this.natsClient.send("updateSupplier", { id, ...updateSupplierDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.natsClient.send("removeSupplier", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

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
