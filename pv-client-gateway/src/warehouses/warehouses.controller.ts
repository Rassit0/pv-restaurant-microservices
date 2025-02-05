import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';

@Controller('warehouses')
export class WarehousesController {
  constructor(
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  @Post()
  create(@Body() createWarehouseDto: any) {
    return this.natsClient.send('createWarehouse', createWarehouseDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Get()
  findAll() {
    return this.natsClient.send("findAllWarehouses", {})
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      );
  }

  @Get(':id')
  findOne(@Param('id') term: string) {
    return this.natsClient.send("findOneWarehouse", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWarehouseDto: any) {
    return this.natsClient.send("updateWarehouse", { id, ...updateWarehouseDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.natsClient.send("removeWarehouse", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }
}
