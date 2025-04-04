// import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
// import { HttpStatus, Injectable } from '@nestjs/common';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { RpcException } from '@nestjs/microservices';

// const modelMap = {
//   product: (prisma: PrismaService) => prisma.product,
//   category: (prisma: PrismaService) => prisma.category,
//   season: (prisma: PrismaService) => prisma.season,
//   unit: (prisma: PrismaService) => prisma.unit,
//   // Añade aquí otros modelos que necesites
// };

// @ValidatorConstraint({ async: true })
// @Injectable()
// export class ExistsConstraint implements ValidatorConstraintInterface {
//   constructor(private readonly prisma: PrismaService) { }

//   async validate(value: any, args: ValidationArguments) {
//     // Si el valor es nulo o indefinido, no pasa la validación.
//     if (value === null || value === undefined) {
//       throw new RpcException({
//         message: `${args.property} es obligatorio y no puede ser nulo o indefinido.`,
//         statusCode: HttpStatus.BAD_REQUEST
//       }); // Excepción personalizada
//     }

//     const [model, property] = args.constraints;
//     const modelClient = modelMap[model](this.prisma);

//     // Verifica si el registro existe en la base de datos.
//     const record = await modelClient.findUnique({
//       where: { [property]: value },
//     });

//     if (!record) {
//       // throw new RpcException({
//       //   message: `${args.property} con valor ${value} no existe.`,
//       //   statusCode: HttpStatus.NOT_FOUND
//       // }); // Excepción personalizada
//       return false;
//     }

//     return true; // Devuelve true si el registro existe.
//     // return !!record; // Devuelve true si el registro existe, indicando que pasa la validación.
//   }

//   defaultMessage(args: ValidationArguments) {
//     const [property] = args.constraints;
//     return `El ${property} no existe. Por favor, verifica el valor proporcionado.`;
//   }
// }

// export function Exists(model: keyof typeof modelMap, property: string, validationOptions?: ValidationOptions) {
//   return function (object: Object, propertyName: string) {
//     registerDecorator({
//       target: object.constructor,
//       propertyName: propertyName,
//       options: validationOptions,
//       constraints: [model, property],
//       validator: ExistsConstraint,
//     });
//   };
// }
