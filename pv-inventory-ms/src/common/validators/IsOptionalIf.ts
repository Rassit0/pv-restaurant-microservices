import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsOptionalIf(
  condition: (object: any) => boolean,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOptionalIf',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const conditionMet = condition(args.object);
          if (conditionMet) {
            // Si la condición se cumple, el campo es opcional
            return true;
          }
          // Si la condición no se cumple, el campo debe ser validado
          return value !== undefined && value !== null;
        },
        defaultMessage(args: ValidationArguments) {
          return `El campo ${args.property} es obligatorio porque no se cumple la condición.`;
        },
      },
    });
  };
}