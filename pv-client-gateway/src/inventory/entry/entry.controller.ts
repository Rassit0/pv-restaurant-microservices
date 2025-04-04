import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query } from '@nestjs/common';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { catchError } from 'rxjs';

@Controller('inventory/entry')
export class EntryController {
  constructor(
      @Inject(NATS_SERVICE) private readonly client: ClientProxy
    ) { }

  @Post()
  create(@Body() createEntryDto: any) {
    return this.client.send('inventory.createEntry', createEntryDto)
          .pipe(
            catchError(error => {
              throw new RpcException(error);
            })
          );
  }

  @Get()
  findAll(@Query() paginationDto: any) {
    return this.client.send("inventory.findAllEntry", paginationDto)
          .pipe(
            catchError(error => {
              console.log(error)
              throw new RpcException(error)
            })
          )
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send("findOneBranch", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEntryDto: any) {
    return this.client.send("updateBranch", { id, ...updateEntryDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send("removeBranch", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
