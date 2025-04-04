import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';
import { NATS_SERVICE } from 'src/config';
import * as bcrypt from 'bcrypt';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class UsersService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const { userBranches, ...updateUser } = updateUserDto;

      return this.prisma.$transaction(async (prisma) => {
        // Verificar si el usuario existe
        const existingUser = await prisma.user.findUnique({ where: { id } });
        if (!existingUser) {
          throw new RpcException({
            message: "Usuario no encontrado",
            statusCode: HttpStatus.NOT_FOUND
          });
        }

        // Verificar si el nuevo nombre ya existe (excepto el del usuario actual)
        if (updateUser.name && updateUser.name !== existingUser.name) {
          const userByNameExists = await prisma.user.findUnique({
            where: { name: updateUser.name }
          });

          if (userByNameExists) {
            throw new RpcException({
              message: "Ya se registró este nombre",
              statusCode: HttpStatus.CONFLICT
            });
          }
        }

        // Verificar si el nuevo correo ya existe (excepto el del usuario actual)
        if (updateUser.email && updateUser.email !== existingUser.email) {
          const userByEmailExists = await prisma.user.findUnique({
            where: { email: updateUser.email }
          });

          if (userByEmailExists) {
            throw new RpcException({
              message: "Ya se registró este correo",
              statusCode: HttpStatus.CONFLICT
            });
          }
        }

        // Verificar si el nuevo rol existe
        if (updateUser.roleId && updateUser.roleId !== existingUser.roleId) {
          const role = await prisma.role.findUnique({
            where: { id: updateUser.roleId }
          });
          if (!role) {
            throw new RpcException({
              message: "El rol no existe",
              statusCode: HttpStatus.FORBIDDEN
            });
          }
        }

        if (userBranches) {
          // Verificar duplicados en userBranches
          const branchIds = userBranches.map(item => item.branchId);
          const uniqueBranchIds = new Set(branchIds);

          if (branchIds.length !== uniqueBranchIds.size) {
            throw new RpcException({
              message: "No se pueden agregar duplicados de branchId en las sucursales",
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }

          // Validar los branchIds con el microservicio de sucursales
          await firstValueFrom(
            this.natsClient.send('branches.validateIds', branchIds).pipe(
              catchError(error => {
                console.log('Error capturado al enviar mensaje:', error);

                if (error?.message && error?.statusCode) {
                  throw new RpcException({
                    message: error.message,
                    statusCode: error.statusCode,
                  });
                }

                throw new RpcException({
                  message: "Error desconocido al comunicarse con el servicio de sucursales.",
                  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                });
              })
            )
          );

          // Eliminar las relaciones existentes
          await prisma.userBranch.deleteMany({ where: { userId: id } });
        }

        // Si se está actualizando la contraseña, encriptarla
        if (updateUser.password) {
          updateUser.password = await bcrypt.hash(updateUser.password, 10);
        }

        // Actualizar el usuario
        const updatedUser = await prisma.user.update({
          where: { id },
          data: {
            ...updateUser,
            userBranches: userBranches ? { create: userBranches } : undefined
          },
          include: {
            role: {
              select: {
                name: true,
                description: true,
                roleModule: {
                  select: {
                    module: true,
                    roleModulePermission: {
                      select: {
                        permission: true,
                      }
                    }
                  }
                },
              }
            },
            userBranches: true
          }
        });

        const { password, ...restUser } = updatedUser;
        return {
          message: "Usuario actualizado con éxito",
          user: restUser,
        };
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar el almacén.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }

  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
