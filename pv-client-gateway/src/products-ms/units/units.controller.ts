import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';

@Controller('units')
export class UnitsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  @Post()
  create(@Body() createUnitDto: CreateUnitDto) {
    return this.client.send('createUnit', createUnitDto)
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error);
        })
      );
  }

  @Get()
  findAll() {
    return this.client.send('findAllUnits', {})
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      )
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send('findOneUnit', id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnitDto: UpdateUnitDto) {
    return this.client.send('updateUnit', {id, ...updateUnitDto})
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send('removeUnit', id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
