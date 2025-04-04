import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, of } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class BranchesService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async create(createBranchDto: CreateBranchDto) {
    try {
      // Verificar si ya existe el nombre
      const branchByName = await this.prisma.branch.findUnique({
        where: { name: createBranchDto.name }
      });
      if (branchByName) {
        throw new RpcException({
          message: 'El nombre ya está en uso.',
          statusCode: HttpStatus.CONFLICT
        });
      }

      // Verificar si llego email y que sea unico
      if (createBranchDto.email) {
        const branchByEmail = await this.prisma.branch.findUnique({
          where: { email: createBranchDto.email }
        });
        if (branchByEmail) {
          throw new RpcException({
            message: 'El correo ya está en uso.',
            statusCode: HttpStatus.CONFLICT
          });
        }
      }

      // Crear la sucursal si las validaciones pasaron
      const branch = await this.prisma.branch.create({
        data: createBranchDto,
      })

      return {
        message: "Sucursal creada con éxito",
        branch
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear la sucursal',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

  async findAll(paginationDto: PaginationDto) {

    const { limit, page, search } = paginationDto;
    // Calcular el offset para la paginación
    const skip = limit ? (page - 1) * limit : undefined;
    const branches = await this.prisma.branch.findMany({
      skip, // Desplazamiento para la paginación
      take: limit ? limit : undefined, // si es 0 devuelve todo
      where: {
        OR: search
          ? [
            { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            { location: { contains: search, mode: 'insensitive' } },
          ]
          : undefined,
      },
      orderBy: {
        name: 'asc'
      }
    });

    const totalItems = await this.prisma.branch.count({
      where: {
        OR: search
          ? [
            { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            { location: { contains: search, mode: 'insensitive' } },
          ]
          : undefined,
      }
    });
    // Obtener almacenes para cada sucursal
    const branchesWithWarehouses = await Promise.all(
      branches.map(async (branch) => {
        const warehouses = await firstValueFrom(this.natsClient.send('get_warehouses_by_branch_id', branch.id));
        // Enviar solicitud al servicio de sucursales para validar los branchIds
        const manager = await firstValueFrom(
          this.natsClient.send('auth.user.findOne', branch.managerId).pipe(
            catchError((error) => {
              // console.error('Error fetching findOne:', error);
              return of(null);
            })
          )
        );
        return { ...branch, manager, warehouses };
      })
    );

    return {
      branches: branchesWithWarehouses,
      meta: {
        totalItems, // Total de productos encontrados
        itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
        totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
        currentPage: page, // Página actual
      }
    };
  }

  async findOne(id: string) {
    try {
      const branch = await this.prisma.branch.findUnique({
        where: { id },
      });

      if (!branch) {
        throw new RpcException({
          message: 'No se encontró la sucursal',
          statusCode: HttpStatus.NOT_FOUND
        })
      }
      const warehouses = await firstValueFrom(this.natsClient.send('get_warehouses_by_branch_id', branch.id));;
      return { ...branch, warehouses };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Ocurrió un error al buscar la sucursal',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    try {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id }
      })
      if (!branchExists) {
        throw new RpcException({
          message: 'La sucursal no existe.',
          statusCode: HttpStatus.NOT_FOUND
        })
      }

      if (updateBranchDto.name) {
        const branchByName = await this.prisma.branch.findFirst({
          where: {
            name: updateBranchDto.name,
            id: { not: id }
          },
        });
        if (branchByName) {
          throw new RpcException({
            message: 'El nombre ya está en uso.',
            statusCode: HttpStatus.CONFLICT
          })
        }
      }

      if (updateBranchDto.email) {
        const branchByEmail = await this.prisma.branch.findFirst({
          where: {
            email: updateBranchDto.email,
            id: { not: id }
          }
        })
        if (branchByEmail) {
          throw new RpcException({
            message: 'El email ya está en uso.',
            statusCode: HttpStatus.CONFLICT
          })
        }
      }

      // Actualizar sucursal
      const updatedBranch = await this.prisma.branch.update({
        where: { id },
        data: { ...updateBranchDto }
      })

      return {
        message: 'Sucursal actualizada con éxito.',
        branch: updatedBranch
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: "Error al actualizar la sucursal",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async remove(id: string) {
    try {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id }
      })
      if (!branchExists) {
        throw new RpcException({
          message: 'La sucursal no existe.',
          statusCode: HttpStatus.NOT_FOUND
        })
      }

      // Enviar solicitud al servicio de sucursales para validar los branchIds
      const filteredProductsByBrnachId = await firstValueFrom(
        this.natsClient.send('findAllProducts', { branchId: id }).pipe(
          catchError(error => {
            console.error('Error capturado al enviar mensaje:', error);

            // Si el error tiene message y statusCode, convertirlo en un RpcException
            if (error?.message && error?.statusCode) {
              throw new RpcException({
                message: error.message,
                statusCode: error.statusCode,
              });
            }

            // Si no tiene estas propiedades, lanzar un RpcException genérico
            throw new RpcException({
              message: 'Error desconocido al comunicarse con el servicio de sucursales.',
              statusCode: 500, // Internal Server Error
            });
          })
        )
      );

      if (filteredProductsByBrnachId.products.length > 0) {
        throw new RpcException({
          message: 'No se puede eliminar la sucursal porque contiene información.',// está relacionado con otras entidades',
          statusCode: HttpStatus.CONFLICT,
        })
      }

      const branch = await this.prisma.branch.delete({
        where: { id }
      });

      return {
        message: 'Sucursal eliminada con éxito.',
        branch
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar la sucursal.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  async validateBranchesIds(ids: string[]) {
    // Eliminar duplicados
    ids = Array.from(new Set(ids));

    // Validar sucursales existentes
    const branches = await this.prisma.branch.findMany({
      where: {
        id: {
          in: ids
        },
      },
    });

    // Verificar que se encontraron todas
    if (branches.length !== ids.length) {
      const foundIds = branches.map(branch => branch.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));

      throw new RpcException({
        message: `No se encontraron las siguientes sucursales: ${missingIds.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
      })
    }

    return branches;
  }

  async getBranchesByIds(ids: string[]) {
    try {
      if (!ids || ids.length === 0) {
        return [];
      }

      // Consultar las sucursales en la db
      const branches = await this.prisma.branch.findMany({
        where: { id: { in: ids } },
      });

      return branches;
    } catch (error) {
      console.log('Error al obtener las sucursales', error);
      return [];
    }
  }
}
