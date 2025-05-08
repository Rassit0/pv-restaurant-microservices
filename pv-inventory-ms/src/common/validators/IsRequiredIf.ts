import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsRequiredIf(
  condition: (object: any) => boolean,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isRequiredIf',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const conditionMet = condition(args.object);
          if (conditionMet && (value === undefined || value === null)) {
            // Si la condición se cumple pero el valor no está presente, no es válido
            return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `El campo ${args.property} es obligatorio porque se cumple la condición.`;
        },
      },
    });
  };
}