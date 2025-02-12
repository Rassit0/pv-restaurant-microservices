import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehousePaginationDto } from './dto/warehouse-pagination';

@Controller()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @MessagePattern('createWarehouse')
  create(@Payload() createWarehouseDto: CreateWarehouseDto) {
    return this.warehousesService.create(createWarehouseDto);
  }

  @MessagePattern('findAllWarehouses')
  findAll(@Payload() pagination: WarehousePaginationDto) {
    return this.warehousesService.findAll(pagination);
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

  @MessagePattern('get_warehouses_by_branch_id')
  getWarehousesByBranchId(@Payload() branchId: string) {
    return this.warehousesService.getWarehousesByBranchId(branchId);
  }
}
