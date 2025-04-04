import { Injectable } from '@nestjs/common';
import { CreateExitDto } from './dto/create-exit.dto';
import { UpdateExitDto } from './dto/update-exit.dto';

@Injectable()
export class ExitService {
  create(createExitDto: CreateExitDto) {
    return 'This action adds a new exit';
  }

  findAll() {
    return `This action returns all exit`;
  }

  findOne(id: number) {
    return `This action returns a #${id} exit`;
  }

  update(id: number, updateExitDto: UpdateExitDto) {
    return `This action updates a #${id} exit`;
  }

  remove(id: number) {
    return `This action removes a #${id} exit`;
  }
}
