import { StatusInventoryMovement} from "@prisma/client";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";

export class ChangeStatusDto {
    @IsUUID()
    id: string;

    @IsUUID()
    @IsNotEmpty({ message: 'El ID del usuario que actualizó el movimiento es obligatorio.' })
    updatedByUserId?: string;

    @IsEnum(StatusInventoryMovement)
    status: StatusInventoryMovement;
}