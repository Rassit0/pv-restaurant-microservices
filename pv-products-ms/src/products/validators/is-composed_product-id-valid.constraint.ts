import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
import { HttpStatus, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { PrismaService } from "src/prisma/prisma.service";

@ValidatorConstraint({ async: true })
@Injectable()
export class IsComposedProductIdValidConstraint implements ValidatorConstraintInterface {
    constructor(private readonly prisma: PrismaService) {
    }

    async validate(value: string, validationArguments?: ValidationArguments): Promise<boolean> {
        try {
            // // Verificar si la categoría existe
            // const product = await this.productsService.findOne(value);
            // return Boolean(product);  // Retorna true si el producto existe, false si no
            // Verificar si el producto existe y es del tipo RawMaterial
            const product = await this.prisma.product.findFirst({
                where: {
                    id: value,
                    // type: 'RawMaterial'
                }
            });

            if (!product) {
                // Si no existe el producto
                throw new RpcException({
                    message: 'El ID del producto no es válido o no existe.',
                    statusCode: HttpStatus.NOT_FOUND
                });
            }

            return true;  // Si pasa las validaciones
        } catch (error) {
            throw error;  // Lanzar cualquier error, incluyendo RcpException
        }
    }

    defaultMessage(validationArguments?: ValidationArguments): string {
        // Mensaje de error cuando la validación falla
        return 'El ID del producto no es válido o no existe.';
    }
}