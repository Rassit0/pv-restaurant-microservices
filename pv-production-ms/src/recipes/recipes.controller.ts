import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesPaginationDto } from './dto/recipes-pagination';
import { RemoveRecipeDto } from './dto/remove-recipe.dto';

@Controller()
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) { }

  @MessagePattern('createRecipe')
  create(@Payload() createRecipeDto: CreateRecipeDto) {
    return this.recipesService.create(createRecipeDto);
  }

  @MessagePattern('findAllRecipes')
  findAll(@Payload() pagination: RecipesPaginationDto) {
    return this.recipesService.findAll(pagination);
  }

  @MessagePattern('findOneRecipe')
  findOne(@Payload() term: string) {
    return this.recipesService.findOne(term);
  }

  @MessagePattern('updateRecipe')
  update(@Payload() updateRecipeDto: UpdateRecipeDto) {
    return this.recipesService.update(updateRecipeDto.id, updateRecipeDto);
  }

  @MessagePattern('removeRecipe')
  remove(@Payload() removeRecipeDto: RemoveRecipeDto) {
    return this.recipesService.remove(removeRecipeDto.id, removeRecipeDto.deletedByUserId);
  }
}
