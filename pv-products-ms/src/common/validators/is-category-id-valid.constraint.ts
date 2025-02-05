import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { HttpStatus, Injectable } from "@nestjs/common";
import { CategoriesService } from "src/categories/categories.service";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "src/prisma/prisma.service";

@ValidatorConstraint({ async: true })
@Injectable()
export class IsCategoryIdValidConstraint implements ValidatorConstraintInterface {
    constructor(private readonly prisma: PrismaService) {
    }

    async validate(value: string, validationArguments?: ValidationArguments): Promise<boolean> {
        try {
            // Verificar si la categoría existe
            const category = await this.prisma.category.findUnique({
                where: {id: value}
            });
            if (!category) {
                // Lanza la excepción rcp en caso de q la categoria no exista
                // throw new RpcException({
                //     message: "El ID de la categoría no es válido o no existe.",
                //     statusCode: HttpStatus.BAD_REQUEST // Envia el codigo 400 
                // });
                return false;
            }
            return true
        } catch (error) {
            throw error;
        }
    }

    defaultMessage(validationArguments?: ValidationArguments): string {
        // Mensaje de error cuando la validación falla
        return 'El ID de la categoría no es válido o no existe.';
    }
}