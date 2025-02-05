import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

const modelMap = {
  supplier: (prisma: PrismaService) => prisma.supplier,
  contactInfo: (prisma: PrismaService) => prisma.contactInfo,
  // Añade aquí otros modelos que necesites
};

interface ExistsOptions {
  model: keyof typeof modelMap,
  property: string,
  excludeCurrentId?: (object: any) => number | number | string
}

@ValidatorConstraint({ async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) { }

  async validate(value: any, args: ValidationArguments) {

    const [options] = args.constraints;
    const { model, property, excludeCurrentId } = options as ExistsOptions;
    const modelClient = modelMap[model as string](this.prisma);

    if (!value) return true; // Si el valor es nulo o vacío, no valida.

    try {
      // Extrae dinámicamente el id del objeto DTO
      const objectId = typeof excludeCurrentId === 'function' ? excludeCurrentId(args.object) : excludeCurrentId;
      // Verifica si ya existe un registro con el mismo valor.
      const record = await modelClient.findFirst({
        where: {
          [property]: value,
          NOT: objectId ? { id: objectId } : undefined,
        },
      });

      // Si existe un registro, significa que el valor ya está repetido.
      if (record) {
        return false; // No pasa la validación
      }
      return true; // El valor no está repetido, pasa la validación.
    } catch (error) {
      console.error('Error en ExistsConstraint:', error);
      throw new RpcException({
        message: 'Error interno al verificar la existencia del registro.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  defaultMessage(args: ValidationArguments) {
    const [options] = args.constraints;
    const { property } = options as ExistsOptions;
    return `El valor proporcionado para '${property}' ya existe. Por favor, usa un valor único.`;
  }
}

export function Exists(options: ExistsOptions, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: ExistsConstraint,
    });
  };
}
