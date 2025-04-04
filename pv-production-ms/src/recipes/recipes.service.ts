import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { catchError, firstValueFrom, of } from 'rxjs';
import { slugify } from 'src/common/helpers/slugify';
import { RecipesPaginationDto } from './dto/recipes-pagination';

@Injectable()
export class RecipesService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  private handleRpcError(error: any) {
    console.log('Error capturado al enviar mensaje:', error);

    if (error?.message && error?.statusCode) {
      throw new RpcException({
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    throw new RpcException({
      message: 'Error desconocido al comunicarse con el servicio.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }

  async create(createRecipeDto: CreateRecipeDto) {
    try {
      const { items, ...data } = createRecipeDto;

      // Verificar si el nombre ya existe
      const existingRecipe = await this.prisma.recipe.findUnique({
        where: { name: data.name },
      });

      if (existingRecipe) {
        throw new RpcException({
          message: 'El nombre del almacén ya está en uso.',
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      if (items) {
        // Verificar si hay duplicados en branches
        const productIds = items.map(item => item.productId);

        const uniqueProductIds = new Set(productIds);

        if (productIds.length !== uniqueProductIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados en los ingredientes",
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        // Enviar solicitud al microservicio branches para valdiar los productIds
        await firstValueFrom(
          this.natsClient.send('products.validateIds', productIds).pipe(
            catchError(error => {
              console.log('Error capturado al enciar mensaje:', error);

              //Si el error tiene message y statusCode, convertirlo a un RcpException
              if (error?.message && error?.statusCode) {
                throw new RpcException({
                  message: error.message,
                  statusCode: error.statusCode,
                });
              }

              // Si no tiene estás propiedades lanzar un RpcException generico
              throw new RpcException({
                message: 'Error desconocido al comunicarse con el servicio de productos.',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              });
            })
          )
        );
      }

      if (data.createdByUserId === data.updatedByUserId) {
        await firstValueFrom(
          this.natsClient.send('auth.user.findOne', data.createdByUserId).pipe(
            catchError(this.handleRpcError.bind(this))
          )
        );
      } else {
        await Promise.all([
          firstValueFrom(
            this.natsClient.send('auth.user.findOne', data.createdByUserId).pipe(
              catchError(this.handleRpcError.bind(this))
            )
          ),
          firstValueFrom(
            this.natsClient.send('auth.user.findOne', data.updatedByUserId).pipe(
              catchError(this.handleRpcError.bind(this))
            )
          ),
        ]);
      }

      // Crear receta dentro de una transacción
      const newRecord = await this.prisma.$transaction(async (prisma) => {
        const recipe = await prisma.recipe.create({
          data: {
            ...data,
            slug: slugify(data.name),
            items: {
              create: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
              }))
            }
          },
          include: {
            items: true,
          },
        });
        return recipe;
      });

      return {
        message: 'Receta creada con éxito.',
        recipe: newRecord,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear la receta.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async findAll(paginationDto: RecipesPaginationDto) {

    const { limit, page, search, status } = paginationDto;
    // Calcular el offset para la paginación
    const skip = limit ? (page - 1) * limit : undefined;
    try {
      const recipes = await this.prisma.recipe.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        where: {
          deletedAt: null, // Filtrar solo recetas no eliminadas
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
              { description: { contains: search, mode: 'insensitive' } },
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        },
        orderBy: {
          name: 'asc'
        },
        include: {
          items: true,
          ProductionDetail: {
            include: {
              productionOrder: true
            }
          }
        },
      });

      const productsIds = [
        ...new Set(recipes.flatMap(recipe => recipe.items.map(item => item.productId))),
      ];

      // Enviar la solicitud al ms de products para obtener los branches por los ids
      const products = await firstValueFrom(this.natsClient.send('get_products_by_ids', productsIds));

      // Mapear la respuesta: anidal los datos de las sucursales a cada almacén
      const recipesproductsUsers = await Promise.all(
        recipes.map(async (recipe) => {
          const updatedByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', recipe.updatedByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching updatedByUser:', error);
                return of(null);
              })
            )
          );

          const createdByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', recipe.createdByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching createdByUser:', error);
                return of(null);
              })
            )
          );
          const deletedByUser = recipe.deletedByUserId ? await firstValueFrom(
            this.natsClient.send('auth.user.findOne', recipe.deletedByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching deletedByUser:', error);
                return of(null);
              })
            )
          ) : null;

          return {
            ...recipe,
            createdByUser: createdByUser ? {
              id: createdByUser.id,
              name: createdByUser.name,
              email: createdByUser.email,
              roleId: createdByUser.roleId
            } : null,
            updatedByUser: updatedByUser ? {
              id: updatedByUser.id,
              name: updatedByUser.name,
              email: updatedByUser.email,
              roleId: updatedByUser.roleId
            } : null,
            deletedByUser: deletedByUser ? {
              id: deletedByUser.id,
              name: deletedByUser.name,
              email: deletedByUser.email,
              roleId: deletedByUser.roleId
            } : null,
            items: recipe.items.map(item => ({
              ...item,
              product: products.find(b => b.id === item.productId) || null,
            }))
          };
        })
      );

      // Contar el total de productos que cumplen el filtro (sin paginación)
      const totalItems = await this.prisma.recipe.count({
        where: {
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        },
      });

      return {
        recipes: recipesproductsUsers,
        meta: {
          totalItems, // Total de productos encontrados
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      };
    } catch (error) {
      console.log('Error al obtener la lista de recetas:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de recetas.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findOne(term: string) {
    try {
      const recipe = await this.prisma.recipe.findFirst({
        where: {
          OR: [
            { id: term },
            { slug: term }
          ]
        },
        include: {
          items: true,
          ProductionDetail: {
            include: {
              productionOrder: true
            }
          }
        }
      });

      if (!recipe) {
        throw new RpcException({
          message: 'Receta no encontrada.',
          statusCode: HttpStatus.NOT_FOUND,
        })
      }

      const productsIds = [...new Set(recipe.items.map(item => item.productId).flat())];

      // Enviar la solicitud al ms de branches para obtener los branches por los ids
      const products = await firstValueFrom(this.natsClient.send('get_products_by_ids', productsIds));

      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', recipe.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', recipe.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      const deletedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', recipe.deletedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      return {
        ...recipe,
        createdByUser: createdByUser ? {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
          roleId: createdByUser.roleId
        } : null,
        updatedByUser: updatedByUser ? {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
          roleId: updatedByUser.roleId
        } : null,
        deletedByUser: deletedByUser ? {
          id: deletedByUser.id,
          name: deletedByUser.name,
          email: deletedByUser.email,
          roleId: deletedByUser.roleId
        } : null,
        items: recipe.items.map(item => ({
          ...item,
          product: products.find(b => b.id === item.productId) || null,
        }))
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log('Error al obtener la receta', error);
      throw new RpcException({
        message: 'Error al obtener la receta',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto) {
    try {
      const { items, ...data } = updateRecipeDto;

      // Verificar si la receta existe
      const existingRecipe = await this.prisma.recipe.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existingRecipe) {
        throw new RpcException({
          message: 'Receta no encontrada.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      // Verificar si el nombre ya está en uso por otra receta
      if (data.name && data.name !== existingRecipe.name) {
        const nameConflict = await this.prisma.recipe.findUnique({
          where: { name: data.name },
        });
        if (nameConflict) {
          throw new RpcException({
            message: 'El nombre de la receta ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      if (items) {
        // Verificar si hay duplicados en los ingredientes
        const productIds = items.map(item => item.productId);
        const uniqueProductIds = new Set(productIds);
        if (productIds.length !== uniqueProductIds.size) {
          throw new RpcException({
            message: 'No se pueden agregar ingredientes duplicados.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        // Validar productos con el microservicio de productos
        await firstValueFrom(
          this.natsClient.send('products.validateIds', productIds).pipe(
            catchError(this.handleRpcError.bind(this))
          )
        );
      }

      if (data.updatedByUserId) {
        await firstValueFrom(
          this.natsClient.send('auth.user.findOne', data.updatedByUserId).pipe(
            catchError(this.handleRpcError.bind(this))
          )
        );
      }

      // Actualizar la receta dentro de una transacción
      const updatedRecipe = await this.prisma.$transaction(async (prisma) => {
        // Actualizar receta principal
        const recipe = await prisma.recipe.update({
          where: { id },
          data: {
            ...data,
            slug: data.name ? slugify(data.name) : existingRecipe.slug,
            ...(items && {
              items: {
                deleteMany: {
                  recipeId: id
                },
                create: items
              }
            })
          },
          include: { items: true },
        });

        return recipe;
      });

      return {
        message: 'Receta actualizada con éxito.',
        recipe: updatedRecipe,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al actualizar la receta.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async remove(id: string, deletedByUserId: string) {
    try {
      const existingRecipe = await this.prisma.recipe.findFirst({
        where: { id, deletedAt: null },
        include: {
          items: true,
          ProductionDetail: true,
        }
      });

      if (!existingRecipe) {
        throw new RpcException({
          message: 'Receta no encontrada.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      if (existingRecipe.ProductionDetail.length > 0) {
        throw new RpcException({
          message: 'No se puede eliminar porque la receta contiene información.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      await this.prisma.recipe.update({
        where: { id },
        data: {
          deletedByUserId,
          deletedAt: new Date()
        },
      });

      return {
        message: 'Receta eliminada correctamente.',
        recipe: existingRecipe,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar la receta.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

}
