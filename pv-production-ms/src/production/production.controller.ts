import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductionService } from './production.service';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { ProductionPaginationDto } from './dto/production-pagination';

@Controller()
export class ProductionController {
  constructor(private readonly productionService: ProductionService) { }

  @MessagePattern('createProduction')
  create(@Payload() createProductionDto: CreateProductionDto) {
    return this.productionService.create(createProductionDto);
  }

  @MessagePattern('findAllProduction')
  findAll(@Payload() pagination: ProductionPaginationDto) {
    return this.productionService.findAll(pagination);
  }

  @MessagePattern('findOneProduction')
  findOne(@Payload() id: string) {
    return this.productionService.findOne(id);
  }

  @MessagePattern('updateProduction')
  update(@Payload() updateProductionDto: UpdateProductionDto) {
    return this.productionService.update(updateProductionDto.id, updateProductionDto);
  }

  @MessagePattern('removeProduction')
  remove(@Payload() { id, userId }: { id: string, userId: string }) {
    return this.productionService.remove(id, userId);
  }

  @MessagePattern('findAllParallelGroups')
  findAllParallelGroups() {
    return this.productionService.findAllParallelGroups();
  }
}
