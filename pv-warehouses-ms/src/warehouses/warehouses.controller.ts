import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Controller()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @MessagePattern('createWarehouse')
  create(@Payload() createWarehouseDto: CreateWarehouseDto) {
    return this.warehousesService.create(createWarehouseDto);
  }

  @MessagePattern('findAllWarehouses')
  findAll() {
    return this.warehousesService.findAll();
  }

  @MessagePattern('findOneWarehouse')
  findOne(@Payload() id: string) {
    return this.warehousesService.findOne(id);
  }

  @MessagePattern('updateWarehouse')
  update(@Payload() updateWarehouseDto: UpdateWarehouseDto) {
    return this.warehousesService.update(updateWarehouseDto.id, updateWarehouseDto);
  }

  @MessagePattern('removeWarehouse')
  remove(@Payload() id: string) {
    return this.warehousesService.remove(id);
  }
}
