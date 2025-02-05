import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsISO8601DateString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrictISO8601',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
          return typeof value === 'string' && iso8601Regex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'La fecha debe estar en formato ISO 8601 (con T y Z).';
        },
      },
    });
  };
}
