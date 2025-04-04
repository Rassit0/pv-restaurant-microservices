import { BadRequestException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { slugify } from 'src/common/helpers/slugify';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) { }

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const { parentsHierarchy, ...dataCategory } = createCategoryDto;
      // Crea un nuevo registro en la base de datos con Prisma ORM
      const newRecord = await this.prisma.category.create({
        data: {
          ...dataCategory,
          slug: slugify(dataCategory.name), // Genera un slug basado en el nombre
          parents: { // como hijo se conectara con un padre
            create: parentsHierarchy?.map(parent => ({
              parent: {
                connect: { id: parent.parentId } // Conecta con los padres
              }
            }))
          }
        },
        include: {
          parents: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          subcategories: true
        }
      });

      return {
        message: "Categoría creada con éxito",
        category: newRecord // Devuelve el nuevo registro creado
      }
    } catch (error) {
      console.log(error)
      throw new Error('Error al crear la categoría')
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      // Obtiene todos los registros
      const records = await this.prisma.category.findMany({
        include: {
          parents: {
            select: {
              parent: { select: { id: true, name: true } }
            }
          },
          subcategories: {
            select: {
              category: { select: { id: true, name: true } }
            }
          },
          products: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      return {
        categories: records // Devuelve los registros encontrados
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error)
    }
  }

  async findOne(term: string) {
    // Busca un registro en la BD
    const record = await this.prisma.category.findFirst({
      where: {
        OR: [
          { id: term }, // Busca por id
          { slug: term } // Busca por slug
        ]
      },
      include: {
        parents: {
          select: {
            parent: { select: { id: true, name: true } }
          }
        },
        subcategories: {
          select: {
            category: { select: { id: true, name: true } }
          }
        },
      }
    });

    // Si no se encuentra ningún registro, lanza una excepción de tipo NotFoundException
    if (!record) {
      throw new NotFoundException("No se encontró la categoría");
    }

    // Devuelve el registro encontrado
    return record
  }

  async update(updateCategoryDto: UpdateCategoryDto) {
    const { id, ...updateDto } = updateCategoryDto;

    // Controlar que los ids padre no sean igual al id de la categoria actual
    const parentIds = updateCategoryDto.parentsHierarchy?.map(parent => parent.parentId);
    if (parentIds && parentIds.includes(id)) {
      throw new RpcException({
        message: `El ID de la categoría no puede ser igual a alguno de los parentId(Id categoría padre).`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Verifica si el registro existe en la base de datos utilizando el ID proporcionado.
    const recordExists = await this.prisma.category.findUnique({
      where: { id } // Filtra por el campo 'id'.
    });

    // Si no existe el registro, lanza una excepción indicando que no se encontró.
    if (!recordExists) {
      throw new RpcException({
        message: "No se encontró  la categoría",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const { parentsHierarchy, ...dataCategory } = updateDto;

    // Prepara los datos que se actualizarán. Si el campo 'name' está presente,
    // genera un 'slug' utilizando la función slugify y lo agrega al objeto.
    const updateData = {
      ...dataCategory, // Propaga todas las propiedades de updateDto.
      ...(dataCategory.name && { slug: slugify(dataCategory.name) }), // Agrega 'slug' solo si 'name' tiene un valor.
    };

    // Realiza la actualización del registro en la base de datos utilizando Prisma.
    const updatedRecord = await this.prisma.category.update({
      where: { id }, // Filtra por el ID del registro.
      data: {
        ...updateData,
        parents: {
          deleteMany: {},
          create: parentsHierarchy?.map(parent => ({
            parent: {
              connect: {
                id: parent.parentId
              }
            }
          }))
        }
      }, // Pasa los datos preparados para la actualización.
      include: {
        parents: {
          include: {
            parent: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        subcategories: true
      }
    });

    // Devuelve un objeto con un mensaje de éxito y el registro actualizado.
    return {
      message: "Categoría actualizada", // Mensaje informativo.
      category: updatedRecord // Información del registro actualizado.
    };
  }

  async remove(id: string) {
    // Verifica si el registro existe en la base de datos utilizando el ID proporcionado.
    const recordExists = await this.prisma.category.findUnique({
      where: { id }, // Filtra por el campo 'id'.
      include: {
        parents: { include: { parent: { select: { id: true, name: true } } } },
        subcategories: { include: { category: { select: { id: true, name: true } } } },
        products: true
      }
    });

    // Si no existe el registro, lanza una excepción indicando que no se encontró.
    if (!recordExists) {
      throw new RpcException({
        message: "No se encontró  la categoría",
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    // Verifica si tiene subcategorías asociadas.
    if (recordExists.subcategories && recordExists.subcategories.length > 0) {
      throw new RpcException({
        message: "No se puede eliminar la categoría porque tiene subcategorías asociadas.",
        statusCode: HttpStatus.BAD_REQUEST
      }
      );
    }

    // Verifica si el producto tiene relaciones que lo bloquean para ser eliminado
    if (
      recordExists.products.length > 0
    ) {
      throw new RpcException({
        message: "No se puede eliminar la categoría porque está relacionada con otras entidades",
        statusCode: HttpStatus.CONFLICT, // Envia el código 409 (conflicto)
      });
    }

    try {
      // Crear una transaccion por si ocurre un error haga un rollback automatico en la base de datos
      await this.prisma.$transaction(async (prisma) => {
        // las relaciones de la tabla intermedia (padres y subcategorias)
        // Elimina las relaciones de la tabla intermedia (padres y subcategorías)
        await this.prisma.categoryHierarchy.deleteMany({
          where: {
            OR: [
              { parentId: id },
              { categoryId: id }
            ]
          }
        });

        // Elimina el registro encontrado en la BD usando el ID
        return this.prisma.category.delete({
          where: { id }
        });
      })

      // Retorna un mensaje de exito junto con el registro eliminado
      return {
        message: "Categoría eliminada con éxito",
        category: recordExists
      }
    } catch (error) {
      console.log(error)
      throw new RpcException({
        message: "Ocurrió un error al eliminar la categoría.",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }
}
