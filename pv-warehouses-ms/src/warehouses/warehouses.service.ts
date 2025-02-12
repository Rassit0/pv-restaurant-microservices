import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { catchError, firstValueFrom } from 'rxjs';
import { error } from 'console';
import { PrismaService } from 'src/prisma/prisma.service';
import { slugify } from 'src/common/helpers/slugify';
import { WarehousePaginationDto } from './dto/warehouse-pagination';

@Injectable()
export class WarehousesService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async create(createWarehouseDto: CreateWarehouseDto) {
    try {
      const { branches, usersAccess, ...data } = createWarehouseDto;

      // Verificar si el nombre ya existe
      const existingWarehouse = await this.prisma.warehouse.findUnique({
        where: { name: data.name },
      });

      if (existingWarehouse) {
        throw new RpcException({
          message: 'El nombre del almacén ya está en uso.',
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      if (branches) {
        // Verificar si hay duplicados en branches
        const branchIds = branches.map(item => item.branchId);

        const uniqueBranchIds = new Set(branchIds);

        if (branchIds.length !== uniqueBranchIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados de branchId en las sucursales",
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        // Enviar solicitud al microservicio branches para valdiar los branchIds
        await firstValueFrom(
          this.natsClient.send('branches.validateIds', branchIds).pipe(
            catchError(error => {
              console.log('Error capturado al enciar mensaje:', error);

              //Si el error tiene message y statusCode, convertirlo a un RcpException
              if (error?.message && error?.statusCode) {
                throw new RpcException({
                  message: error.message,
                  statusCode: error.statusCode,
                });
              }

              // Si no tiene estás propiedades lanzar un RpcException generico
              throw new RpcException({
                message: 'Error desconocido al comunicarse con el servicio de sucursales.',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              });
            })
          )
        );
      }

      const newRecord = await this.prisma.warehouse.create({
        data: {
          ...data,
          slug: slugify(data.name),
          usersAccess: {
            create: usersAccess.map(user => ({
              userId: user.userId,
              role: user.role,
            }))
          },
          branches: {
            create: branches.map(item => ({
              branchId: item.branchId,
            }))
          }
        },
        include: {
          branches: {
            select: {
              branchId: true,
            }
          },
          usersAccess: {
            select: {
              userId: true,
              role: true,
            }
          },
        },
      })

      return {
        message: 'Almacén creado con éxito.',
        warehouse: newRecord,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear el almacén.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async findAll(paginationDto: WarehousePaginationDto) {

    const { limit, page, search, status } = paginationDto;
    // Calcular el offset para la paginación
    const skip = limit ? (page - 1) * limit : undefined;
    try {
      const warehouses = await this.prisma.warehouse.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        where: {
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        },
        orderBy: {
          name: 'asc'
        },
        include: {
          branches: {
            select: {
              branchId: true,
            }
          },
          usersAccess: {
            select: {
              userId: true,
              role: true,
            }
          },
        },
      });

      const branchIds = [
        ...new Set(warehouses.flatMap(w => w.branches.map(b => b.branchId))),
      ];

      // Enviar la solicitud al ms de branches para obtener los branches por los ids
      const branches = await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds));

      // Mapear la respuesta: anidal los datos de las sucursales a cada almacén
      const warehousesAndBranches = warehouses.map(warehouse => ({
        ...warehouse,
        branches: warehouse.branches.map(branch => ({
          ...branch,
          details: branches.find(b => b.id === branch.branchId) || null, // Añadir datos completos de la sucursal
        }))
      }));

      // Contar el total de productos que cumplen el filtro (sin paginación)
      const totalItems = await this.prisma.warehouse.count({
        where: {
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        },
      });

      return {
        warehouses: warehousesAndBranches,
        meta: {
          totalItems, // Total de productos encontrados
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      };
    } catch (error) {
      console.log('Error al obtener la lista de almacenes:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de almacenes.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findOne(term: string) {
    try {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: {
          OR: [
            { id: term },
            { slug: term }
          ]
        },
        include: {
          branches: {
            select: {
              branchId: true,
            }
          },
          usersAccess: {
            select: {
              userId: true,
              role: true,
            }
          },
        },
      });

      if (!warehouse) {
        throw new RpcException({
          message: 'Almacén no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      const branchIds = [
        ...new Set(warehouse.branches.map(b => b.branchId)),
      ];

      // Enviar la solicitud al ms de branches para obtener los branches por los ids
      const branches = await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds));


      return {
        ...warehouse,
        branches: warehouse.branches.map(branch => ({
          ...branch,
          details: branches.find(b => b.id === branch.branchId) || null, // Añadir datos completos de la sucursal
        }))
      };
    } catch (error) {
      console.log('Error al obtener el almacén', error);
      throw new RpcException({
        message: 'Error al obtener el almacén',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async update(id: string, updateWarehouseDto: UpdateWarehouseDto) {
    try {
      const { branches, usersAccess, ...data } = updateWarehouseDto;

      const warehouseExists = await this.prisma.warehouse.findUnique({
        where: { id }
      });
      if (!warehouseExists) {
        throw new RpcException({
          message: 'El almacén no existe.',
          statusCode: HttpStatus.NOT_FOUND,
        })
      }


      if (data.name) {
        // Verificar si el nombre ya existe
        const existingWarehouse = await this.prisma.warehouse.findFirst({
          where: {
            name: data.name,
            id: { not: id },
          },
        });

        if (existingWarehouse) {
          throw new RpcException({
            message: 'El nombre del almacén ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      if (branches) {
        // Verificar si hay duplicados en branches
        const branchIds = branches.map(item => item.branchId);

        const uniqueBranchIds = new Set(branchIds);

        if (branchIds.length !== uniqueBranchIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados de branchId en las sucursales",
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        // Enviar solicitud al microservicio branches para valdiar los branchIds
        await firstValueFrom(
          this.natsClient.send('branches.validateIds', branchIds).pipe(
            catchError(error => {
              console.log('Error capturado al enciar mensaje:', error);

              //Si el error tiene message y statusCode, convertirlo a un RcpException
              if (error?.message && error?.statusCode) {
                throw new RpcException({
                  message: error.message,
                  statusCode: error.statusCode,
                });
              }

              // Si no tiene estás propiedades lanzar un RpcException generico
              throw new RpcException({
                message: 'Error desconocido al comunicarse con el servicio de sucursales.',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              });
            })
          )
        );
      }

      const udatedRecord = await this.prisma.warehouse.update({
        where: { id },
        data: {
          ...data,
          ...(data.name && {
            slug: slugify(data.name)
          }),
          ...(usersAccess && {
            usersAccess: {
              deleteMany: {
                warehouseId: id,
              },
              create: usersAccess.map(user => ({
                userId: user.userId,
                role: user.role,
              }))
            },
          }),
          ...(branches && {
            branches: {
              deleteMany: {
                warehouseId: id,
              },
              create: branches.map(item => ({
                branchId: item.branchId,
              }))
            },
          }),
        },
        include: {
          branches: {
            select: {
              branchId: true,
            }
          },
          usersAccess: {
            select: {
              userId: true,
              role: true,
            }
          },
        },
      })

      return {
        message: 'Almacén actualizado con éxito.',
        warehouse: udatedRecord,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear el almacén.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async remove(id: string) {
    try {
      const warehouseExists = await this.prisma.warehouse.findUnique({
        where: { id },
        include: {
          branches: {
            select: {
              branchId: true,
            }
          },
          usersAccess: {
            select: {
              userId: true,
              role: true,
            }
          },
        },
      });

      if (!warehouseExists) {
        throw new RpcException({
          message: 'No se encontró el almacén.',
          statusCode: HttpStatus.NOT_FOUND
        });
      }
      // // Verificar si el almacén tiene relaciones activas
      // if (warehouseExists.branches.length > 0) {
      //   throw new RpcException({
      //     message: 'No se puede eliminar el almacén porque está relacionado con sucursales.',
      //     statusCode: HttpStatus.CONFLICT,
      //   });
      // }

      // if (warehouseExists.usersAccess.length > 0) {
      //   throw new RpcException({
      //     message: 'No se puede eliminar el almacén porque está relacionado con usuarios.',
      //     statusCode: HttpStatus.CONFLICT,
      //   });
      // }

      // Eliminar las relaciones con las sucursales primero
      await this.prisma.warehouseBranch.deleteMany({
        where: { warehouseId: id, },
      });

      // Elimina las relaciones con los usuarios
      await this.prisma.warehouseAccess.deleteMany({
        where: { warehouseId: id },
      });

      // Eliminar el almacen ya sin relaciones
      return {
        message: 'Almacén eliminado con éxito.',
        warehouse: warehouseExists,
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar el almacén.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async getWarehousesByBranchId(branchId: string) {
    try {
      // Consultar los almaecenes en la db
      const warehouses = await this.prisma.warehouse.findMany({
        where: {
          branches: {
            some: {
              branchId
            }
          }
        }
      });

      return warehouses;
    } catch (error) {
      console.log('Error al obtener las sucursales', error);
      return [];
    }
  }
}
