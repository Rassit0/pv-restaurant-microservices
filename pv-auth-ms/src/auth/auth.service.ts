import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { envs } from 'src/config';
import { JwtPayload } from './interfaces/jwt-payload';
import { PaginationDto } from '../common/dto/pagination.dto';
import { contains } from 'class-validator';
import { UsersPaginationDto } from './dto/users-pagination';

@Injectable()
export class AuthService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) { }

  async register(registerUserDto: RegisterUserDto) {
    const userBynameExists = await this.prisma.user.findUnique({
      where: { name: registerUserDto.name }
    })

    if (userBynameExists) {
      throw new RpcException({
        message: "Ya se registro este nombre",
        statusCode: HttpStatus.CONFLICT
      })
    }

    const userByEmailExists = await this.prisma.user.findUnique({
      where: { email: registerUserDto.email }
    })

    if (userByEmailExists) {
      throw new RpcException({
        message: "Ya se registro este correo",
        statusCode: HttpStatus.CONFLICT
      })
    }

    //Verificar q el rol exista
    const role = await this.prisma.role.findUnique({
      where: { id: registerUserDto.roleId }
    })
    if (!role) {
      throw new RpcException({
        message: `El rol no existe`,
        statusCode: HttpStatus.FORBIDDEN
      })
    }

    // Crear el usuario
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: registerUserDto.name,
        email: registerUserDto.email,
        roleId: registerUserDto.roleId,
        imageUrl: registerUserDto.imageUrl,
        password: hashedPassword
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
        include: {
          role: true
        }
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
        token: await this.generateTokenJWT({ email: restUser.email, id: restUser.id, name: restUser.name })
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
      const skip = limit? (page - 1) * limit : undefined;

      const users = await this.prisma.user.findMany({
        skip,
        take: limit? limit : undefined, // si es 0 devuelve todo
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
          createdAt: true,
          updatedAt: true,
          roleId: true,
          role: {
            select: {
              name: true,
              description: true,
            }
          },
          imageUrl: true,
        }
      });

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
        users,
        meta: {
          totalItems,
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit? Math.ceil(totalItems / limit) : 1, // Total de páginas
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
}
