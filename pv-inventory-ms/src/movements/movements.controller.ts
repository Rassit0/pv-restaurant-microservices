import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MovementsService } from './movements.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { UpdateInventoryMovementDto } from './dto/update-inventory-movement.dto';
import { ChangeStatusDto } from './dto/change-status-movement.dto';
import { MovementsPaginationDto } from './dto/movements-pagination';

@Controller()
export class MovementsController {
  constructor(private readonly inventoryService: MovementsService) { }

  @MessagePattern('inventory.createMovement')
  create(@Payload() createInventoryDto: CreateInventoryMovementDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @MessagePattern('inventory.findAllMovement')
  findAll(@Payload() paginationDto: MovementsPaginationDto) {
    return this.inventoryService.findAll(paginationDto);
  }

  @MessagePattern('inventory.findOneMovement')
  findOne(@Payload() id: string) {
    return this.inventoryService.findOne(id);
  }

  // @MessagePattern('inventory.updateMovement')
  // update(@Payload() updateInventoryDto: UpdateInventoryMovementDto) {
  //   return this.inventoryService.update(updateInventoryDto.id, updateInventoryDto);
  // }

  @MessagePattern('inventory.changeStatusMovement')
  changeStatus(@Payload() changeStatusDto: ChangeStatusDto) {
    return this.inventoryService.changeStatus(changeStatusDto.id, changeStatusDto);
  }

  @MessagePattern('inventory.removeMovement')
  remove(@Payload() id: string) {
    return this.inventoryService.remove(id);
  }
}
