import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';

@Controller('branches')
export class BranchesController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  @Post()
  create(@Body() createCategoryDto: CreateBranchDto) {
    return this.client.send('createBranch', createCategoryDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Get()
  findAll() {
    return this.client.send("findAllBranches", {})
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error)
        })
      )
  }

  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.client.send("findOneBranch", term)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateBranchDto) {
    return this.client.send("updateBranch", { id, ...updateCategoryDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      )
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.client.send("removeBranch", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }
}

