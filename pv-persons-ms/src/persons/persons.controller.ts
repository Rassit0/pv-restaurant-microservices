import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PersonPaginationDto } from './dto/person-pagination.dto';
import { DeletePersonDto } from './dto/delete-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto copy';

@Controller()
export class PersonsController {
  constructor(private readonly personsService: PersonsService) { }

  @MessagePattern('createPerson')
  create(@Payload() createPersonDto: CreatePersonDto) {
    return this.personsService.create(createPersonDto);
  }

  @MessagePattern('findAllPersons')
  findAll(@Payload() paginationDto: PersonPaginationDto) {
    return this.personsService.findAll(paginationDto);
  }

  @MessagePattern('findOnePerson')
  findOne(@Payload() id: string) {
    return this.personsService.findOne(id);
  }

  @MessagePattern('updatePerson')
  update(@Payload() updatePersonDto: UpdatePersonDto) {
    return this.personsService.update(updatePersonDto.id, updatePersonDto);
  }

  @MessagePattern('removePerson')
  remove(@Payload() id: string) {
    return this.personsService.remove(id);
  }

  @MessagePattern('softRemovePerson')
  softRemove(@Payload() deletePersonDto: DeletePersonDto) {
    return this.personsService.softRemove(deletePersonDto);
  }

  @MessagePattern('restorePerson')
  restorePerson(@Payload() restorePersonDto: DeletePersonDto) {
    return this.personsService.restorePerson(restorePersonDto);
  }
}
