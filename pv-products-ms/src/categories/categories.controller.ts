import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @MessagePattern('createCategory')
  create(@Payload() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @MessagePattern('findAllCategories')
  findAll(@Payload() paginationDto: PaginationDto) {
    return this.categoriesService.findAll(paginationDto);
  }

  @MessagePattern('findOneCategory')
  findOne(@Payload() term: string) {
    return this.categoriesService.findOne(term);
  }

  @MessagePattern('updateCategory')
  update(@Payload() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(updateCategoryDto);
  }

  @MessagePattern('removeCategory')
  remove(@Payload() id: string) {
    return this.categoriesService.remove(id);
  }
}
