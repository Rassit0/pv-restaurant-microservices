import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PersonPaginationDto } from './dto/person-pagination.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { DeletePersonDto } from './dto/delete-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto copy';

@Injectable()
export class PersonsService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async create(createPersonDto: CreatePersonDto) {
    try {
      // Verificar si ya existe el nombre
      const branchByName = await this.prisma.person.findUnique({
        where: { nit: createPersonDto.nit }
      });
      if (branchByName) {
        throw new RpcException({
          message: 'El NIT/CI ya está en uso.',
          statusCode: HttpStatus.CONFLICT
        });
      }

      // Crear la sucursal si las validaciones pasaron
      const person = await this.prisma.person.create({
        data: {
          ...createPersonDto,
          updatedByUserId: createPersonDto.createdByUserId,
        },
      })

      return {
        message: "Persona creada con éxito",
        person
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear la persona',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

  async findAll(paginationDto: PersonPaginationDto) {
    try {
      const { limit, page, search, orderBy, columnOrderBy, personIds, status } = paginationDto;
      // Calcular el offset para la paginación
      const skip = limit ? (page - 1) * limit : undefined;
      const persons = await this.prisma.person.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        where: {
          ...(personIds && personIds.length > 0 ? { id: { in: personIds } } : {}),
          OR: search
            ? [
              // Coincidencia para el nombre
              { name: { contains: search, mode: 'insensitive' } },
              // Coincidencia para el primer apellido
              { lastname: { contains: search, mode: 'insensitive' } },
              // Coincidencia para el segundo apellido
              { secondLastname: { contains: search, mode: 'insensitive' } },
              // Coincidencia para el NIT
              { nit: { contains: search, mode: 'insensitive' } },
              // Ahora manejamos la búsqueda separada por cada palabra
              // Manejo de búsqueda separada por espacio o `+`
              {
                AND: search.split(/[\s+]+/).map(word => ({
                  OR: [
                    { name: { contains: word, mode: 'insensitive' } },
                    { lastname: { contains: word, mode: 'insensitive' } },
                    { secondLastname: { contains: word, mode: 'insensitive' } },
                  ]
                }))
              }
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isActive: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        },
        orderBy: {
          [columnOrderBy]: orderBy
        },
      });

      const totalItems = await this.prisma.person.count({
        where: {
          ...(personIds && personIds.length > 0 ? { id: { in: personIds } } : {}),
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
              { lastname: { contains: search, mode: 'insensitive' } },
              { secondLastname: { contains: search, mode: 'insensitive' } },
            ]
            : undefined,
        },
      });
      // Obtener almacenes para cada sucursal
      // const personsWithWarehouses = await Promise.all(
      //   persons.map(async (branch) => {
      //     const warehouses = await firstValueFrom(this.natsClient.send('get_warehouses_by_branch_id', branch.id));
      //     // Enviar solicitud al servicio de sucursales para validar los branchIds
      //     const manager = await firstValueFrom(
      //       this.natsClient.send('auth.user.findOne', branch.managerId).pipe(
      //         catchError((error) => {
      //           // console.error('Error fetching findOne:', error);
      //           return of(null);
      //         })
      //       )
      //     );
      //     return { ...branch, manager, warehouses };
      //   })
      // );

      return {
        persons,
        meta: {
          totalItems, // Total de productos encontrados
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      };
    } catch (error) {
      console.log('Error al obtener la lista de personas:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de personas.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findOne(id: string) {
    try {
      const person = await this.prisma.person.findFirst({
        where: {
          id,
        },
      });

      if (!person) {
        throw new RpcException({
          message: 'Persona no encontrada.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      // const branchIds = [
      //   ...new Set(warehouse.branches.map(b => b.branchId)),
      // ];

      // // Enviar la solicitud al ms de branches para obtener los branches por los ids
      // const branches = await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds));

      return person;

      // return {
      //   ...warehouse,
      //   branches: warehouse.branches.map(branch => ({
      //     ...branch,
      //     details: branches.find(b => b.id === branch.branchId) || null, // Añadir datos completos de la sucursal
      //   }))
      // };
    } catch (error) {
      console.log('Error al obtener el persona', error);
      /// Si el error es una instancia de RpcException
      if (error instanceof RpcException) {
        // Solo volvemos a lanzar el RpcException capturado
        throw error;
      }
      throw new RpcException({
        message: 'Error al obtener el persona',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async update(id: string, updatePersonDto: UpdatePersonDto) {
    try {
      const { ...data } = updatePersonDto;

      const personExists = await this.prisma.person.findUnique({
        where: { id }
      });
      if (!personExists) {
        throw new RpcException({
          message: 'La persona no existe.',
          statusCode: HttpStatus.NOT_FOUND,
        })
      }


      if (data.name) {
        // Verificar si el nombre ya existe
        const existingNitPerson = await this.prisma.person.findFirst({
          where: {
            nit: data.nit,
            id: { not: id },
          },
        });

        if (existingNitPerson) {
          throw new RpcException({
            message: 'El NIT/CI de la persona ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      // if (branches) {
      //   // Verificar si hay duplicados en branches
      //   const branchIds = branches.map(item => item.branchId);

      //   const uniqueBranchIds = new Set(branchIds);

      //   if (branchIds.length !== uniqueBranchIds.size) {
      //     throw new RpcException({
      //       message: "No se pueden agregar duplicados de branchId en las sucursales",
      //       statusCode: HttpStatus.BAD_REQUEST,
      //     });
      //   }

      //   // Enviar solicitud al microservicio branches para valdiar los branchIds
      //   await firstValueFrom(
      //     this.natsClient.send('branches.validateIds', branchIds).pipe(
      //       catchError(error => {
      //         console.log('Error capturado al enciar mensaje:', error);

      //         //Si el error tiene message y statusCode, convertirlo a un RcpException
      //         if (error?.message && error?.statusCode) {
      //           throw new RpcException({
      //             message: error.message,
      //             statusCode: error.statusCode,
      //           });
      //         }

      //         // Si no tiene estás propiedades lanzar un RpcException generico
      //         throw new RpcException({
      //           message: 'Error desconocido al comunicarse con el servicio de sucursales.',
      //           statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      //         });
      //       })
      //     )
      //   );
      // }

      const udatedRecord = await this.prisma.person.update({
        where: { id },
        data: {
          ...data,
          // ...(branches && {
          //   branches: {
          //     deleteMany: {
          //       warehouseId: id,
          //     },
          //     create: branches.map(item => ({
          //       branchId: item.branchId,
          //     }))
          //   },
          // }),
        },
      })

      return {
        message: 'Persona actualizada con éxito.',
        warehouse: udatedRecord,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al actualizar la persona.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async remove(id: string) {
    // Verifica si el registro existe en la base de datos utilizando el ID proporcionado.
    const recordExists = await this.prisma.person.findUnique({
      where: { id }, // Filtra por el campo 'id'.
    });

    // Si no existe el registro, lanza una excepción indicando que no se encontró.
    if (!recordExists) {
      throw new RpcException({
        message: "No se encontró la persona",
        statusCode: HttpStatus.BAD_REQUEST // envia el codigo 400
      });
    }

    // Elimina el registro encontrado en la BD usando el ID
    await this.prisma.person.delete({
      where: { id }
    })

    // Retorna un mensaje de exito junto con el registro eliminado
    return {
      message: "Persona eliminada con éxito",
      product: recordExists
    }
  }

  // remover logicamente
  async softRemove(deletePersonDto: DeletePersonDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: deletePersonDto.id },
    });

    if (!person) {
      throw new RpcException({
        message: "No se encontró la persona",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    const updatedPerson = await this.prisma.person.update({
      where: { id: deletePersonDto.id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return {
      message: "Persona eliminada lógicamente con éxito",
      person: updatedPerson,
    };
  }

  // restaurar persona eliminada logicamente
  async restorePerson(restorePersonDto: DeletePersonDto) {
    const person = await this.prisma.person.findUnique({
      where: { id: restorePersonDto.id },
    });

    if (!person) {
      throw new RpcException({
        message: "No se encontró la persona",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    if (person.isActive) {
      return {
        message: "La persona ya está activa",
        person,
      };
    }

    const updatedPerson = await this.prisma.person.update({
      where: { id: restorePersonDto.id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    return {
      message: "Persona restaurada con éxito",
      person: updatedPerson,
    };
  }

  async validatePersonsIds(ids: string[]) {
    // Eliminar duplicados
    ids = Array.from(new Set(ids));

    // Validar sucursales existentes
    const items = await this.prisma.person.findMany({
      where: {
        id: {
          in: ids
        },
      },
    });

    // Verificar que se encontraron todas
    if (items.length !== ids.length) {
      const foundIds = items.map(item => item.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));

      throw new RpcException({
        message: `No se encontraron las siguientes personas: ${missingIds.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
      })
    }

    return items;
  }

}
