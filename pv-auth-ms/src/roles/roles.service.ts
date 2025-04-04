import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class RolesService {

  constructor(private readonly prisma: PrismaService) { }

  async create(createRoleDto: CreateRoleDto) {
    try {
      const roleExists = await this.prisma.role.findUnique({
        where: { name: createRoleDto.name }
      });

      if (roleExists) {
        throw new RpcException({
          message: "El rol ya existe",
          statusCode: HttpStatus.CONFLICT
        })
      }

      const newRecord = await this.prisma.role.create({
        data: { ...createRoleDto },
        include: {
          roleModule: {
            select: {
              module: {
                select: {
                  name: true,
                  parentModule: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              roleModulePermission: {
                select: {
                  permission: {
                    select: {
                      name: true
                    }
                  },
                }
              }
            }
          },
          users: {
            select: {
              email: true,
            },
          },
        },
      });

      return {
        message: "Rol creado con éxito",
        role: newRecord
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: "Error al crear el rol",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  async findAll() {
    try {
      const roles = await this.prisma.role.findMany({
        include: {
          roleModule: {
            select: {
              module: {
                select: {
                  name: true,
                  parentModule: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              roleModulePermission: {
                select: {
                  permission: {
                    select: {
                      name: true
                    }
                  },
                }
              }
            }
          },
          users: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return {
        roles
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Ocurrió un error al buscar el usuario',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  async findOne(id: string) {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
        include: {
          roleModule: {
            select: {
              module: {
                select: {
                  name: true,
                  parentModule: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              roleModulePermission: {
                select: {
                  permission: {
                    select: {
                      name: true
                    }
                  },
                }
              }
            }
          },
          users: {
            select: {
              email: true,
            },
          },
        },
      });
      return role;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Ocurrió un error al buscar el usuario',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    try {
      const roleExits = await this.prisma.role.findFirst({
        where: {
          name: updateRoleDto.name,
          id: { not: id }
        },
        include: {
          roleModule: {
            select: {
              module: {
                select: {
                  name: true,
                  parentModule: {
                    select: {
                      name: true
                    }
                  }
                }
              },
              roleModulePermission: {
                select: {
                  permission: {
                    select: {
                      name: true
                    }
                  },
                }
              }
            }
          },
          users: {
            select: {
              email: true,
            }
          }
        }
      });
      if (roleExits) {
        throw new RpcException({
          message: "Ya existe un rol con este nombre",
          statusCode: HttpStatus.CONFLICT
        })
      }

      // Actualiza rol
      const updateRole = await this.prisma.role.update({
        where: { id },
        data: { ...updateRoleDto }
      });

      return {
        message: "Rol actualizado con éxito",
        role: updateRole
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: "Error al actualizar el rol",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async remove(id: string) {
    try {
      const roleExists = await this.prisma.role.findUnique({
        where: { id },
        include: {
          users: true,
        },
      });

      if (!roleExists) {
        throw new RpcException({
          message: "El rol no existe",
          statusCode: HttpStatus.NOT_FOUND
        })
      }

      // Verificar si el rol tiene relaciones
      if (roleExists.users && roleExists.users.length > 0) {
        throw new RpcException({
          message: "No se puede eliminar el rol porque está asociado a uno o más usuarios",
          statusCode: HttpStatus.BAD_REQUEST,
        })
      }

      // Eliminar el rol
      const role = await this.prisma.role.delete({
        where: { id },
      });
      return {
        message: "Rol eliminado con éxito",
        role
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: "Error al eliminar el rol",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }
}
