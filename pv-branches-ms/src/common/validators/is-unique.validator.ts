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
// export class IsUniqueConstraint implements ValidatorConstraintInterface {
//   constructor(private readonly prisma: PrismaService) { }

//   async validate(value: any, args: ValidationArguments) {
//     // Si el valor es nulo o indefinido, la validación no aplica.
//     if (value === null || value === undefined) {
//       return true; // Pasa la validación porque no hay valor para verificar.
//     }

//     const [model, property, idField] = args.constraints;
//     const modelClient = modelMap[model](this.prisma);

//     // Construir el filtro de búsqueda
//     const filter: Record<string, any> = { [property]: value };

//     // Excluir el registro actual si se proporciona un `idField`
//     if (idField) {
//       const id = (args.object as any)[idField]; // Obtiene el `id` dinámicamente del objeto validado
//       if (id) {
//         filter.id = { not: id }; // Excluye el registro actual
//       }
//     }
//     const record = await modelClient.findFirst({
//       where: filter,
//     });
//     // return !record; // Devuelve true si no existe un registro con el valor, indicando unicidad
//     if (record) {
//       // Lanza la excepción rcp en caso de q el valor no sea único.
//       // throw new RpcException({
//       //   message: "Ya existe un registro con este nombre",
//       //   statusCode: HttpStatus.BAD_REQUEST // Envia el codigo 400 
//       // });
//       return false
//     }
//     return true;
//   }

//   defaultMessage(args: ValidationArguments) {
//     const [property] = args.constraints;
//     return `${property} ya existe. Debe ser único.`;
//   }
// }

// export function IsUnique(model: keyof typeof modelMap, property: string, validationOptions?: ValidationOptions, idField?: string) {
//   return function (object: Object, propertyName: string) {
//     registerDecorator({
//       target: object.constructor,
//       propertyName: propertyName,
//       options: validationOptions,
//       constraints: [model, property, idField],
//       validator: IsUniqueConstraint,
//     });
//   };
// }
