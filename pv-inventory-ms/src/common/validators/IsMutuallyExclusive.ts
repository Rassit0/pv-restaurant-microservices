import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsMutuallyExclusive(fields: string[], validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isMutuallyExclusive',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [fields],
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedFields] = args.constraints;
                    if (!Array.isArray(relatedFields)) {
                        throw new TypeError('The relatedFields argument must be an array.');
                    }
                    const object = args.object as any;
                    const isPresent = relatedFields.some((field: string) => object[field] !== undefined);
                    return !isPresent || value === undefined;
                },
                defaultMessage(args: ValidationArguments) {
                    const [relatedFields] = args.constraints;
                    return `${args.property} no debe estar presente si alguno de los siguientes campos está definido: ${relatedFields.join(', ')}`;
                },
            },
        });
    };
}