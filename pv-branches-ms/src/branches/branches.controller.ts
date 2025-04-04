import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) { }

  @MessagePattern('createBranch')
  create(@Payload() createBranchDto: CreateBranchDto) {
    return this.branchesService.create(createBranchDto);
  }

  @MessagePattern('findAllBranches')
  findAll(@Payload() paginationDto: PaginationDto) {
    return this.branchesService.findAll(paginationDto);
  }

  @MessagePattern('findOneBranch')
  findOne(@Payload() term: string) {
    return this.branchesService.findOne(term);
  }

  @MessagePattern('updateBranch')
  update(@Payload() updateBranchDto: UpdateBranchDto) {
    return this.branchesService.update(updateBranchDto.id, updateBranchDto);
  }

  @MessagePattern('removeBranch')
  remove(@Payload() id: string) {
    return this.branchesService.remove(id);
  }

  @MessagePattern('branches.validateIds')
  validateBranchesIds(@Payload() ids: string[]) {
    return this.branchesService.validateBranchesIds(ids);
  }

  @MessagePattern('get_branches_by_ids')
  getBranchesByIds(@Payload() ids: string[]) {
    return this.branchesService.getBranchesByIds(ids);
  }
}
