import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsEnumIf(
  enumType: object,
  condition: (object: any) => boolean,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEnumIf',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [enumType, condition],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [enumType, condition] = args.constraints;
          const conditionMet = condition(args.object);

          // Si la condición no se cumple, no validar el enum
          if (!conditionMet) {
            return true;
          }

          // Si la condición se cumple, validar que el valor esté en el enum
          return value === undefined || Object.values(enumType).includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          const [enumType] = args.constraints;
          const validValues = Object.values(enumType).join(', ');
          return `El campo ${args.property} debe ser uno de los valores válidos: ${validValues}.`;
        },
      },
    });
  };
}