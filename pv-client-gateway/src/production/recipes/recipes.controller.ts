import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseGuards, Req } from '@nestjs/common';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AuthGuard } from 'src/auth-ms/auth/guards/auth.guard';
import { ModuleAccessGuard } from 'src/auth-ms/auth/guards/auth.module.access.guard';
import { ModuleGuard } from 'src/auth-ms/auth/decorators/module.access';
import { ModulePermissionAccessGuard } from 'src/auth-ms/auth/guards/auth.module.permission.guard';
import { ModulePermissionsGuard } from 'src/auth-ms/auth/decorators/module.permission';

@UseGuards(AuthGuard, ModuleAccessGuard)
@ModuleGuard('PRODUCTION')
@Controller('production/recipes')
export class RecipesController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy // Ayuda a enviar mensajes
  ) { }
  @Post()

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  create(@Body() createProductDto: any, @Req() req: Request) {
    const userId = req['user'].id; // Obtener el ID del usuario desde el guard
    return this.client.send("createRecipe", { ...createProductDto, updatedByUserId: userId, createdByUserId: userId })
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
    return this.client.send("findAllRecipes", paginationDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.client.send("findOneRecipe", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: any) {
    return this.client.send("updateRecipe", { id, ...updateProductDto })
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
    return this.client.send("removeRecipe", { id, deletedByUserId: userId })
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
