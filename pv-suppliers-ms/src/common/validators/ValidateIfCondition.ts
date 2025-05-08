import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function ValidateIfCondition(
  condition: (object: any) => boolean,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isConditionalRequired',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const conditionMet = condition(args.object);
          if (!conditionMet && value !== undefined) {
            // Si la condición no se cumple pero el valor está presente, no es válido
            return false;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} no cumple con la condición requerida.`;
        },
      },
    });
  };
}