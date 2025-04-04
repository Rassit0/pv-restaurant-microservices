import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from './guards/auth.guard';
import { Token } from './decorators/token.decorator';
import { catchError } from 'rxjs';
import { UsersPaginationDto } from './dto/users-pagination..dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ) { }

  @Post("register")
  registerUser(@Body() registerUserDto: RegisterUserDto) {
    return this.client.send('auth.user.register', registerUserDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(AuthGuard)
  @Patch("updateUser/:id")
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.client.send('auth.update.user', { id, ...updateUserDto })
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.client.send('auth.user.login', loginUserDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(AuthGuard)
  @Get('verify')
  async verify(@Token() token: string) {
    // console.log(token)
    return this.client.send('auth.user.verify', token)
      .pipe(
        catchError(error => {
          console.log(error)
          throw new RpcException(error);
        })
      );
  }

  @UseGuards(AuthGuard)
  @Get('users')
  findAll(@Query() paginationDto: UsersPaginationDto) {
    return this.client.send("auth.user.findAll", paginationDto)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      )
  }

  @UseGuards(AuthGuard)
  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.client.send("auth.user.findOne", id)
      .pipe(
        catchError(error => {
          throw new RpcException(error)
        })
      );
  }
}
