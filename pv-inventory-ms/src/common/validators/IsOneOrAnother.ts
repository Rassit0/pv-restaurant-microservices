import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsOneOrAnother(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOneOrAnother',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return (value && !relatedValue) || (!value && relatedValue); // Solo uno debe estar presente
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `Debe proporcionar solo uno: ${args.property} o ${relatedPropertyName}, pero no ambos.`;
        },
      },
    });
  };
}