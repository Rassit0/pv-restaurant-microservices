import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, Query, UseGuards } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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
@ModuleGuard('PRODUCTS')
@Controller('categories')
export class CategoriesController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }


  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['WRITE'])
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.client.send('createCategory', createCategoryDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  
  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['READ'])
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.client.send("findAllCategories", paginationDto)
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
    return this.client.send("findOneCategory", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  
  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['EDIT'])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.client.send("updateCategory", { id, ...updateCategoryDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  
  @UseGuards(ModulePermissionAccessGuard)
  @ModulePermissionsGuard(['DELETE'])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send("removeCategory", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}
