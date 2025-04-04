import { PartialType } from '@nestjs/mapped-types';
import { CreateExitDto } from './create-exit.dto';

export class UpdateExitDto extends PartialType(CreateExitDto) {
  id: number;
}
