import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { ChangeStatusDto } from './dto/change-status-transaction.dto';
import { TransactionsPaginationDto } from './dto/transactions-pagination';

@Controller()
export class TransactionController {
  constructor(private readonly inventoryService: TransactionService) { }

  @MessagePattern('inventory.createTransaction')
  create(@Payload() createInventoryDto: CreateInventoryTransactionDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @MessagePattern('inventory.findAllTransaction')
  findAll(@Payload() paginationDto: TransactionsPaginationDto) {
    return this.inventoryService.findAll(paginationDto);
  }

  @MessagePattern('inventory.findOneTransaction')
  findOne(@Payload() id: string) {
    return this.inventoryService.findOne(id);
  }

  // @MessagePattern('inventory.updateTransaction')
  // update(@Payload() updateInventoryDto: UpdateInventoryTransactionDto) {
  //   return this.inventoryService.update(updateInventoryDto.id, updateInventoryDto);
  // }

  @MessagePattern('inventory.changeStatusTransaction')
  changeStatus(@Payload() changeStatusDto: ChangeStatusDto) {
    return this.inventoryService.changeStatus(changeStatusDto.id, changeStatusDto.status, changeStatusDto.updatedByUserId);
  }

  @MessagePattern('inventory.removeTransaction')
  remove(@Payload() id: string) {
    return this.inventoryService.remove(id);
  }
}
