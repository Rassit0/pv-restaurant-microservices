import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) { }
  async create(createUnitDto: CreateUnitDto) {
    // Verifica si ya existe una unidad con el mismo name o abbreviation
    const existingUnit = await this.prisma.unit.findFirst({
      where: {
        OR: [
          { name: createUnitDto.name },
          { abbreviation: createUnitDto.abbreviation }
        ]
      }
    });

    // Si ya existe, lanza un RpcException
    if (existingUnit) {
      throw new RpcException({
        message: 'El nombre o la abreviatura de la unidad ya están en uso',
        statusCode: HttpStatus.BAD_REQUEST, // Código 400
      });
    }
    // Crea un nuevo registro en la base de datos con Prisma ORM
    const newRecord = await this.prisma.unit.create({
      data: {
        ...createUnitDto
      },
      include: {
        products: true
      }
    });

    return {
      message: "Unidad de manejo registrada con éxito",
      unit: newRecord
    }
  }

  async findAll() {
    // Obtener todos los registros
    const records = await this.prisma.unit.findMany({
      orderBy: {
        name: 'asc'
      },
      include: { products: true }
    })
    return { units: records };
  }

  async findOne(id: string) {
    // Busca un registro con el id en la BD
    const record = await this.prisma.unit.findUnique({
      where: { id },
      include: { products: true }
    });

    // Si no se encuentra ningún registro, lanza una excepción de tipo NotDoundException
    if (!record) {
      throw new NotFoundException("No se encontró la unidad de manejo")
    }

    // Devuelve el registro encontrado
    return record;
  }

  async update(updateDto: UpdateUnitDto) {
    const { id, ...updateUnitDto } = updateDto
    // Verifica si el registro existe en la vase de datos utilizando el ID proporcionado
    const recordExists = await this.prisma.unit.findUnique({
      where: { id } // Filtra por el campo 'id'
    });

    // Si no existe el registro, lanza una excepción indicando que no se encontró
    if (!recordExists) {
      throw new NotFoundException("No se encontró la categoría");
    }
    // Validar que no exista otra unidad con el mismo nombre o abreviación
    if (updateUnitDto.name || updateUnitDto.abbreviation) {
      const duplicateUnit = await this.prisma.unit.findFirst({
        where: {
          OR: [
            { name: updateUnitDto.name },
            { abbreviation: updateUnitDto.abbreviation }
          ],
          id: { not: id }, // Excluir el registro actual de la búsqueda
        },
      });

      if (duplicateUnit) {
        throw new RpcException({
          message: "El nombre o la abreviación de la unidad de manejo ya está en uso",
          statusCode: HttpStatus.BAD_REQUEST, // Envía el código 400
        });
      }
    }

    // Actualiza el registro en la base de datos con Prisma ORM
    const updatedRecord = await this.prisma.unit.update({
      where: { id },
      data: updateUnitDto,
      include: { products: true }
    });

    // Devuelve un mensaje de éxito con el registro actualizado
    return {
      message: "Unidad de manejo actualizada",
      unit: updatedRecord
    }
  }

  async remove(id: string) {
    // Verifica si el registro existe en la base de datos utilizando el ID proporcionado
    const recordExists = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        products: true
      }
    });

    // si no existe el registro, lanza una excepción indicando que no se encontró.
    if (!recordExists) {
      throw new NotFoundException("No se en contró la unidad de manejo");
    }

    if (
      recordExists.products.length > 0 //|| // Tiene relacion con productos
    ) {
      throw new RpcException({
        message: "No se puede eliminar el producto porque está relacionado con otras entidades",
        statusCode: HttpStatus.CONFLICT, // Envia el código 409 (conflicto)
      });
    }

    // Elimina el registro encontrado en la BD usan el ID
    await this.prisma.unit.delete({
      where: { id }
    });

    // Retorna un mensaje de éxito junto con el registro eliminado
    return {
      message: "Unidad de manejo eliminada con éxito",
      unit: recordExists
    }
  }
}
