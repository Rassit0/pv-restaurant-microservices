import { IsNotEmpty, IsString, MaxLength } from "class-validator"
import { IsUnique } from "src/common/validators"

export class CreateUnitDto {
    @IsString({message:"El nombre(name) debe ser un texto"})
    @IsNotEmpty({ message: 'El nombre de la unidad es obligatorio' })
    @MaxLength(100, {message:"El nombre(name) no puede tener más de 100 carácteres"})
    @IsUnique('unit', 'name', {message:"El nombre de la unidad ya está en uso"})
    name: string

    @IsString({message:"La abreviación(abbreviation) debe ser un texto"})
    @IsNotEmpty({ message: 'La abreviación de la unidad es obligatorio' })
    @MaxLength(10, {message:"La abreviación(abbreviation) no puede tener más de 10 carácteres"})
    @IsUnique('unit', 'abbreviation', {message:"La abreviación de la unidad ya está en uso"})
    abbreviation: string
}
