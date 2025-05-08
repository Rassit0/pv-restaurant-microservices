import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseGuards, Req } from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { ModulePermissionAccessGuard } from 'src/auth-ms/auth/guards/auth.module.permission.guard';
import { ModulePermissionsGuard } from 'src/auth-ms/auth/decorators/module.permission';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('PERSONS')
@Controller('persons')
export class PersonsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  @Post()
  create(@Body() createPersonDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.natsClient.send('createPerson', { ...createPersonDto, createdByUserId: userId })
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
    return this.natsClient.send("findAllPersons", paginationDto)
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
    return this.natsClient.send("findOnePerson", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePersonDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.natsClient.send("updatePerson", { id, ...updatePersonDto, updatedByUserId: userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.natsClient.send("removePerson", { id, deletedByUserId: userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  softRemove(@Param('id') id: string, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.natsClient.send("softRemovePerson", { id, deletedByUserId: userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }
}
