import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @MessagePattern('createUnit')
  create(@Payload() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @MessagePattern('findAllUnits')
  findAll() {
    return this.unitsService.findAll();
  }

  @MessagePattern('findOneUnit')
  findOne(@Payload() id: string) {
    return this.unitsService.findOne(id);
  }

  @MessagePattern('updateUnit')
  update(@Payload() updateUnitDto: UpdateUnitDto) {
    return this.unitsService.update(updateUnitDto);
  }

  @MessagePattern('removeUnit')
  remove(@Payload() id: string) {
    return this.unitsService.remove(id);
  }
}
