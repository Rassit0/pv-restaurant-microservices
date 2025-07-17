import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateProductionDto } from './dto/create-production.dto';
import { UpdateProductionDto } from './dto/update-production.dto';
import { ProductionPaginationDto } from './dto/production-pagination';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductionMonthlySummaryDto } from './dto/production-monthly-summary.dto';
import { CountOrdersDto } from './dto/count-orders.dto';

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

  async verifyStockForMovement(productId: string, stockData: { quantity: string, originBranchId: string }): Promise<void> {
    const { quantity, originBranchId } = stockData;
    const stockPayload: { productId: string, locationId: string, locationType: 'WAREHOUSE' | 'BRANCH' } = {
      productId,
      locationId: originBranchId,
      locationType: 'BRANCH'
    };
    // Verificar stock del almacén de origen mediante el microservicio products.getStock
    const sourceStock = originBranchId
      ? await firstValueFrom(this.natsClient.send('products.getStock', stockPayload).pipe(
        catchError((error) => {
          console.error('Error fetching stock for branch:', error);
          return of(0);
        })
      ))
      : 0; // Si no hay originBranchId, asumimos que el stock es 0
    // Verificación del stock en la sucursal o almacén de origen
    // const sourceStock = await this.handleRpcError(
    //   this.natsClient.send(
    //     'products.verifyStockBranch',
    //     {
    //       productId,
    //       // ...(originWarehouseId ? { warehouseId: originWarehouseId } : {}),
    //       ...(originBranchId ? { branchId: originBranchId } : {}),
    //     }
    //   )
    // );

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
      const { productionOrderDetails, originBranchId, ...data } = createProductionDto;

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
        for (const [recipeId, totalQuantity] of Object.entries(recipeQuantities)) {
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
        }

        // ==== Validar los productIds de los productos involucrados ====
        // 🔹 IDs únicos de todos los productos involucrados
        const productIds = Object.keys(productTotalQuantities);
        await firstValueFrom(
          this.natsClient.send('products.validateIds', productIds).pipe(
            catchError(error => {
              console.error(`Error capturado en products.validateIds:`, error);
              throw new RpcException({
                message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
                statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
              });
            }),
          )
        )

        // 4️⃣ Verificar stock de cada producto sumado en todas las recetas
        const errorsStock: string[] = [];

        for (const [productId, totalQuantity] of Object.entries(productTotalQuantities)) {
          const quantity = Number(totalQuantity);

          // Obtener branch y producto en paralelo
          const [branch, product] = await Promise.all([
            originBranchId
              ? firstValueFrom(
                this.natsClient.send('findOneBranch', originBranchId).pipe(
                  catchError((error) => {
                    console.error('Error fetching branch:', error);
                    return of(null);
                  })
                )
              )
              : null,
            productId
              ? firstValueFrom(
                this.natsClient.send('findOneProduct', productId).pipe(
                  catchError((error) => {
                    console.error('Error fetching product:', error);
                    return of(null);
                  })
                )
              )
              : null,
          ]);

          const productName = product?.name ?? `[${productId}]`;
          const branchName = branch?.name ?? `[${originBranchId}]`;
          const unitAbbreviation = product?.unit?.abbreviation ?? '';

          const stockPayload = {
            productId,
            locationId: originBranchId,
            locationType: 'BRANCH' as const,
          };

          // Verificar stock del almacén de origen mediante el microservicio products.getStock
          if (originBranchId) {
            try {
              const sourceStock = await firstValueFrom(
                this.natsClient.send<number>('products.getStock', stockPayload),
              );

              // errorsStock.push(totalQuantity.toString())
              if (sourceStock < quantity) {
                errorsStock.push(
                  `No hay suficiente stock en la sucursal '${branchName}' para el producto '${productName}'. ` +
                  `Total requerido: ${quantity.toFixed(2)} ${unitAbbreviation}, disponible: ${sourceStock.toFixed(2)} ${unitAbbreviation}.`
                );
              }
            } catch (err) {
              // El microservicio devolvió un RpcException o hubo un fallo de red
              console.error('Error consultando stock para el producto:', err);

              throw new RpcException({
                message:
                  err?.message ??
                  `No se pudo obtener el stock para el producto ${productName} en la sucursal ${branchName}.`,
                statusCode: err?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
              });
            }
          }
        }

        if (errorsStock.length > 0) {
          throw new RpcException({
            message: errorsStock,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }



      // Validar branchId
      await firstValueFrom(
        this.natsClient.send('branches.validateIds', [originBranchId]).pipe(
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
            const stockPayload: { productId: string, locationType: 'BRANCH' | 'WAREHOUSE', updateId: string, quantity: number }[] = [];

            for (const [productId, totalQuantity] of Object.entries(productTotalQuantities)) {
              stockPayload.push({
                productId,
                updateId: originBranchId,
                quantity: -totalQuantity, // Descontar la cantidad
                locationType: 'BRANCH'
              });
            }

            // 6️⃣ Enviar la solicitud de creación o modificación de stock
            if (stockPayload.length > 0) {
              await firstValueFrom(
                this.natsClient.send('products.updateOrCreateStockLocations', stockPayload).pipe(
                  catchError(error => {
                    console.error('Error capturado en products.updateOrCreateStockLocations:', error);

                    // Lanzar RpcException con los datos del error
                    throw new RpcException({
                      message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
                      statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
                    });
                  })
                )
              );
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
    const { limit, page, status, originBranchId, orderBy, columnOrderBy, deliveryDate } = paginationDto;
    // Calcular el offset para la paginación
    const skip = limit ? (page - 1) * limit : undefined;
    try {
      // Normalizar la fecha para comparar solo por día
      let startUTC: Date | undefined;
      let endUTC: Date | undefined;

      if (deliveryDate) {
        startUTC = new Date(deliveryDate);
        endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000 - 1); // le sumamos 24 horas referenciando a un dia

      }
      const orders = await this.prisma.productionOrders.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        where: {
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { status: status }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
          ...((originBranchId) && { originBranchId }),
          // Filtro por fecha: Si `date` es proporcionado, lo usamos
          ...(startUTC && endUTC && {
            OR: [
              { deliveryDate: { gte: startUTC, lte: endUTC } },
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
                select: {
                  name: true,
                  description: true,
                  imageUrl: true,
                  slug: true,
                  isEnable: true,
                  preparationTime: true,
                  items: {
                    select: {
                      productId: true,
                      quantity: true,
                    }
                  }
                }
              },
              parallelGroup: {
                select: {
                  name: true,
                }
              },
            }
          },
          productionWaste: true
        },
      });

      const ordersAndUsers = [];
      for (const order of orders) {
        const updatedByUser = await firstValueFrom(
          this.natsClient.send('auth.user.findOne', order.updatedByUserId).pipe(
            catchError((error) => {
              console.error('Error fetching updatedByUser:', error);
              return of(null);
            })
          )
        );

        const createdByUser = await firstValueFrom(
          this.natsClient.send('auth.user.findOne', order.createdByUserId).pipe(
            catchError((error) => {
              console.error('Error fetching createdByUser:', error);
              return of(null);
            })
          )
        );

        const branch = await firstValueFrom(
          this.natsClient.send('findOneBranch', order.originBranchId).pipe(
            catchError((error) => {
              console.error('Error fetching findOneBranch:', error);
              return of(null);
            })
          )
        );

        let productionOrderDetailsAndRecipesAndProducts = [];
        for (const detail of order.productionOrderDetails) {
          let recipeAndProducts = [];

          for (const item of detail.recipe.items) {
            const product = await firstValueFrom(
              this.natsClient.send('findOneProduct', item.productId).pipe(
                catchError(error => {
                  console.error('Error capturado en findOneProduct:', error);
                  throw new RpcException({
                    message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
                    statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
                  });
                })
              )
            );

            recipeAndProducts.push({
              ...item,
              product: product ? {
                id: product.id,
                name: product.name,
                slug: product.slug,
                imageUrl: product.imageUrl,
                unit: {
                  name: product.unit.name,
                  abbreviation: product.unit.abbreviation,
                },
                isEnable: product.isEnable,
                // agrega aquí otros campos que necesites del producto
              } : null,
            });
          }

          productionOrderDetailsAndRecipesAndProducts.push({
            ...detail,
            recipe: {
              ...detail.recipe,
              items: recipeAndProducts
            }
          });
        }

        const productionOrderAndProductWaste = [];
        for (const waste of order.productionWaste) {
          const product = await firstValueFrom(
            this.natsClient.send('findOneProduct', waste.productId).pipe(
              catchError(error => {
                console.error('Error capturado en findOneProduct:', error);
                throw new RpcException({
                  message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
                  statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
                });
              })
            )
          );

          productionOrderAndProductWaste.push({
            ...waste,
            product: product ? {
              id: product.id,
              name: product.name,
              slug: product.slug,
              imageUrl: product.imageUrl,
              unit: {
                name: product.unit.name,
                abbreviation: product.unit.abbreviation,
              },
              isEnable: product.isEnable,
              // agrega aquí otros campos que necesites del producto
            } : null,
          });
        }

        ordersAndUsers.push({
          ...order,
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
          productionOrderDetails: productionOrderDetailsAndRecipesAndProducts,
          productionWaste: productionOrderAndProductWaste
        });
      }

      // Contar el total de productos que cumplen el filtro (sin paginación)
      const totalItems = await this.prisma.productionOrders.count({
        where: {
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { status: status }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
          ...((originBranchId) && { originBranchId }),
          // Filtro por fecha: Si `date` es proporcionado, lo usamos
          ...(startUTC && endUTC && {
            OR: [
              { deliveryDate: { gte: startUTC, lte: endUTC } },
              // { createdAt: { gte: startOfDay, lte: endOfDay } }
            ]
          })
        },
      });

      return {
        orders: ordersAndUsers,
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
      const existingProduction = await this.prisma.productionOrders.findUnique({
        where: { id },
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
        }
      });
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

      // Validar que los productId de canceled existan en la orden de producción
      if (
        updateProductionDto.productionWaste &&
        updateProductionDto.productionWaste.length > 0
      ) {
        // Obtener todos los productos de la orden de producción directamente de los detalles ya cargados
        const productsInOrder = new Set<string>();
        for (const detail of existingProduction.productionOrderDetails) {
          if (detail.recipe && detail.recipe.items) {
            detail.recipe.items.forEach(item => productsInOrder.add(item.productId));
          }
        }

        // Validar que todos los productId de canceled existan en productsInOrder
        const invalidCanceled = updateProductionDto.productionWaste.filter(
          waste => !productsInOrder.has(waste.productId)
        );
        if (invalidCanceled.length > 0) {
          throw new RpcException({
            message: `Los siguientes productos no existen en la orden de producción: ${invalidCanceled.map(w => w.productId).join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
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
                  deleteMany: { productionOrderId: id, },
                  create: updateProductionDto.productionOrderDetails
                }
              }),
              ...(updateProductionDto.productionWaste && updateProductionDto.productionWaste.length > 0) && {
                productionWaste: {
                  create: updateProductionDto.productionWaste
                }
              }
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

          if (updateProductionDto.status && (updateProductionDto.status === 'CANCELED' || updateProductionDto.status === 'COMPLETED')) {
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

                // 4️⃣ Acumular cantidades canceladas por producto
                const productWasteQuantities: Record<string, number> = {};
                if (updateProductionDto.productionWaste && updateProductionDto.productionWaste.length > 0) {
                  for (const waste of updateProductionDto.productionWaste) {
                    productWasteQuantities[waste.productId] = (productWasteQuantities[waste.productId] || 0) + Number(waste.quantity);
                  }
                }

                // 5️⃣ Crear las entradas de stock para actualizar, restando lo cancelado
                const stockPayload: { productId: string, locationType: 'BRANCH' | 'WAREHOUSE', updateId: string, quantity: number }[] = [];

                const errorsStock = [];

                for (const [productId, totalQuantity] of Object.entries(productTotalQuantities)) {
                  // Restar la cantidad de desperdicio (aplica para COMPLETED o CANCELED)
                  const wasteQuantity = productWasteQuantities[productId] || 0;
                  const finalQuantity = Number(totalQuantity) - wasteQuantity;

                  stockPayload.push({
                    productId,
                    updateId: orderProductionUpdated.originBranchId,
                    quantity: finalQuantity, // Ya restado lo cancelado
                    locationType: 'BRANCH'
                  });

                  if (wasteQuantity > 0) {
                    const originBranchId = orderProductionUpdated.originBranchId;
                    const verifyStockPayload = {
                      productId,
                      locationId: originBranchId,
                      locationType: 'BRANCH' as const,
                    };

                    // Verificar stock del almacén de origen mediante el microservicio products.getStock
                    let sourceStock = 0;
                    if (originBranchId) {
                      try {
                        sourceStock = Number(
                          await firstValueFrom(
                            this.natsClient.send('products.getStock', verifyStockPayload).pipe(
                              catchError((error) => {
                                console.error('Error fetching stock for branch:', error);
                                return of(0);
                              })
                            )
                          )
                        );
                      } catch (error) {
                        console.error('Error verificando stock:', error);
                        sourceStock = 0;
                      }
                    }

                    // errorsStock.push(totalQuantity.toString())
                    if ((sourceStock + (updateProductionDto.status === 'COMPLETED' ? 0 : totalQuantity)) < wasteQuantity) {
                      // Obtener branch y producto en paralelo
                      const [branch, product] = await Promise.all([
                        originBranchId
                          ? firstValueFrom(
                            this.natsClient.send('findOneBranch', originBranchId).pipe(
                              catchError((error) => {
                                console.error('Error fetching branch:', error);
                                return of(null);
                              })
                            )
                          )
                          : null,
                        productId
                          ? firstValueFrom(
                            this.natsClient.send('findOneProduct', productId).pipe(
                              catchError((error) => {
                                console.error('Error fetching product:', error);
                                return of(null);
                              })
                            )
                          )
                          : null,
                      ]);
                      errorsStock.push(
                        `No hay suficiente stock en la sucursal '${branch ? branch.name : originBranchId}' para el producto ${product ? product.name : productId}. Total: ${wasteQuantity.toFixed(2)}${product ? ' ' + product.unit.abbreviation : ''} Disponible: ${(sourceStock + (updateProductionDto.status === 'COMPLETED' ? 0 : totalQuantity)).toFixed(2)}${product ? ' ' + product.unit.abbreviation : ''}.`
                      );
                    }
                  }
                }
                if (errorsStock.length > 0) {
                  throw new RpcException({
                    message: errorsStock,
                    statusCode: HttpStatus.BAD_REQUEST,
                  });
                }

                // 6️⃣ Enviar la solicitud de creación o modificación de stock
                if (stockPayload.length > 0) {
                  await firstValueFrom(this.natsClient.send('products.updateOrCreateStockLocations', stockPayload).pipe(
                    catchError(error => {
                      console.error('Error capturado en products.updateOrCreateStockLocations:', error);

                      // Lanzar RpcException con los datos del error
                      throw new RpcException({
                        message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
                        statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
                      });
                    })
                  )
                  );
                }
              }
            } catch (error) {
              if (error instanceof RpcException) throw error;
              console.error('Error actualizando stock, revirtiendo...', error);

              throw new RpcException({
                message: 'Error en la actualización de stock, cambios revertidos.',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              });
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
        message: 'Orden de producción actualizada con éxito.',
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

  async getMonthlyProductionCounts(dto: ProductionMonthlySummaryDto) {
    try {
      const { originBranchId, createdByUserId, year: yyyy, month, startDate, endDate } = dto;

      // Helper: Inicializa las estadísticas por estado
      const initStatusCount = () => {
        return {
          PENDING: 0,
          IN_PROGRESS: 0,
          COMPLETED: 0,
          CANCELED: 0,
        };
      }

      // Validaciones remotas
      if (originBranchId) {
        await firstValueFrom(
          this.natsClient.send('branches.validateIds', [originBranchId]).pipe(
            catchError((error) => {
              console.error('Error al validar branchIds:', error);
              throw new RpcException({
                message: error?.message || 'Error al validar sucursal.',
                statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
              });
            })
          )
        );
      }

      if (createdByUserId) {
        await firstValueFrom(
          this.natsClient.send('auth.user.findOne', createdByUserId).pipe(
            catchError((error) => {
              console.error('Error al validar usuario:', error);
              throw new RpcException({
                message: error?.message || 'Error al validar usuario.',
                statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
              });
            })
          )
        );
      }

      const year = yyyy || new Date().getFullYear();
      let gte: Date;
      let lt: Date;

      if (startDate && endDate) {
        gte = new Date(startDate);
        lt = new Date(endDate);
        lt.setDate(lt.getDate() + 1); // incluir el día de endDate
      } else if (month) {
        // Si se especifica mes (1-12), usar ese mes del año
        gte = new Date(Date.UTC(year, month - 1, 1));
        lt = new Date(Date.UTC(year, month, 1));
      } else {
        // Año completo
        gte = new Date(Date.UTC(year, 0, 1));
        lt = new Date(Date.UTC(year + 1, 0, 1));
      }

      const where: any = {
        createdAt: {
          gte,
          lt,
        },
      };

      if (originBranchId) where.originBranchId = originBranchId;
      if (createdByUserId) where.createdByUserId = createdByUserId;

      const orders = await this.prisma.productionOrders.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
        },
      });

      const monthCounts: Record<string, Record<string, number>> = {
        "Enero": initStatusCount(),
        "Febrero": initStatusCount(),
        "Marzo": initStatusCount(),
        "Abril": initStatusCount(),
        "Mayo": initStatusCount(),
        "Junio": initStatusCount(),
        "Julio": initStatusCount(),
        "Agosto": initStatusCount(),
        "Septiembre": initStatusCount(),
        "Octubre": initStatusCount(),
        "Noviembre": initStatusCount(),
        "Diciembre": initStatusCount(),
      };

      const monthNames = Object.keys(monthCounts);

      for (const order of orders) {
        const monthIndex = order.createdAt.getUTCMonth();
        const monthName = monthNames[monthIndex];
        const orderStatus = order.status;

        if (monthCounts[monthName][orderStatus] !== undefined) {
          monthCounts[monthName][orderStatus]++;
        }
      }

      return monthCounts;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.error('Error en getMonthlyProductionCounts:', error);
      throw new RpcException({
        message: 'Error al obtener el resumen mensual de ordenes de producción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }






  async countProductionOrders(dto: CountOrdersDto) {
    const { originBranchId, status, date, month, year, startDate, endDate } = dto;
    try {
      if (originBranchId) {
        await firstValueFrom(
          this.natsClient.send('branches.validateIds', [originBranchId]).pipe(
            catchError((error) => {
              console.error('Error al validar branchIds:', error);
              throw new RpcException({
                message: error?.message || 'Error desconocido al comunicarse con el microservicio.',
                statusCode: error?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
              });
            })
          )
        );
      }

      const where: any = {};

      if (originBranchId) where.originBranchId = originBranchId;
      if (status && status !== 'all') where.status = status;

      // 1. Filtro por día exacto
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        where.deliveryDate = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      // 2. Filtro por mes y año
      else if (month) {
        const selectedYear = year || new Date().getFullYear();
        const startOfMonth = new Date(selectedYear, month - 1, 1, 0, 0, 0, 0);
        const endOfMonth = new Date(selectedYear, month, 0, 23, 59, 59, 999);

        where.deliveryDate = {
          gte: startOfMonth,
          lte: endOfMonth,
        };
      }

      // 3. Filtro por intervalo de fechas
      else if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        where.deliveryDate = {
          gte: start,
          lte: end,
        };
      }

      // 4. Filtro por año (solo si no se usó nada más)
      else if (year) {
        const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
        const endOfYear = new Date(year + 1, 0, 1, 0, 0, 0, 0);

        where.deliveryDate = {
          gte: startOfYear,
          lt: endOfYear,
        };
      }

      const totalItems = await this.prisma.productionOrders.count({ where });

      return {
        totalItems,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log('Error al obtener la lista de ordenes:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de Ordenes.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }
}
