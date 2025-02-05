import { IsString, IsUUID } from "class-validator";

export class WarehouseBranchDto {
    @IsUUID()
    branchId: string
}