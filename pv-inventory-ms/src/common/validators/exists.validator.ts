import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';

const modelMap = {
  inventoryTransaction: (prisma: PrismaService) => prisma.inventoryMovement,
  // Añade aquí otros modelos que necesites
};

@ValidatorConstraint({ async: true })
@Injectable()
export class ExistsConstraint implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) { }

  async validate(value: any, args: ValidationArguments) {

    const [model, property] = args.constraints;
    const modelClient = modelMap[model](this.prisma);

    if (value) {
      // Verifica si el registro existe en la base de datos.
      const record = await modelClient.findUnique({
        where: { [property]: value },
      });

      if (!record) {
        // throw new RpcException({
        //   message: `${args.property} con valor ${value} no existe.`,
        //   statusCode: HttpStatus.NOT_FOUND
        // }); // Excepción personalizada
        return false;
      }
    }

    return true; // Devuelve true si el registro existe.
    // return !!record; // Devuelve true si el registro existe, indicando que pasa la validación.
  }

  defaultMessage(args: ValidationArguments) {
    const [property] = args.constraints;
    return `El ${property} no existe. Por favor, verifica el valor proporcionado.`;
  }
}

export function Exists(model: keyof typeof modelMap, property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [model, property],
      validator: ExistsConstraint,
    });
  };
}
