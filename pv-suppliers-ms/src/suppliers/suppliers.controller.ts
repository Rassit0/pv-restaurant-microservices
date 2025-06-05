import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierPaginationDto } from './dto/supplier-pagination.dto';

@Controller()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @MessagePattern('createSupplier')
  create(@Payload() createSupplierDto: CreateSupplierDto) {
    return this.suppliersService.create(createSupplierDto);
  }

  @MessagePattern('findAllSuppliers')
  findAll(@Payload() paginationDto: SupplierPaginationDto) {
    return this.suppliersService.findAll(paginationDto);
  }

  @MessagePattern('findOneSupplier')
  findOne(@Payload() id: string) {
    return this.suppliersService.findOne(id);
  }

  @MessagePattern('updateSupplier')
  update(@Payload() updateSupplierDto: UpdateSupplierDto) {
    return this.suppliersService.update(updateSupplierDto.id, updateSupplierDto);
  }

  @MessagePattern('removeSupplier')
  remove(@Payload() id: string) {
    return this.suppliersService.remove(id);
  }

  @MessagePattern('removeContactSupplier')
  removeContact(@Payload() id: number) {
    return this.suppliersService.removeContact(id);
  }

  @MessagePattern('suppliers.validateIds')
  validateBranchesIds(@Payload() ids: string[]) {
    return this.suppliersService.validateSuppliersIds(ids);
  }
}
