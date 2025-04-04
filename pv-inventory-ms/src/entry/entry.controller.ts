import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EntryService } from './entry.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

@Controller()
export class EntryController {
  constructor(private readonly entryService: EntryService) {}

  @MessagePattern('inventory.createEntry')
  create(@Payload() createEntryDto: CreateEntryDto) {
    return this.entryService.create(createEntryDto);
  }

  @MessagePattern('inventory.findAllEntry')
  findAll() {
    return this.entryService.findAll();
  }

  @MessagePattern('inventory.findOneEntry')
  findOne(@Payload() id: number) {
    return this.entryService.findOne(id);
  }

  @MessagePattern('inventory.updateEntry')
  update(@Payload() updateEntryDto: UpdateEntryDto) {
    return this.entryService.update(updateEntryDto.id, updateEntryDto);
  }

  @MessagePattern('inventory.removeEntry')
  remove(@Payload() id: number) {
    return this.entryService.remove(id);
  }
}
