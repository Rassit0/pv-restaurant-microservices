import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ExitService } from './exit.service';
import { CreateExitDto } from './dto/create-exit.dto';
import { UpdateExitDto } from './dto/update-exit.dto';

@Controller()
export class ExitController {
  constructor(private readonly exitService: ExitService) {}

  @MessagePattern('createExit')
  create(@Payload() createExitDto: CreateExitDto) {
    return this.exitService.create(createExitDto);
  }

  @MessagePattern('findAllExit')
  findAll() {
    return this.exitService.findAll();
  }

  @MessagePattern('findOneExit')
  findOne(@Payload() id: number) {
    return this.exitService.findOne(id);
  }

  @MessagePattern('updateExit')
  update(@Payload() updateExitDto: UpdateExitDto) {
    return this.exitService.update(updateExitDto.id, updateExitDto);
  }

  @MessagePattern('removeExit')
  remove(@Payload() id: number) {
    return this.exitService.remove(id);
  }
}
