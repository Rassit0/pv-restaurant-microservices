import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { UpdateInventoryMovementDto } from './dto/update-inventory-movement.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { NATS_SERVICE } from 'src/config';
import { AdjustmentType, DeliveryStatus, StatusInventoryMovement } from '@prisma/client';
import { MovementsPaginationDto } from './dto/movements-pagination';
import { ChangeStatusDto } from './dto/change-status-movement.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MovementsService {
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

  // async verifyStockForMovement(type: string, productId: string, stockData: any, adjustmentType?: AdjustmentType): Promise<void> {
  //   const { quantity, destinationWarehouseId, destinationBranchId, originBranchId, originWarehouseId } = stockData;

  //   // Si es un ajuste, debe tener un tipo de ajuste definido
  //   if (type === 'ADJUSTMENT' && !adjustmentType) {
  //     throw new RpcException({
  //       message: 'Para una transacción de ajuste, se debe especificar el tipo de Ajuste.',
  //       statusCode: HttpStatus.BAD_REQUEST,
  //     });
  //   }

  //   // Si es un ajuste con tipo 'INCOME' o 'OUTCOME', tratarlo como tal
  //   if (type === 'ADJUSTMENT') {
  //     type = adjustmentType as string; // Convertir a 'INCOME' o 'OUTCOME'
  //   }

  //   switch (type) {
  //     case 'INCOME':
  //       if (!destinationBranchId && !destinationWarehouseId) {
  //         throw new RpcException({
  //           message: 'Para una entrada, se debe especificar un almacén o sucursal de destino.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }

  //       if (originBranchId || originWarehouseId) {
  //         throw new RpcException({
  //           message: 'No se debe especificar un origen para las entradas.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }
  //       break;
  //     case 'OUTCOME':
  //       // Al menos uno de los dos (originBranchId u originWarehouseId) debe estar presente.
  //       if (!originBranchId && !originWarehouseId) {
  //         throw new RpcException({
  //           message: 'Las salidas deben realizarse desde una sucursal o almacén de origen.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }
  //       // Validamos que no se haya especificado un destino (ni branchId ni warehouseId)
  //       if (destinationBranchId || destinationWarehouseId) {
  //         throw new RpcException({
  //           message: 'No se debe especificar un destino para las salidas. Las salidas solo ocurren desde una sucursal o almacén de origen.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }

  //       // Verificación del stock en la sucursal o almacén de origen
  //       const availableStock = await this.handleRpcError(
  //         this.natsClient.send(
  //           originWarehouseId ? 'products.verifyStockWarehouse' : 'products.verifyStockBranch', // retorna un 0 si no existe el id
  //           {
  //             productId,
  //             ...(originWarehouseId ? { warehouseId: originWarehouseId } : {}),
  //             ...(originBranchId ? { branchId: originBranchId } : {}),
  //           }
  //         )
  //       );

  //       if (parseFloat(availableStock) < parseFloat(quantity)) {
  //         throw new RpcException({
  //           message: `No hay suficiente stock en la sucursal de origen ${originBranchId} para el producto con ID ${productId}.`,
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }
  //       break;
  //     case 'TRANSFER':
  //       if (!originBranchId && !originWarehouseId) {
  //         throw new RpcException({
  //           message: 'Para una transferencia, se debe especificar un almacén o sucursal de origen.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }

  //       if (originBranchId && originBranchId === destinationBranchId) {
  //         throw new RpcException({
  //           message: 'No se puede transferir stock dentro de la misma sucursal.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }

  //       if (originWarehouseId && originWarehouseId === destinationWarehouseId) {
  //         throw new RpcException({
  //           message: 'No se puede transferir stock dentro del mismo almacén.',
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }

  //       const sourceStock = await this.handleRpcError(
  //         this.natsClient.send(
  //           originWarehouseId ? 'products.verifyStockWarehouse' : 'products.verifyStockBranch',
  //           {
  //             productId,
  //             ...(originWarehouseId ? { warehouseId: originWarehouseId } : {}),
  //             ...(originBranchId ? { branchId: originBranchId } : {}),
  //           }
  //         )
  //       );

  //       if (parseFloat(sourceStock) < parseFloat(quantity)) {
  //         const branch = originBranchId ? await firstValueFrom(
  //           this.natsClient.send('findOneBranch', originBranchId).pipe(
  //             catchError((error) => {
  //               console.error('Error fetching branch:', error);
  //               return of(null);
  //             })
  //           )
  //         ) : null;
  //         const warehouse = originWarehouseId ? await firstValueFrom(
  //           this.natsClient.send('findOneWarehouse', originWarehouseId).pipe(
  //             catchError((error) => {
  //               console.error('Error fetching warehouse:', error);
  //               return of(null);
  //             })
  //           )
  //         ) : null;
  //         const product = productId ? await firstValueFrom(
  //           this.natsClient.send('findOneProduct', productId).pipe(
  //             catchError((error) => {
  //               console.error('Error fetching product:', error);
  //               return of(null);
  //             })
  //           )
  //         ) : null;
  //         throw new RpcException({
  //           message: `No hay suficiente stock en el ${originWarehouseId ? 'almacén' : 'sucursal'
  //             } ${(warehouse ? warehouse.name : originWarehouseId) || (branch ? branch.name : originBranchId)} para transferir el producto ${product ? product.name : productId}.`,
  //           statusCode: HttpStatus.BAD_REQUEST,
  //         });
  //       }
  //       break;

  //     default:
  //       throw new RpcException({
  //         message: `Tipo de movimiento no válido: ${type}.`,
  //         statusCode: HttpStatus.BAD_REQUEST,
  //       });
  //   }

  // }

  async create(createMovementDto: CreateInventoryMovementDto) {
    enum InventoryMovementType {
      INCOME = 'INCOME',
      OUTCOME = 'OUTCOME',
      TRANSFER = 'TRANSFER',
      ADJUSTMENT = 'ADJUSTMENT',
    }
    // Validar que haya un origen y destino dependiendo del tipo
    const errors = [];
    // Validar que originBranchId no sea igual a destinationBranchId
    if (
      createMovementDto.originBranchId &&
      createMovementDto.destinationBranchId &&
      createMovementDto.originBranchId === createMovementDto.destinationBranchId
    ) {
      errors.push('El origen y el destino no pueden ser la misma sucursal (originBranchId y destinationBranchId).');
    }

    // Validar que originWarehouseId no sea igual a destinationWarehouseId
    if (
      createMovementDto.originWarehouseId &&
      createMovementDto.destinationWarehouseId &&
      createMovementDto.originWarehouseId === createMovementDto.destinationWarehouseId
    ) {
      errors.push('El origen y el destino no pueden ser el mismo almacén (originWarehouseId y destinationWarehouseId).');
    }

    if ((createMovementDto.movementType === InventoryMovementType.OUTCOME ||
      createMovementDto.movementType === InventoryMovementType.ADJUSTMENT && createMovementDto.adjustment.adjustmentType === AdjustmentType.OUTCOME) &&
      !createMovementDto.originBranchId && !createMovementDto.originWarehouseId) {
      errors.push(`Debe ingresar un id de origen (originBranchId o originWarehouseId).`);
    }

    if ((createMovementDto.movementType === InventoryMovementType.INCOME ||
      createMovementDto.movementType === InventoryMovementType.ADJUSTMENT && createMovementDto.adjustment.adjustmentType === AdjustmentType.INCOME) &&
      !createMovementDto.destinationBranchId && !createMovementDto.destinationWarehouseId) {
      errors.push(`Debe ingresar un id de de destino (destinationBranchId u destinationWarehouseId).`);
    }

    if (createMovementDto.movementType === InventoryMovementType.TRANSFER) {
      if (!createMovementDto.originBranchId && !createMovementDto.originWarehouseId) {
        errors.push('Debe ingresar un id de origen (originBranchId o originWarehouseId).');
      }
      if (!createMovementDto.destinationBranchId && !createMovementDto.destinationWarehouseId) {
        errors.push('Debe ingresar un id de de destino (destinationBranchId o destinationWarehouseId).');
      }
    }

    if (!createMovementDto.suppliers && !createMovementDto.deliveryManagers) {
      errors.push('Debe ingresar el campo suppliers o deliveryManagers (o ambos).');
    }

    const deliveryManagersAndNames: { id: string, name: string }[] = createMovementDto.deliveryManagers ?
      await Promise.all(
        createMovementDto.deliveryManagers.map(async (manager) => {
          try {
            const managerResponse = await firstValueFrom(
              this.natsClient.send('findOnePerson', manager.id).pipe(
                catchError((error) => {
                  // console.error('Error fetching createdByUser:', error);
                  errors.push(`No se encontro el deliveryManager con id: ${manager.id}`);
                  return of(null);
                })
              )
            );
            return managerResponse ? { id: managerResponse.id, name: managerResponse.name } : null; // Retorna el nombre si el usuario existe
          } catch (error) {
            console.error('Error fetching (deliveryManager):', error);
            return null; // Retorna null si ocurre un error
          }
        })
      ).then((results) => results.filter((result) => result !== null))
      : []; // Filtra los valores nulos

    const suppliersAndNames: { id: string, name: string }[] = createMovementDto.suppliers ?
      await Promise.all(
        createMovementDto.suppliers.map(async (supplier) => {
          try {
            const supplierResponse = await firstValueFrom(
              this.natsClient.send('findOneSupplier', supplier.id).pipe(
                catchError((error) => {
                  // console.error('Error fetching createdByUser:', error);
                  errors.push(`No se encontro el (supplier) con id: ${supplier.id}`);
                  return of(null);
                })
              )
            );
            return supplierResponse ? { id: supplierResponse.id, name: supplierResponse.name } : null; // Retorna el nombre si el usuario existe
          } catch (error) {
            console.error('Error fetching delivery manager:', error);
            return null; // Retorna null si ocurre un error
          }
        })
      ).then((results) => results.filter((result) => result !== null))
      : []; // Filtra los valores nulos

    if (errors.length > 0) {
      throw new RpcException({
        message: errors,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Realizar la creación del movimiento
    try {
      const { inventoryMovementDetails, suppliers, deliveryManagers, movementType, adjustment, description, ...data } = createMovementDto;
      if (!data.deliveryDate && movementType !== 'OUTCOME') {
        throw new RpcException({
          message: `La fecha de ingreso es requerida.`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      // Obtener los IDs únicos de sucursales y almacenes
      const branchIds = [createMovementDto.originBranchId, createMovementDto.destinationBranchId].filter(Boolean);
      const warehouseIds = [createMovementDto.originWarehouseId, createMovementDto.destinationWarehouseId].filter(Boolean);
      const productIds: Set<string> = new Set();
      const seenProductIds = new Set();

      const stockUpdates: { productId: string, originBranchId?: string, originWarehouseId?: string, destinationBranchId?: string, destinationWarehouseId?: string, quantity: number }[] = [];
      if (inventoryMovementDetails) {
        for (const detail of inventoryMovementDetails) {
          const { productId } = detail;

          stockUpdates.push({
            productId,
            originWarehouseId: createMovementDto.originWarehouseId ?? undefined,
            originBranchId: createMovementDto.originBranchId ?? undefined,
            ...(createMovementDto.destinationBranchId ? { destinationBranchId: createMovementDto.destinationBranchId } : { destinationWarehouseId: createMovementDto.destinationWarehouseId }),
            quantity: parseFloat(detail.expectedQuantity),
          });

          if (seenProductIds.has(productId)) {
            throw new RpcException({
              message: `El producto con ID ${productId} ya está asignado al detalle. Verifique los detalles del movimiento.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }

          seenProductIds.add(productId);
          productIds.add(productId);
        }

        // Valida que existan los ids haciendo solicitudes a los microservicios
        await Promise.all([
          branchIds.length > 0 ? this.handleRpcError(this.natsClient.send('branches.validateIds', Array.from(branchIds))) : Promise.resolve(),
          warehouseIds.length > 0 ? this.handleRpcError(this.natsClient.send('warehouses.validateIds', Array.from(warehouseIds))) : Promise.resolve(),
          productIds.size > 0 ? this.handleRpcError(this.natsClient.send('products.validateIds', Array.from(productIds))) : Promise.resolve(),
        ]);

      }

      if (inventoryMovementDetails) {
        for (const detail of inventoryMovementDetails) {
          const { productId, expectedQuantity } = detail;

          const product = await firstValueFrom(
            this.natsClient.send('findOneProduct', productId).pipe(
              catchError((error) => {
                console.error('Error fetching product:', error);
                return of(null);
              })
            )
          );

          if (createMovementDto.originWarehouseId) {
            // await this.verifyStockForMovement(movementType, productId, warehouseStock, adjustmentType);
            const sourceStock = await this.handleRpcError(
              this.natsClient.send(
                'products.verifyStockWarehouse',
                {
                  productId,
                  warehouseId: createMovementDto.originWarehouseId,
                }
              )
            );

            if (parseFloat(sourceStock) < parseFloat(expectedQuantity)) {
              const warehouse = await firstValueFrom(
                this.natsClient.send('findOneWarehouse', createMovementDto.originWarehouseId).pipe(
                  catchError((error) => {
                    console.error('Error fetching warehouse:', error);
                    return of(null);
                  })
                )
              );
              throw new RpcException({
                message: `No hay suficiente stock en el almacén ${(warehouse ? warehouse.name : createMovementDto.originWarehouseId)} para transferir el producto ${product ? product.name : productId}. Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${parseFloat(expectedQuantity)}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }

          if (createMovementDto.originBranchId) {
            // await this.verifyStockForMovement(movementType, productId, branchStock, adjustmentType);
            const sourceStock = await this.handleRpcError(
              this.natsClient.send(
                'products.verifyStockBranch',
                {
                  productId,
                  branchId: createMovementDto.originBranchId,
                }
              )
            );

            if (parseFloat(sourceStock) < parseFloat(expectedQuantity)) {
              const branch = await firstValueFrom(
                this.natsClient.send('findOneBranch', createMovementDto.originBranchId).pipe(
                  catchError((error) => {
                    console.error('Error fetching branch:', error);
                    return of(null);
                  })
                )
              );

              throw new RpcException({
                message: `No hay suficiente stock en la sucursal ${(branch ? branch.name : createMovementDto.originWarehouseId)} para transferir el producto ${product ? product.name : productId}. Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${parseFloat(expectedQuantity)}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }
        }
      }

      const createdMovement = await this.prisma.$transaction(async (prisma) => {
        const newMovement = await prisma.inventoryMovement.create({
          data: {
            ...data,
            movementType,
            adjustment: {
              create: adjustment
            },
            ...(movementType === InventoryMovementType.ADJUSTMENT && adjustment && {
              adjustment: {
                create: adjustment
              }
            }),
            ...(movementType === InventoryMovementType.TRANSFER && {
              transfer: {
                create: {}
              }
            }),
            ...(movementType === InventoryMovementType.INCOME && {
              income: {
                create: {}
              }
            }),
            ...(movementType === InventoryMovementType.OUTCOME && {
              outcome: {
                create: {}
              }
            }),
            description,
            // adjustmentType,
            inventoryMovementDetails: {
              create: inventoryMovementDetails.map((detail) => ({
                productId: detail.productId,
                unit: detail.unit,
                expectedQuantity: detail.expectedQuantity,
                deliveredQuantity: detail.expectedQuantity,
              })),
            },
            ...(suppliers && {
              suppliers: {
                create: suppliers.map(supplier => ({
                  supplierId: supplier.id
                }))
              }
            }),
            ...(deliveryManagers && {
              deliveryManagers: {
                create: deliveryManagers.map(manager => ({
                  deliveryManagerId: manager.id
                }))
              }
            }),
          },
          include: {
            inventoryMovementDetails: true,
            adjustment: true,
            deliveryManagers: true,
            suppliers: true,
          },
        });

        try {
          // Procesar actualización de stock en almacenes
          if (stockUpdates.length > 0 && newMovement.status === 'COMPLETED') {
            const stockData: { productId: string, updateId: string, quantity: number, branchOrWarehouse: 'WAREHOUSE' | 'BRANCH' }[] = [];

            stockUpdates.forEach(stock => {
              // Descontar stock de almacén de Origen
              if (stock.originWarehouseId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.originWarehouseId,
                  quantity: -stock.quantity,
                  branchOrWarehouse: 'WAREHOUSE'
                });
              }
              // Descontar stock de Sucursal de origen
              if (stock.originBranchId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.originBranchId,
                  quantity: -stock.quantity,
                  branchOrWarehouse: 'BRANCH'
                });
              }

              // Sumar stock a Almacén de destino
              if (stock.destinationWarehouseId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.destinationWarehouseId,
                  quantity: stock.quantity,
                  branchOrWarehouse: 'WAREHOUSE'
                });
              }

              if (stock.destinationBranchId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.destinationBranchId,
                  quantity: stock.quantity,
                  branchOrWarehouse: 'BRANCH'
                });
              }
            });

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

        // Obtener los IDs únicos de sucursales y almacenes
        const branchIds = [newMovement.originBranchId, newMovement.destinationBranchId].filter(Boolean);
        const warehouseIds = [newMovement.originWarehouseId, newMovement.destinationWarehouseId].filter(Boolean);

        // Consultar branches y warehouses solo si hay IDs
        const branches = branchIds.length > 0
          ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
          : [];

        const warehouses = warehouseIds.length > 0
          ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
          : [];
        // Mapear la respuesta para incluir los datos de branches y warehouses
        const movementsWithDetailsAndBranchAndWarehouseAndSuppliersAndDeliveryMangers = {
          ...newMovement,
          originBranch: branches.find(b => b.id === newMovement.originBranchId)?.name ?? null,
          destinationBranch: branches.find(b => b.id === newMovement.destinationBranchId)?.name ?? null,
          originWarehouse: warehouses.find(b => b.id === newMovement.originWarehouseId)?.name ?? null,
          destinationWarehouse: warehouses.find(b => b.id === newMovement.destinationWarehouseId)?.name ?? null,
          suppliers: suppliersAndNames,
          deliveryManagers: deliveryManagersAndNames,
        };

        return movementsWithDetailsAndBranchAndWarehouseAndSuppliersAndDeliveryMangers;
      });

      const updatedByUser = createdMovement.updatedByUserId ? await firstValueFrom(
        this.natsClient.send('auth.user.findOne', createdMovement.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      ) : null;

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', createdMovement.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );
      return {
        ...createdMovement,
        createdByUser: {
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedByUser: updatedByUser ? {
          name: updatedByUser.name,
          email: updatedByUser.email,
        } : null,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al registrar el movimiento.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async findAll(paginationDto: MovementsPaginationDto) {
    try {
      const { limit, page, status, orderBy, columnOrderBy, endDate, startDate, movementType } = paginationDto;

      const skip = limit ? (page - 1) * limit : undefined;

      // Asegurar que status sea un array válido
      const statusArray = status ? (Array.isArray(status) ? status : [status]) : [];

      // Asegurar que status sea un array válido
      const movementArray = movementType ? (Array.isArray(movementType) ? movementType : [movementType]) : [];

      const whereFilters = {
        AND: [
          statusArray.length > 0 ? { status: { in: statusArray } } : {},
          movementArray.length > 0 ? { movementType: { in: movementArray } } : {},
          (startDate || endDate)
            ? {
              createdAt: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
            : {},
        ],
      };

      const movements = await this.prisma.inventoryMovement.findMany({
        skip,
        take: limit || undefined,
        orderBy: { [columnOrderBy]: orderBy },
        where: whereFilters,
        include: {
          inventoryMovementDetails: true,
          adjustment: true,
          deliveryManagers: true,
          suppliers: true,
        }
      });

      // Obtener los IDs únicos de sucursales y almacenes
      const branchIds = [
        ...new Set(movements.flatMap(w => w.destinationBranchId)),
        ...new Set(movements.flatMap(w => w.originBranchId)),
      ].filter(Boolean); // Filtrar valores `undefined` o `null`

      const warehouseIds = [
        ...new Set(movements.flatMap(w => w.destinationWarehouseId)),
        ...new Set(movements.flatMap(w => w.originWarehouseId)),
        // ...new Set(movements.flatMap(w => w.inventoryMovementDetails.map(b => b.originWarehouseId))),
      ].filter(Boolean);

      // Consultar branches y warehouses solo si hay IDs
      const branches = branchIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
        : [];

      const warehouses = warehouseIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
        : [];

      // Contar el total de transacciones con el mismo filtro
      const totalItems = await this.prisma.inventoryMovement.count({
        where: whereFilters,
      });

      // Mapear la respuesta: anidal los datos de las sucursales a cada almacén
      const movementsWithBranchesAndWarehousesAndUsers = await Promise.all(
        movements.map(async (movement) => {
          const updatedByUser = movement.updatedByUserId ? await firstValueFrom(
            this.natsClient.send('auth.user.findOne', movement.updatedByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching updatedByUser:', error);
                return of(null);
              })
            )
          ) : null;

          const createdByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', movement.createdByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching createdByUser:', error);
                return of(null);
              })
            )
          );

          const detailsAndProducts = await Promise.all(
            movement.inventoryMovementDetails.map(async i => {
              const product = await firstValueFrom(
                this.natsClient.send('findOneProduct', i.productId).pipe(
                  catchError((error) => {
                    console.error('Error fetching createdByUser:', error);
                    return of(null);
                  })
                )
              );
              return {
                ...i,
                product: product ? {
                  name: product.name,
                  imageUrl: product.imageUrl,
                } : null
              };
            })
          );


          return {
            ...movement,
            originWarehouse: warehouses.find(w => w.id === movement.originWarehouseId)
              ? { name: warehouses.find(w => w.id === movement.originWarehouseId).name }
              : null,
            originBranch: branches.find(b => b.id === movement.originBranchId)
              ? { name: branches.find(b => b.id === movement.originBranchId).name }
              : null,
            destinationWarehouse: warehouses.find(w => w.id === movement.destinationWarehouseId)
              ? { name: warehouses.find(w => w.id === movement.destinationWarehouseId).name }
              : null,
            destinationBranch: warehouses.find(w => w.id === movement.destinationBranchId)
              ? { name: warehouses.find(w => w.id === movement.destinationBranchId).name }
              : null,
            inventoryMovementDetails: detailsAndProducts,
            createdByUser: {
              name: createdByUser.name,
              email: createdByUser.email,
            },
            updatedByUser: updatedByUser ? {
              name: updatedByUser.name,
              email: updatedByUser.email,
            } : null,
          };
        })
      );

      return {
        movements: movementsWithBranchesAndWarehousesAndUsers,
        meta: {
          totalItems,
          itemsPerPage: limit || totalItems,
          totalPages: limit ? Math.ceil(totalItems / limit) : 1,
          currentPage: page,
        }
      };
    } catch (error) {
      console.error('Error en findAll:', error);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: 'No se pudo obtener las transacciones',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }


  findOne(id: string) {
    return `This action returns a #${id} inventory`;
  }

  update(id: string, updateInventoryDto: UpdateInventoryMovementDto) {
    return `This action updates a #${id} inventory`;
  }

  private determineDeliveredQuantity(expected: Decimal, deliveryStatus: DeliveryStatus, inputQuantity?: Decimal): Decimal | undefined {
    switch (deliveryStatus) {
      case DeliveryStatus.PENDING:
      case DeliveryStatus.NOT_DELIVERED:
        return undefined;
      case DeliveryStatus.PARTIAL:
      case DeliveryStatus.OVER_DELIVERED:
        return inputQuantity;
      case DeliveryStatus.COMPLETE:
        return expected;
      default:
        return expected;
    }
  }

  async changeStatus(id: string, changeStatusDto: ChangeStatusDto) {
    try {
      const movementExists = await this.prisma.inventoryMovement.findUnique({
        where: { id },
        include: {
          inventoryMovementDetails: true,
          adjustment: true,
        }
      })
      if (!movementExists) {
        throw new RpcException({
          message: "Movimietno no encontrado",
          statusCode: HttpStatus.BAD_REQUEST // Envia el codigo 400
        });
      }

      // Verificar si el status ya está en COMPLETED
      if (movementExists.status === StatusInventoryMovement.COMPLETED) {
        throw new RpcException({
          message: "La movimiento ya está completado y no puede modificarse",
          statusCode: HttpStatus.BAD_REQUEST, // Envía el código 400
        });
      }

      if (movementExists.status === StatusInventoryMovement.CANCELED) {
        throw new RpcException({
          message: "El movimiento ya está cancelado y no puede modificarse",
          statusCode: HttpStatus.BAD_REQUEST, // Envía el código 400
        });
      }

      if (movementExists.inventoryMovementDetails) {
        // Extraer los id de ambos arreglos
        const existingDetailIds = new Set(
          movementExists.inventoryMovementDetails.map((detail) => detail.id)
        );
        const newDetailIds = new Set(
          changeStatusDto.inventoryMovementDetails.map((detail) => detail.id)
        );

        // Verificar si todos los id de changeStatusDto están en movementExists
        const missingDetailIds = Array.from(newDetailIds).filter(
          (id) => !existingDetailIds.has(id)
        );

        if (missingDetailIds.length > 0) {
          throw new RpcException({
            message: `Los siguientes detalles no están en el movimiento existente: ${missingDetailIds.join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      if (movementExists) {
        for (const detail of changeStatusDto.inventoryMovementDetails) {
          const { originBranchId, originWarehouseId } = movementExists;

          const { productId } = detail;

          const product = await firstValueFrom(
            this.natsClient.send('findOneProduct', productId).pipe(
              catchError((error) => {
                console.error('Error fetching product:', error);
                return of(null);
              })
            )
          );

          const expectedQuantity = movementExists.inventoryMovementDetails.find(d => d.id === detail.id).expectedQuantity
          // Determinar deliveredQuantity basado en deliveryStatus
          let deliveredQuantity: Decimal | undefined = this.determineDeliveredQuantity(expectedQuantity, detail.deliveryStatus, new Decimal(detail.deliveredQuantity));

          if (originWarehouseId && deliveredQuantity) {
            // await this.verifyStockForMovement(movementType, productId, warehouseStock, adjustmentType);
            const sourceStock = await this.handleRpcError(
              this.natsClient.send(
                'products.verifyStockWarehouse',
                {
                  productId,
                  warehouseId: movementExists.originWarehouseId,
                }
              )
            );

            // Verifica si el stock es menor al esperado
            if (new Decimal(sourceStock).lessThan(deliveredQuantity)) {
              const warehouse = await firstValueFrom(
                this.natsClient.send('findOneWarehouse', movementExists.originWarehouseId).pipe(
                  catchError((error) => {
                    console.error('Error fetching warehouse:', error);
                    return of(null);
                  })
                )
              );
              throw new RpcException({
                message: `No hay suficiente stock en el almacén ${(warehouse ? warehouse.name : movementExists.originWarehouseId)} para transferir el producto ${product ? product.name : productId}. Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${deliveredQuantity}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }

          if (originBranchId && deliveredQuantity) {
            // await this.verifyStockForMovement(movementType, productId, branchStock, adjustmentType);
            const sourceStock = await this.handleRpcError(
              this.natsClient.send(
                'products.verifyStockBranch',
                {
                  productId,
                  branchId: movementExists.originBranchId,
                }
              )
            );

            if (new Decimal(sourceStock).lessThan(deliveredQuantity)) {
              const branch = await firstValueFrom(
                this.natsClient.send('findOneBranch', movementExists.originBranchId).pipe(
                  catchError((error) => {
                    console.error('Error fetching branch:', error);
                    return of(null);
                  })
                )
              );

              throw new RpcException({
                message: `No hay suficiente stock en la sucursal ${(branch ? branch.name : movementExists.originWarehouseId)} para transferir el producto ${product ? product.name : productId}. Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${deliveredQuantity}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }
        }
      }

      const updateMovement = await this.prisma.inventoryMovement.update({
        where: { id },
        data: {
          status: changeStatusDto.status,
          updatedByUserId: changeStatusDto.updatedByUserId,
          inventoryMovementDetails: {
            updateMany: changeStatusDto.inventoryMovementDetails.map((detail) => {
              const expectedQuantity = movementExists.inventoryMovementDetails.find(d => d.id === detail.id).expectedQuantity
              // Determinar deliveredQuantity basado en deliveryStatus
              let deliveredQuantity: Decimal | undefined = this.determineDeliveredQuantity(expectedQuantity, detail.deliveryStatus, new Decimal(detail.deliveredQuantity));

              return {
                where: { id: detail.id }, // Busca el detalle por su ID
                data: {
                  productId: detail.productId,
                  deliveredQuantity,
                  deliveryStatus: detail.deliveryStatus,
                },
              }
            }),
          },
        },
        include: {
          inventoryMovementDetails: true,
          adjustment: true,
          deliveryManagers: true,
          suppliers: true,
        }
      })

      try {
        // Actualizar stock
        updateMovement.inventoryMovementDetails.forEach(detail => {
          // const { branchStock, warehouseStock } = detail;
          // Procesar actualización de stock en almacenes
          const stockData = [];

          if (detail.deliveredQuantity) {
            if (updateMovement.originWarehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: updateMovement.originWarehouseId,
                quantity: -detail.deliveredQuantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }
            if (updateMovement.originBranchId) {
              stockData.push({
                productId: detail.productId,
                updateId: updateMovement.originBranchId,
                quantity: -detail.deliveredQuantity,
                branchOrWarehouse: 'BRANCH'
              });
            }
            if (updateMovement.destinationWarehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: updateMovement.destinationWarehouseId,
                quantity: detail.deliveredQuantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }
            if (updateMovement.destinationBranchId) {
              stockData.push({
                productId: detail.productId,
                updateId: updateMovement.destinationBranchId,
                quantity: detail.deliveredQuantity,
                branchOrWarehouse: 'BRANCH'
              });
            }

            if (stockData.length > 0) {
              this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
            }
          }
          // Procesar actualización de stock en sucursales

        })
      } catch (error) {
        if (error instanceof RpcException) throw error;
        console.log(error);
        throw new RpcException({
          message: 'Error al registrar la transacción.',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      // Obtener los IDs únicos de sucursales y almacenes
      const branchIds = [updateMovement.originBranchId, updateMovement.destinationBranchId].filter(Boolean);
      const warehouseIds = [updateMovement.originWarehouseId, updateMovement.destinationWarehouseId].filter(Boolean);


      // Consultar branches y warehouses solo si hay IDs
      const branches = branchIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
        : [];

      const warehouses = warehouseIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
        : [];

      const updateMovementWithBranchesAndWarehouses = {
        ...updateMovement,
        originBranch: branches.find(b => b.id === updateMovement.originBranchId)
          ? { name: branches.find(b => b.id === updateMovement.originBranchId).name }
          : null,
        originWarehouse: warehouses.find(w => w.id === updateMovement.originWarehouseId)
          ? { name: warehouses.find(w => w.id === updateMovement.originWarehouseId).name }
          : null,
        destinationBranch: branches.find(b => b.id === updateMovement.destinationBranchId)
          ? { name: branches.find(b => b.id === updateMovement.destinationBranchId).name }
          : null,
        destinationWarehouse: warehouses.find(b => b.id === updateMovement.destinationWarehouseId)
          ? { name: warehouses.find(b => b.id === updateMovement.destinationWarehouseId).name }
          : null,
      }

      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', updateMovement.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', updateMovement.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      return {
        message: "Movimiento actualizado con éxito",
        product: {
          ...updateMovementWithBranchesAndWarehouses,
          createdByUser: {
            name: createdByUser.name,
            email: createdByUser.email,
          },
          updatedByUser: updatedByUser ? {
            name: updatedByUser.name,
            email: updatedByUser.email,
          } : null,
        }
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al registrar la transacción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  remove(id: string) {
    return `This action removes a #${id} inventory`;
  }
}