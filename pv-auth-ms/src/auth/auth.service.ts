import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { envs, NATS_SERVICE } from 'src/config';
import { JwtPayload } from './interfaces/jwt-payload';
import { PaginationDto } from '../common/dto/pagination.dto';
import { contains } from 'class-validator';
import { UsersPaginationDto } from './dto/users-pagination';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async register(registerUserDto: RegisterUserDto) {
    const { userBranches, ...registerUser } = registerUserDto;
    const userBynameExists = await this.prisma.user.findUnique({
      where: { name: registerUser.name }
    })

    if (userBynameExists) {
      throw new RpcException({
        message: "Ya se registro este nombre",
        statusCode: HttpStatus.CONFLICT
      })
    }

    const userByEmailExists = await this.prisma.user.findUnique({
      where: { email: registerUser.email }
    })

    if (userByEmailExists) {
      throw new RpcException({
        message: "Ya se registro este correo",
        statusCode: HttpStatus.CONFLICT
      })
    }

    //Verificar q el rol exista
    const role = await this.prisma.role.findUnique({
      where: { id: registerUser.roleId }
    })
    if (!role) {
      throw new RpcException({
        message: `El rol no existe`,
        statusCode: HttpStatus.FORBIDDEN
      })
    }

    if (userBranches) {
      // Verificar si hay duplicados en branches
      const branchIds = userBranches.map(item => item.branchId);

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
    // Crear el usuario
    const hashedPassword = await bcrypt.hash(registerUser.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: registerUser.name,
        email: registerUser.email,
        roleId: registerUser.roleId,
        imageUrl: registerUser.imageUrl,
        password: hashedPassword,
        hasGlobalBranchesAccess: registerUser.hasGlobalBranchesAccess,
        userBranches: {
          create: userBranches
        }
      },
      include: {
        role: {
          select: {
            name: true,
            description: true,
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
          },
        },
        userBranches: true
      }
    });

    const { password, ...restUser } = user;
    return {
      user: restUser,
      message: "Usuario registrado con éxito"
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email
        },
        // include: {
        //   userBranches: {
        //     select: {
        //       branchId: true,
        //     }
        //   }
        // }
        // include: {
        //   role: {
        //     select: {
        //       name: true,
        //       description: true,
        //       roleModule: {
        //         select: {
        //           module: true,
        //           roleModulePermission: {
        //             select: {
        //               permission: true,
        //             }
        //           }
        //         }
        //       },
        //     }
        //   },
        // }
      })

      if (!user) {
        throw new RpcException({
          message: "Credenciales incorrectas",
          statusCode: HttpStatus.UNAUTHORIZED
        })
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new RpcException({
          message: 'Credenciales incorrectas',
          statusCode: HttpStatus.UNAUTHORIZED
        });
      }

      const { password: _, ...restUser } = user

      return {
        user: restUser,
        token: await this.generateTokenJWT(restUser)
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  // Generación de token JWT
  async generateTokenJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }
  async verify(token: string) {
    try {
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
        secret: envs.jwtSecret // Aqui se pone la firma
      });

      return {
        user,
        token
      }
    } catch (error) {
      console.log(error);
      throw new RpcException({
        message: "Token inválido",
        statusCode: HttpStatus.UNAUTHORIZED
      });
    }
  }

  async findAll(paginationDto: UsersPaginationDto) {
    try {
      const { limit, page, search, status } = paginationDto;

      // Calcular el offset para la paginación
      const skip = limit ? (page - 1) * limit : undefined;

      const users = await this.prisma.user.findMany({
        skip,
        take: limit ? limit : undefined, // si es 0 devuelve todo
        orderBy: { email: 'asc' },
        where: {
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
            : undefined, // Si no hay search, no se agrega ningun filtro
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        },
        select: {
          id: true,
          name: true,
          email: true,
          isEnable: true,
          hasGlobalBranchesAccess: true,
          createdAt: true,
          updatedAt: true,
          roleId: true,
          role: {
            select: {
              name: true,
              description: true,
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
            }
          },
          userBranches: {
            select: {
              branchId: true,
            }
          },
          imageUrl: true,
        }
      });
      const branchIds = [
        ...new Set(users.flatMap(w => w.userBranches.map(b => b.branchId))),
      ];

      // Enviar la solicitud al ms de branches para obtener los branches por los ids
      const branches = await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds));

      // Mapear la respuesta: anidal los datos de las sucursales a cada almacén
      const usersAndBranches = users.map(user => ({
        ...user,
        userBranches: user.userBranches.map(branch => ({
          ...branch,
          branch: branches.find(b => b.id === branch.branchId) || null, // Añadir datos completos de la sucursal
        }))
      }));

      // contar el total de users q cumplen el filtro
      const totalItems = await this.prisma.user.count({
        where: {
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
            : undefined, // Si no hay search, no se agrega ningun filtro
        }
      })

      return {
        users: usersAndBranches,
        meta: {
          totalItems,
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      }
    } catch (error) {
      console.log(error);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: 'No se pudo obtener los usuarios',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }


  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          isEnable: true,
          hasGlobalBranchesAccess: true,
          createdAt: true,
          updatedAt: true,
          roleId: true,
          role: {
            select: {
              name: true,
              description: true,
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
            }
          },
          userBranches: {
            select: {
              branchId: true,
            }
          },
          imageUrl: true,
        }
      });

      if (!user) {
        throw new RpcException({
          message: 'No se encontró el usuario',
          statusCode: HttpStatus.NOT_FOUND
        })
      }

      const branchIds = [
        ...new Set(user.userBranches.map(b => b.branchId)),
      ];

      // Enviar la solicitud al ms de branches para obtener los branches por los ids
      const branches = await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds));


      return {
        ...user,
        userBranches: user.userBranches.map(branch => ({
          ...branch,
          branch: branches.find(b => b.id === branch.branchId) || null, // Añadir datos completos de la sucursal
        }))
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Ocurrió un error al buscar el usuario',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }
}
