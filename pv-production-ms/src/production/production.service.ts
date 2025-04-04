import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { ProductionPaginationDto } from './dto/production-pagination';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductionService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async handleRpcError<T>(observable$: Observable<T>): Promise<T> {
    return firstValueFrom(
      observable$.pipe(
        catchError(error => {
          console.error('Error capturado en handleRpcError:', error);

          // Lanzar RpcException con los datos del error
          throw new RpcException({
            message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
            statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          });
        })
      )
    );
  }

  async verifyStockForMovement(productId: string, stockData: any): Promise<void> {
    const { quantity, originBranchId } = stockData;
    // Verificación del stock en la sucursal o almacén de origen
    const sourceStock = await this.handleRpcError(
      this.natsClient.send(
        'products.verifyStockBranch',
        {
          productId,
          // ...(originWarehouseId ? { warehouseId: originWarehouseId } : {}),
          ...(originBranchId ? { branchId: originBranchId } : {}),
        }
      )
    );

    if (parseFloat(sourceStock) < parseFloat(quantity)) {
      const branch = originBranchId ? await firstValueFrom(
        this.natsClient.send('findOneBranch', originBranchId).pipe(
          catchError((error) => {
            console.error('Error fetching branch:', error);
            return of(null);
          })
        )
      ) : null;
      const product = productId ? await firstValueFrom(
        this.natsClient.send('findOneProduct', productId).pipe(
          catchError((error) => {
            console.error('Error fetching product:', error);
            return of(null);
          })
        )
      ) : null;
      throw new RpcException({
        message: `No hay suficiente stock en la sucursal '${(branch ? branch.name : originBranchId)}' para el producto ${product ? product.name : productId}. Total: ${quantity} Disponible: ${sourceStock}.`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

  }

  async create(createProductionDto: CreateProductionDto) {
    try {
      const { productionOrderDetails, branchId, ...data } = createProductionDto;

      // createProductionDto.productionOrderDetails.forEach(detail =>{
      //   const recipeExists = await this.prisma.recipe.findUnique({
      //     where:{id: detail.recipeId}
      //   })
      //   if(!recipeExists){

      //   }
      // })
      if (productionOrderDetails) {
        // 1️⃣ Agrupar recetas y sumar sus cantidades
        const recipeQuantities = productionOrderDetails.reduce((acc, detail) => {
          acc[detail.recipeId] = (acc[detail.recipeId] || 0) + Number(detail.quantity);
          return acc;
        }, {} as Record<string, number>);

        // 2️⃣ Acumulador global de productos
        const productTotalQuantities: Record<string, number> = {};

        // 3️⃣ Procesar cada receta y calcular la cantidad total de cada producto
        await Promise.all(
          Object.entries(recipeQuantities).map(async ([recipeId, totalQuantity]) => {
            const recipe = await this.prisma.recipe.findUnique({
              where: { id: recipeId },
              include: { items: true }
            });

            if (recipe) {
              recipe.items.forEach((item) => {
                const requiredQuantity = Number(item.quantity) * totalQuantity;
                productTotalQuantities[item.productId] =
                  (productTotalQuantities[item.productId] || 0) + requiredQuantity;
              });
            }
          })
        );

        // 4️⃣ Verificar stock de cada producto sumado en todas las recetas
        await Promise.all(
          Object.entries(productTotalQuantities).map(([productId, totalQuantity]) =>
            this.verifyStockForMovement(productId, {
              quantity: totalQuantity.toFixed(2),
              originBranchId: branchId
            })
          )
        );
      }



      // Validar branchId
      await firstValueFrom(
        this.natsClient.send('branches.validateIds', [branchId]).pipe(
          catchError(this.handleRpcError.bind(this))
        )
      );

      if (createProductionDto.createdByUserId === createProductionDto.updatedByUserId) {
        await firstValueFrom(
          this.natsClient.send('auth.user.findOne', createProductionDto.createdByUserId).pipe(
            catchError(this.handleRpcError.bind(this))
          )
        );
      } else {
        await Promise.all([
          firstValueFrom(
            this.natsClient.send('auth.user.findOne', createProductionDto.createdByUserId).pipe(
              catchError(this.handleRpcError.bind(this))
            )
          ),
          firstValueFrom(
            this.natsClient.send('auth.user.findOne', createProductionDto.updatedByUserId).pipe(
              catchError(this.handleRpcError.bind(this))
            )
          ),
        ]);
      }

      // Crear receta dentro de una transacción
      const newRecord = await this.prisma.$transaction(async (prisma) => {
        const orderProduction = await prisma.productionOrders.create({
          data: {
            ...createProductionDto,
            productionOrderDetails: {
              create: createProductionDto.productionOrderDetails
            }
          },
          include: {
            productionOrderDetails: true,
          },
        });

        try {
          if (orderProduction.productionOrderDetails && orderProduction.productionOrderDetails.length > 0) {
            // 1️⃣ Agrupar recetas y sumar sus cantidades
            const recipeQuantities = orderProduction.productionOrderDetails.reduce((acc, detail) => {
              acc[detail.recipeId] = (acc[detail.recipeId] || 0) + Number(detail.quantity);
              return acc;
            }, {} as Record<string, number>);

            // 2️⃣ Acumulador global de productos
            const productTotalQuantities: Record<string, number> = {};

            // 3️⃣ Procesar cada receta y calcular la cantidad total de cada producto
            await Promise.all(
              Object.entries(recipeQuantities).map(async ([recipeId, totalQuantity]) => {
                const recipe = await this.prisma.recipe.findUnique({
                  where: { id: recipeId },
                  include: { items: true }
                });

                if (recipe) {
                  recipe.items.forEach((item) => {
                    const requiredQuantity = Number(item.quantity) * totalQuantity;
                    productTotalQuantities[item.productId] =
                      (productTotalQuantities[item.productId] || 0) + requiredQuantity;
                  });
                }
              })
            );

            // 5️⃣ Crear las entradas de stock para actualizar
            const stockData = Object.entries(productTotalQuantities).map(([productId, totalQuantity]) => ({
              productId,
              updateId: branchId,
              quantity: -totalQuantity, // Descontar la cantidad
              branchOrWarehouse: 'BRANCH'
            }));

            // 6️⃣ Enviar la solicitud de creación o modificación de stock
            if (stockData.length > 0) {
              await this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
            }
          }
        } catch (error) {
          console.error('Error actualizando stock, revirtiendo...', error);

          throw new RpcException({
            message: 'Error en la actualización de stock, cambios revertidos.',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          });
        }

        return orderProduction;
      });
      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', newRecord.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', newRecord.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );



      return {
        message: 'Orden de producción registrada con éxito.',
        recipe: {
          ...newRecord,
          createdByUser,
          updatedByUser
        },
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al registrar la orden de producción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async findAll(paginationDto: ProductionPaginationDto) {
    const { limit, page, status, branchId, orderBy, columnOrderBy, date } = paginationDto;
    // Calcular el offset para la paginación
    const skip = limit ? (page - 1) * limit : undefined;
    try {
      // Normalizar la fecha para comparar solo por día
      let startOfDay: Date | undefined;
      let endOfDay: Date | undefined;

      if (date) {
        startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0); // Inicio del día en La Paz
    
        endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999); // Fin del día en La Paz
      }
      const productions = await this.prisma.productionOrders.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        where: {
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { status: status }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
          ...((branchId) && { branchId }),
          // Filtro por fecha: Si `date` es proporcionado, lo usamos
          ...(startOfDay && endOfDay && {
            OR: [
              { deliveryDate: { gte: startOfDay, lte: endOfDay } },
              // { createdAt: { gte: startOfDay, lte: endOfDay } }
            ]
          })
        },
        orderBy: {
          // Se ordena primero por `deliveryDate`, y si es null, se ordena por `createdAt`
          [columnOrderBy]: orderBy, // Usa `orderBy` si lo proporcionas
          // createdAt: orderBy, // Directamente asigna `orderBy` al campo `createdAt`
        },
        include: {
          productionOrderDetails: {
            include: {
              recipe: {
                include: {
                  items: {
                    include: {
                      recipe: {
                        select: {
                          name: true,
                        }
                      }
                    }
                  }
                }
              },
              parallelGroup: {
                select: {
                  name: true,
                }
              }
            }
          }
        },
      });

      // Mapear la respuesta: anidal los datos de las sucursales a cada almacén
      const productionsAndUsers = await Promise.all(
        productions.map(async (production) => {
          const updatedByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', production.updatedByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching updatedByUser:', error);
                return of(null);
              })
            )
          );

          const createdByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', production.createdByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching createdByUser:', error);
                return of(null);
              })
            )
          );

          const branch = await firstValueFrom(
            this.natsClient.send('findOneBranch', production.branchId).pipe(
              catchError((error) => {
                console.error('Error fetching findOneBranch:', error);
                return of(null);
              })
            )
          );

          return {
            ...production,
            branch: branch ? {
              name: branch.name,
              isEnable: branch.isEnable,
            } : null,
            createdByUser: createdByUser ? {
              name: createdByUser.name
            } : null,
            updatedByUser: updatedByUser ? {
              name: updatedByUser.name,
            } : null,
          };
        })
      );

      // Contar el total de productos que cumplen el filtro (sin paginación)
      const totalItems = await this.prisma.productionOrders.count({
        where: {
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { status: status }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
          ...((branchId) && { branchId }),
          // Filtro por fecha: Si `date` es proporcionado, lo usamos
          ...(startOfDay && endOfDay && {
            OR: [
              { deliveryDate: { gte: startOfDay, lte: endOfDay } },
              // { createdAt: { gte: startOfDay, lte: endOfDay } }
            ]
          })
        },
      });

      return {
        productions: productionsAndUsers,
        meta: {
          totalItems, // Total de productos encontrados
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log('Error al obtener la lista de elaboraciones:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de Elaboraciones.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findOne(id: string) {
    try {
      const productionExists = await this.prisma.productionOrders.findUnique({
        where: { id },
        include: {
          productionOrderDetails: {
            include: {
              recipe: {
                include: {
                  items: true,
                }
              }
            }
          }
        }
      });

      if (!productionExists) {
        throw new RpcException({
          message: 'Registro de producción no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        })
      }

      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', productionExists.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', productionExists.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      return {
        ...productionExists,
        createdByUser,
        updatedByUser,
      };
    } catch (error) {

    }
  }

  async update(id: string, updateProductionDto: UpdateProductionDto) {
    try {
      // Verificar si la producción existe
      const existingProduction = await this.prisma.productionOrders.findUnique({ where: { id } });
      if (!existingProduction) {
        throw new RpcException({
          message: 'Registro de producción no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      // Validar si "createdByUserId" y "updatedByUserId" existen antes de hacer la verificación con NATS
      const requests = [];

      if (updateProductionDto.createdByUserId) {
        requests.push(
          firstValueFrom(
            this.natsClient.send('auth.user.findOne', updateProductionDto.createdByUserId).pipe(
              catchError(this.handleRpcError.bind(this))
            )
          )
        );
      }

      if (updateProductionDto.updatedByUserId && updateProductionDto.updatedByUserId !== updateProductionDto.createdByUserId) {
        requests.push(
          firstValueFrom(
            this.natsClient.send('auth.user.findOne', updateProductionDto.updatedByUserId).pipe(
              catchError(this.handleRpcError.bind(this))
            )
          )
        );
      }

      // Ejecutar todas las validaciones que correspondan
      if (requests.length > 0) {
        await Promise.all(requests);
      }

      // Actualizar producción dentro de una transacción
      const updatedRecord = await this.prisma.$transaction(async (prisma) => {
        try {
          const orderProductionUpdated = await prisma.productionOrders.update({
            where: { id },
            data: {
              ...updateProductionDto,
              ...(updateProductionDto.productionOrderDetails && updateProductionDto.productionOrderDetails.length > 0) && ({
                productionOrderDetails: {
                  deleteMany: {
                    productionOrderId: id,
                  },
                  create: updateProductionDto.productionOrderDetails
                }
              })
            },
            include: {
              productionOrderDetails: {
                include: {
                  recipe: {
                    include: {
                      items: true
                    }
                  }
                }
              }
            },
          });
          const updatedByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', orderProductionUpdated.updatedByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching updatedByUser:', error);
                return of(null);
              })
            )
          );

          const createdByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', orderProductionUpdated.createdByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching createdByUser:', error);
                return of(null);
              })
            )
          );

          if (updateProductionDto.status) {
            if (updateProductionDto.status === 'CANCELED') {
              try {
                if (orderProductionUpdated.productionOrderDetails && orderProductionUpdated.productionOrderDetails.length > 0) {
                  // 1️⃣ Agrupar recetas y sumar sus cantidades
                  const recipeQuantities = orderProductionUpdated.productionOrderDetails.reduce((acc, detail) => {
                    acc[detail.recipeId] = (acc[detail.recipeId] || 0) + Number(detail.quantity);
                    return acc;
                  }, {} as Record<string, number>);

                  // 2️⃣ Acumulador global de productos
                  const productTotalQuantities: Record<string, number> = {};

                  // 3️⃣ Procesar cada receta y calcular la cantidad total de cada producto
                  await Promise.all(
                    Object.entries(recipeQuantities).map(async ([recipeId, totalQuantity]) => {
                      const recipe = await this.prisma.recipe.findUnique({
                        where: { id: recipeId },
                        include: { items: true }
                      });

                      if (recipe) {
                        recipe.items.forEach((item) => {
                          const requiredQuantity = Number(item.quantity) * totalQuantity;
                          productTotalQuantities[item.productId] =
                            (productTotalQuantities[item.productId] || 0) + requiredQuantity;
                        });
                      }
                    })
                  );

                  // 5️⃣ Crear las entradas de stock para actualizar
                  const stockData = Object.entries(productTotalQuantities).map(([productId, totalQuantity]) => ({
                    productId,
                    updateId: orderProductionUpdated.branchId,
                    quantity: totalQuantity, // Descontar la cantidad
                    branchOrWarehouse: 'BRANCH'
                  }));

                  // 6️⃣ Enviar la solicitud de creación o modificación de stock
                  if (stockData.length > 0) {
                    await this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
                  }
                }
              } catch (error) {
                console.error('Error actualizando stock, revirtiendo...', error);

                throw new RpcException({
                  message: 'Error en la actualización de stock, cambios revertidos.',
                  statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                });
              }
            }
          }


          return {
            ...orderProductionUpdated,
            createdByUser,
            updatedByUser,
          };
        } catch (error) {
          console.error('Error dentro de la transacción:', error);
          throw error; // Rollback automático si hay error
        }
      });

      return {
        message: 'Producción actualizada con éxito.',
        recipe: updatedRecord,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al actualizar la producción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async remove(id: string, userId: string) {
    try {
      const existingProduction = await this.prisma.productionOrders.findUnique({ where: { id } });

      if (!existingProduction) {
        throw new RpcException({
          message: 'Reeegistro de producción no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      // Marcar el registro como eliminado y registrar quién lo eliminó
      const deletedRecord = await this.prisma.productionOrders.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId // Usuario que eliminó la producción
        },
      });

      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', deletedRecord.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', deletedRecord.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      const deletedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', userId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      return {
        message: 'Producción eliminada correctamente.',
        production: {
          ...deletedRecord,
          updatedByUser,
          createdByUser,
          deletedByUser
        }
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar la producción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async findAllParallelGroups() {
    try {
      const groups = await this.prisma.parallelGroup.findMany({

        orderBy: {
          name: 'asc', // Usa `orderBy` si lo proporcionas
        }
      });


      return {
        parallelGroups: groups,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log('Error al obtener la lista de grupos paralelos de producción:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de grupos paralelos de producción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }
}
