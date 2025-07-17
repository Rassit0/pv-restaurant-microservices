import { Transform } from "class-transformer";
import { IsArray, IsString } from "class-validator";


export class FindByIdsDto {

    @IsArray({ message: 'El campo "supplierIds" debe ser un arreglo.' })
    @IsString({ each: true, message: 'Cada elemento de "supplierIds" debe ser una cadena de texto.' })
    @Transform(({ value }) => {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value.split(',').map(v => v.trim());
        }
        return []; // Retorna array vacío si llega null, undefined, objeto, etc.
    })
    supplierIds: string[];
}