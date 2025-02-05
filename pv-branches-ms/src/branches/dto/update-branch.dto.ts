import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchDto } from './create-branch.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @IsUUID()
  @IsNotEmpty({ message: 'El ID es obligatorio' })
  id: string;
}
