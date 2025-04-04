import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { Request } from 'express';
  
  @Injectable()
  export class ModulePermissionAccessGuard implements CanActivate {
    constructor(private reflector: Reflector) {}
  
    canActivate(context: ExecutionContext): boolean {
      // Obtener los permisos requeridos desde el decorador, primero en el método y luego en el controlador
      const requiredPermissions: string[] =
        this.reflector.get<string[]>('permissions', context.getHandler()) ||
        this.reflector.get<string[]>('permissions', context.getClass()); // ← Se busca en la clase
  
      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true; // Si no hay permisos requeridos, permitir acceso
      }
  
      const request = context.switchToHttp().getRequest<Request>();
      const user = request['user']; // Obtener usuario autenticado
  
      if (!user || !user.role?.roleModule) {
        throw new UnauthorizedException('Usuario no tiene permisos para acceder a este módulo.');
      }
  
      // Extraer los permisos a los que el usuario tiene acceso para cada módulo
      const userModules = user.role.roleModule;
  
      // Verificar si el usuario tiene el permiso requerido para el módulo correspondiente
      const hasPermission = userModules.some((roleModule) => {
        // Verificar si el módulo y los permisos coinciden
        return requiredPermissions.some((permission) =>
          roleModule.roleModulePermission.some(
            (roleModulePermission) => roleModulePermission.permission.name === permission
          )
        );
      });
  
      if (!hasPermission) {
        throw new UnauthorizedException(`No tienes acceso a los permisos necesarios.`);
      }
  
      return true;
    }
  }
  