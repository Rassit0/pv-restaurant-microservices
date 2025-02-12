import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UsersPaginationDto } from './dto/users-pagination';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.user.register')
  registerUser(@Payload() registerUserDto:RegisterUserDto){
    return this.authService.register(registerUserDto);
  }

  @MessagePattern('auth.user.login')
  loginUser(@Payload() loginUserDto: LoginUserDto){
    return this.authService.login(loginUserDto);
  }

  @MessagePattern('auth.user.verify')
  verifyToken(@Payload() token: string){
    return this.authService.verify(token);
  }

  @MessagePattern('auth.user.findAll')
  findAll(@Payload() paginationDto: UsersPaginationDto){
    return this.authService.findAll(paginationDto);
  }

  @MessagePattern('auth.user.findOne')
  findOne(@Payload() id: string){
    return this.authService.findOne(id);
  }
}
