import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseGuards } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('auth/roles')
export class RolesController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  // @Post()
  // create(@Body() createRoleDto: CreateRoleDto) {
  //   return this.client.send('createRole', createRoleDto)
  //     .pipe(
  //       catchError(error => {
  //         throw new RpcException(error);
  //       })
  //     );
  // }

  @Get()
  findAll() {
    return this.client.send('findAllRoles', {})
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.client.send('findOneRole', id)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
  //   return this.client.send('updateRole', { id, ...updateRoleDto })
  //     .pipe(
  //       catchError(error => {
  //         throw new RpcException(error);
  //       })
  //     );
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.client.send('removeRole', id)
  //     .pipe(
  //       catchError(error => {
  //         throw new RpcException(error);
  //       })
  //     );
  // }
}
