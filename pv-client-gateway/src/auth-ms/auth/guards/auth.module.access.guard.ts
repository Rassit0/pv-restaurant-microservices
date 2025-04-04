import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Request } from 'express';
  
  @Injectable()
  export class ModuleAccessGuard implements CanActivate {
    constructor(private reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      // Obtener el módulo requerido desde el decorador, primero en el método y luego en el controlador
      const requiredModule =
        this.reflector.get<string>('module', context.getHandler()) ||
        this.reflector.get<string>('module', context.getClass()); // ← Se busca en la clase
  
      if (!requiredModule) return true; // Si no hay módulo, permitir acceso
  
      const request = context.switchToHttp().getRequest<Request>();
      const user = request['user']; // Obtener usuario autenticado
  
      if (!user || !user.role?.roleModule) {
        throw new UnauthorizedException('Usuario no tiene permisos para acceder a este módulo.');
      }
  
      // Extraer módulos a los que el usuario tiene acceso
      const userModules = user.role.roleModule.map((m) => m.module.name);
  
      if (!userModules.includes(requiredModule)) {
        throw new UnauthorizedException(`No tienes acceso al módulo ${requiredModule}`);
      }
  
      return true;
    }
  }
  