import { ProductionOrderStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    ValidateNested,
    ArrayMinSize,
    IsInt,
    IsPositive
} from "class-validator";
import { ProductionOrderDetailDto } from "./productio-detail.dto";
import { IsISO8601DateString } from "src/common/validators";

export class CreateProductionDto {
    @IsUUID()
    @IsNotEmpty({ message: "El campo 'branchId' es obligatorio y debe ser un UUID válido." })
    branchId: string;

    @IsUUID()
    @IsNotEmpty({ message: "El campo 'createdByUserId' es obligatorio y debe ser un UUID válido." })
    createdByUserId: string;

    @IsUUID()
    @IsNotEmpty({ message: "El campo 'updatedByUserId' es obligatorio y debe ser un UUID válido." })
    updatedByUserId: string;

    @IsEnum(ProductionOrderStatus, { message: "El campo 'status' debe ser un valor válido." })
    @IsOptional()
    status: ProductionOrderStatus = ProductionOrderStatus.PENDING;

    @IsOptional()
    @IsBoolean({ message: 'El estado de la producción debe ser un valor booleano.' })
    isEnable?: boolean;

    @ValidateNested({ each: true })
    @Type(() => ProductionOrderDetailDto)
    @ArrayMinSize(1, { message: 'Debe incluir al menos una receta en la producción.' })
    productionOrderDetails: ProductionOrderDetailDto[];

    // @IsOptional()
    // @IsDateString({ strict: true }, { message: "La fecha de expiración debe ser una fecha válida en formato ISO 8601." })
    @IsISO8601DateString({ message: "La fecha de ingreso(entryDate) debe ser una fecha válida en formato ISO 8601 (ejemplo: '2025-01-01T00:00:00.000Z')." })
    deliveryDate: Date;

    @IsInt({ message: 'El tiempo de preparación debe ser un número entero.' })
    @IsPositive({ message: 'El tiempo de preparación debe ser mayor a 0 minutos.' })
    // @IsOptional()
    totalTime: number;
}
