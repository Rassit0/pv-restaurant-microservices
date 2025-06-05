import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { UpdateInventoryMovementDto } from './dto/update-inventory-movement.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { NATS_SERVICE } from 'src/config';
import { AdjustmentType, DeliveryStatus, InventoryMovementType, StatusInventoryMovement } from '@prisma/client';
import { MovementsPaginationDto } from './dto/movements-pagination';
import { UpdateDetailsAndStatusDto } from './dto/change-status-movement.dto';
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

  async create(createMovementDto: CreateInventoryMovementDto) {
    enum InventoryMovementType {
      INCOME = 'INCOME',
      OUTCOME = 'OUTCOME',
      TRANSFER = 'TRANSFER',
      ADJUSTMENT = 'ADJUSTMENT',
    }
    // Validar que no haya productIds duplicados en el DTO
    if (createMovementDto.inventoryMovementDetails) {
      const productIds = createMovementDto.inventoryMovementDetails.map(detail => detail.productId);
      const duplicates = productIds.filter((id, idx) => productIds.indexOf(id) !== idx);
      if (duplicates.length > 0) {
        throw new RpcException({
          message: `inventoryMovementDetails: No puede enviar productId(s) duplicados: ${[...new Set(duplicates)].join(', ')}`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }
    }
    // Validar que no haya suppliers duplicados en el DTO
    const errorsDuplicatesSuppliers = [];
    createMovementDto.inventoryMovementDetails.forEach((detail, index) => {
      const supplierIdsInDto = (detail.detailSuppliers ?? []).map(s => s.supplierId);
      const duplicatesInDto = supplierIdsInDto.filter((id, idx) => supplierIdsInDto.indexOf(id) !== idx);
      if (duplicatesInDto.length > 0) {
        errorsDuplicatesSuppliers.push(`inventoryMovementDetails.${index}: No puede enviar detailSuppliers.supplierId(s) duplicados: ${[...new Set(duplicatesInDto)].join(', ')}`);
      }
    });
    if (errorsDuplicatesSuppliers.length > 0) {
      throw new RpcException({
        message: errorsDuplicatesSuppliers,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Obtener todos los supplierIds únicos de todos los detalles
    const allSupplierIds = [
      ...new Set(
        createMovementDto.inventoryMovementDetails
          .flatMap(detail => (detail.detailSuppliers ?? []).map(s => s.supplierId))
          .filter(Boolean)
      )
    ];

    // Validar que existan en el microservicio de suppliers
    if (allSupplierIds.length > 0) {
      await this.handleRpcError(
        this.natsClient.send('suppliers.validateIds', allSupplierIds)
      );
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

    if (errors.length > 0) {
      throw new RpcException({
        message: errors,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Realizar la creación del movimiento
    try {
      const { inventoryMovementDetails, movementType, adjustment, description, ...data } = createMovementDto;
      if (!data.deliveryDate && adjustment.adjustmentType !== AdjustmentType.OUTCOME) {
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
            quantity: parseFloat(detail.totalExpectedQuantity),
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
          const { productId, totalExpectedQuantity } = detail;

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

            if (parseFloat(sourceStock) < parseFloat(totalExpectedQuantity)) {
              const warehouse = await firstValueFrom(
                this.natsClient.send('findOneWarehouse', createMovementDto.originWarehouseId).pipe(
                  catchError((error) => {
                    console.error('Error fetching warehouse:', error);
                    return of(null);
                  })
                )
              );
              throw new RpcException({
                message: `No hay suficiente stock en el almacén ${(warehouse ? warehouse.name : createMovementDto.originWarehouseId)} para el producto ${product ? product.name : productId}. Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${parseFloat(totalExpectedQuantity)}.`,
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

            if (parseFloat(sourceStock) < parseFloat(totalExpectedQuantity)) {
              const branch = await firstValueFrom(
                this.natsClient.send('findOneBranch', createMovementDto.originBranchId).pipe(
                  catchError((error) => {
                    console.error('Error fetching branch:', error);
                    return of(null);
                  })
                )
              );

              throw new RpcException({
                message: `No hay suficiente stock en la sucursal ${(branch ? branch.name : createMovementDto.originWarehouseId)} para el producto ${product ? product.name : productId}. Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${parseFloat(totalExpectedQuantity)}.`,
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
                totalExpectedQuantity: detail.totalExpectedQuantity,
                totalDeliveredQuantity: detail.totalDeliveredQuantity,
                ...(detail.detailSuppliers && detail.detailSuppliers.length > 0 && {
                  detailSuppliers: {
                    create: detail.detailSuppliers.map(supplier => ({
                      supplierId: supplier.supplierId,
                      deliveredQuantity: supplier.deliveredQuantity,
                      createdByUserId: data.createdByUserId,
                    }))
                  }
                })
              })),
            },
          },
          include: {
            inventoryMovementDetails: {
              include: {
                detailSuppliers: true,
              }
            },
            adjustment: true,
            // deliveryManagers: true,
            // suppliers: true,
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
          // suppliers: suppliersAndNames,
          // deliveryManagers: deliveryManagersAndNames,
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
          inventoryMovementDetails: {
            include: {
              detailSuppliers: true,
            }
          },
          adjustment: true,
          // deliveryManagers: true,
          // suppliers: true,
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
                  unit: {
                    name: product.unit.name,
                    abbreviation: product.unit.abbreviation,
                  }
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
            destinationBranch: branches.find(b => b.id === movement.destinationBranchId)
              ? { name: branches.find(b => b.id === movement.destinationBranchId).name }
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

  async updateDetailsAndStatus(id: string, updateDetailsAndStatusDto: UpdateDetailsAndStatusDto) {
    try {
      const movementExists = await this.prisma.inventoryMovement.findUnique({
        where: { id },
        include: {
          inventoryMovementDetails: {
            include: {
              detailSuppliers: true,
            }
          },
          adjustment: true,
        }
      })

      if (!movementExists) {
        throw new RpcException({
          message: "Movimiento no encontrado",
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

      if (updateDetailsAndStatusDto.inventoryMovementDetails) {
        // Validar que no haya details duplicados en el DTO
        const detailIds = updateDetailsAndStatusDto.inventoryMovementDetails
          .map(d => d.id)
          .filter(id => !!id); // Solo ids definidos

        const duplicates = detailIds.filter((id, idx) => detailIds.indexOf(id) !== idx);

        if (duplicates.length > 0) {
          throw new RpcException({
            message: `No puede enviar detalles duplicados (ids): ${[...new Set(duplicates)].join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      if (
        updateDetailsAndStatusDto.status === StatusInventoryMovement.COMPLETED &&
        (movementExists?.movementType !== InventoryMovementType.OUTCOME &&
          movementExists?.movementType !== InventoryMovementType.TRANSFER &&
          movementExists.adjustment?.adjustmentType === AdjustmentType.OUTCOME
        ) &&
        (!updateDetailsAndStatusDto.inventoryMovementDetails ||
          updateDetailsAndStatusDto.inventoryMovementDetails.some(
            (d) => !Array.isArray(d.detailSuppliers) || d.detailSuppliers.length === 0
          ))
      ) {
        throw new RpcException({
          message: "Cada detalle debe tener al menos un proveedor-cantidad (detailSuppliers) cuando el estado es COMPLETED.",
          statusCode: HttpStatus.BAD_REQUEST // Envia el codigo 400
        });
      }

      // Validar que exista totalDeliveredQuantity en los detalles si es diferente de Outcome
      if (movementExists.inventoryMovementDetails) {
        const errors = [];
        // Validar totalDeliveredQuantity según el tipo de movimiento
        updateDetailsAndStatusDto.inventoryMovementDetails.forEach((detail, idx) => {
          // Determinar el tipo de movimiento y ajuste
          const movementType = movementExists.movementType;
          const adjustmentType = movementExists.adjustment?.adjustmentType;

          // Si ES OUTCOME, TRANSFER o ajuste OUTCOME, validar que exista totalDeliveredQuantity
          const isOutcomeOrTransferOrAdjOutcome =
            movementType === InventoryMovementType.OUTCOME ||
            movementType === InventoryMovementType.TRANSFER ||
            adjustmentType === AdjustmentType.OUTCOME;

          if (isOutcomeOrTransferOrAdjOutcome &&
            detail.detailSuppliers &&
            Array.isArray(detail.detailSuppliers) &&
            detail.detailSuppliers.length > 0
          ) {
            errors.push(`inventoryMovementDetails.${idx}: No debe enviar el campo (detailSuppliers) cuando el tipo de movimiento es OUTCOME, TRANSFER o ajuste OUTCOME.`);
          }

          if (
            isOutcomeOrTransferOrAdjOutcome && (detail.totalDeliveredQuantity === undefined || detail.totalDeliveredQuantity === null || detail.totalDeliveredQuantity === '')
          ) {
            errors.push(`inventoryMovementDetails.${idx}: El campo (totalDeliveredQuantity) es obligatorio cuando el tipo de movimiento es OUTCOME, TRANSFER o adjustment.OUTCOME.`);
          }

          // Validación para adjustment INCOME: solo uno de los dos campos debe estar presente
          const isAdjustmentIncome =
            movementType === InventoryMovementType.ADJUSTMENT &&
            adjustmentType === AdjustmentType.INCOME;

          if (isAdjustmentIncome) {
            const hasTotalDeliveredQuantity =
              detail.totalDeliveredQuantity !== undefined &&
              detail.totalDeliveredQuantity !== null &&
              detail.totalDeliveredQuantity !== '';

            const hasDetailSuppliers =
              detail.detailSuppliers &&
              Array.isArray(detail.detailSuppliers) &&
              detail.detailSuppliers.length > 0;

            if (hasTotalDeliveredQuantity && hasDetailSuppliers) {
              errors.push(
                `inventoryMovementDetails.${idx}: No puede enviar ambos campos (totalDeliveredQuantity y detailSuppliers) cuando el tipo de ajuste es INCOME. Solo uno debe estar presente.`
              );
            }
            if (!hasTotalDeliveredQuantity && !hasDetailSuppliers) {
              errors.push(
                `inventoryMovementDetails.${idx}: Debe enviar al menos uno de los campos (totalDeliveredQuantity o detailSuppliers) cuando el tipo de ajuste es INCOME.`
              );
            }
          }
        });

        if (errors.length > 0) {
          throw new RpcException({
            message: errors,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      // Validar que los detalles a actualizar existan en el movimiento
      if (movementExists.inventoryMovementDetails) {
        // Extraer los id de ambos arreglos
        const existingDetailIds = new Set(
          movementExists.inventoryMovementDetails.map((detail) => detail.id)
        );
        const newDetailIds = new Set(
          updateDetailsAndStatusDto.inventoryMovementDetails.map((detail) => detail.id)
        );

        // Verificar si todos los id de updateDetailsAndStatusDto están en movementExists
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

      // Validar que los detalles a actualizar tengan los suppliers existentes
      if (movementExists.inventoryMovementDetails) {
        for (const existingDetail of movementExists.inventoryMovementDetails) {
          const dtoDetail = updateDetailsAndStatusDto.inventoryMovementDetails.find(d => d.id === existingDetail.id);
          if (!dtoDetail) continue; // Ya validaste antes que existan los detalles

          const existingSupplierIds = new Set(
            (existingDetail.detailSuppliers ?? []).map(s => s.id)
          );

          // Solo valida los suppliers que tienen id definido (los que se van a actualizar)
          const dtoSupplierIdsWithId = (dtoDetail.detailSuppliers ?? [])
            .map(s => s.id)
            .filter(id => !!id);

          const missingSupplierIds = dtoSupplierIdsWithId.filter(
            id => !existingSupplierIds.has(id)
          );

          if (missingSupplierIds.length > 0) {
            throw new RpcException({
              message: `Los siguientes (detailSuppliers) no están en el detalle ${existingDetail.id} del movimiento existente: ${missingSupplierIds.join(', ')}`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
        }
      }

      // Validar que no haya suppliers duplicados en el DTO
      for (const detail of updateDetailsAndStatusDto.inventoryMovementDetails) {
        const supplierIdsInDto = (detail.detailSuppliers ?? []).map(s => s.supplierId);
        const duplicatesInDto = supplierIdsInDto.filter((id, idx) => supplierIdsInDto.indexOf(id) !== idx);
        if (duplicatesInDto.length > 0) {
          throw new RpcException({
            message: `No puede enviar detailSuppliers.supplierId(s) duplicados en el detalle ${detail.id}: ${[...new Set(duplicatesInDto)].join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        const existingDetail = movementExists.inventoryMovementDetails.find(d => d.id === detail.id);
        if (existingDetail) {
          // Validar para nuevos suppliers (sin id)
          const existingSupplierIds = new Set((existingDetail.detailSuppliers ?? []).map(s => s.supplierId));
          const alreadyCreated = (detail.detailSuppliers ?? [])
            .filter(s => !s.id && existingSupplierIds.has(s.supplierId))
            .map(s => s.supplierId);

          if (alreadyCreated.length > 0) {
            throw new RpcException({
              message: `Ya existe un detailSupplier con supplierId(s) ${[...new Set(alreadyCreated)].join(', ')} en el detalle ${detail.id}.`,
              statusCode: HttpStatus.CONFLICT,
            });
          }

          // Validar para edición: que el supplierId no esté en otro detailSupplier (distinto id)
          for (const supplier of (detail.detailSuppliers ?? []).filter(s => s.id)) {
            const found = (existingDetail.detailSuppliers ?? []).find(
              s => s.supplierId === supplier.supplierId && s.id !== supplier.id
            );
            if (found) {
              throw new RpcException({
                message: `El supplierId ${supplier.supplierId} ya está asignado a otro detailSupplier en el detalle ${detail.id}.`,
                statusCode: HttpStatus.CONFLICT,
              });
            }
          }
        }
      }

      // Validar que cuando sea COMPLETED, todos los detailSuppliers ya existentes tengan deliveredQuantity válido
      if (updateDetailsAndStatusDto.status === StatusInventoryMovement.COMPLETED) {
        for (const detail of movementExists.inventoryMovementDetails) {
          for (const supplier of detail.detailSuppliers ?? []) {
            // Busca el supplier correspondiente en el DTO para obtener el valor actualizado (si existe)
            const dtoDetail = updateDetailsAndStatusDto.inventoryMovementDetails.find(d => d.id === detail.id);
            const dtoSupplier = dtoDetail?.detailSuppliers?.find(s => s.id === supplier.id);

            // Usar el valor actualizado si existe, si no, el de la base de datos
            const deliveredQuantity = dtoSupplier?.deliveredQuantity ?? supplier.deliveredQuantity;

            if (
              deliveredQuantity === undefined ||
              deliveredQuantity === null ||
              deliveredQuantity === '' ||
              isNaN(Number(deliveredQuantity))
            ) {
              throw new RpcException({
                message: `Debe ingresar el deliveredQuantity para el detailSupplier con id ${supplier.id} en el detalle ${detail.id}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }
        }
      }

      // Obtener todos los supplierIds únicos de todos los detalles
      const allSupplierIds = [
        ...new Set(
          updateDetailsAndStatusDto.inventoryMovementDetails
            .flatMap(detail => (detail.detailSuppliers ?? []).map(s => s.supplierId))
            .filter(Boolean)
        )
      ];

      // Validar que existan en el microservicio de suppliers
      if (allSupplierIds.length > 0) {
        await this.handleRpcError(
          this.natsClient.send('suppliers.validateIds', allSupplierIds)
        );
      }

      // Validar que haya un origen y destino dependiendo del tipo
      // Validar que originBranchId no sea igual a destinationBranchId
      if (updateDetailsAndStatusDto.status === StatusInventoryMovement.COMPLETED) {
        if (movementExists.adjustment === null) {
          const errors = [];
          for (const detail of updateDetailsAndStatusDto.inventoryMovementDetails) {
            if (!detail.detailSuppliers || !Array.isArray(detail.detailSuppliers) || detail.detailSuppliers.length === 0) {
              errors.push(`El detalle con id ${detail.id} debe tener al menos un supplier asignado.`);
              continue;
            }
            for (const supplier of detail.detailSuppliers) {
              if (!supplier.supplierId) {
                errors.push(`El supplier en el detalle ${detail.id} debe tener un supplierId.`);
              }
              if (
                supplier.deliveredQuantity === undefined ||
                supplier.deliveredQuantity === null ||
                supplier.deliveredQuantity === '' ||
                isNaN(Number(supplier.deliveredQuantity))
              ) {
                errors.push(`El supplier en el detalle ${detail.id} debe tener un (deliveredQuantity) válido.`);
              }
            }
          }
          if (errors.length > 0) {
            throw new RpcException({
              message: errors,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
        }
      }


      // return updateDetailsAndStatusDto

      if (movementExists) {
        for (const detail of updateDetailsAndStatusDto.inventoryMovementDetails) {
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

          const expectedQuantity = movementExists.inventoryMovementDetails.find(d => d.id === detail.id).totalExpectedQuantity
          // Determinar deliveredQuantity basado en deliveryStatus
          // let deliveredQuantity: Decimal | undefined = this.determineDeliveredQuantity(expectedQuantity, detail.deliveryStatus, new Decimal(detail.deliveredQuantity));
          // Sumar todas las cantidades entregadas de los suppliers
          const totalDeliveredQuantity = detail.totalDeliveredQuantity || detail.detailSuppliers.reduce(
            (sum, supplier) => sum.plus(new Decimal(supplier.deliveredQuantity || 0)),
            new Decimal(0)
          );

          if (originWarehouseId && totalDeliveredQuantity) {
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
            if (new Decimal(sourceStock).lessThan(totalDeliveredQuantity)) {
              const warehouse = await firstValueFrom(
                this.natsClient.send('findOneWarehouse', movementExists.originWarehouseId).pipe(
                  catchError((error) => {
                    console.error('Error fetching warehouse:', error);
                    return of(null);
                  })
                )
              );
              throw new RpcException({
                message: `No hay suficiente stock en el almacén (${(warehouse ? warehouse.name : movementExists.originWarehouseId)}) para el producto (${product ? product.name : productId}). Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${totalDeliveredQuantity}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }

          if (originBranchId && totalDeliveredQuantity) {
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

            if (new Decimal(sourceStock).lessThan(totalDeliveredQuantity)) {
              const branch = await firstValueFrom(
                this.natsClient.send('findOneBranch', movementExists.originBranchId).pipe(
                  catchError((error) => {
                    console.error('Error fetching branch:', error);
                    return of(null);
                  })
                )
              );

              throw new RpcException({
                message: `No hay suficiente stock en la sucursal (${(branch ? branch.name : movementExists.originWarehouseId)}) para el producto (${product ? product.name : productId}). Stock disponible: ${parseFloat(sourceStock)}. Stock requerido: ${totalDeliveredQuantity}.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }
        }
      }

      await this.prisma.$transaction(async (prisma) => {
        // 1. Actualiza los detalles (sin detailSuppliers)
        await prisma.inventoryMovement.update({
          where: { id },
          data: {
            status: updateDetailsAndStatusDto.status,
            updatedByUserId: updateDetailsAndStatusDto.updatedByUserId,
            inventoryMovementDetails: {
              updateMany: updateDetailsAndStatusDto.inventoryMovementDetails.map((detail) => {
                const totalExpectedQuantity = movementExists.inventoryMovementDetails.find(d => d.id === detail.id).totalExpectedQuantity;
                const totalDeliveredQuantity = detail.totalDeliveredQuantity ? new Decimal(detail.totalDeliveredQuantity) : detail.detailSuppliers.reduce(
                  (sum, supplier) => sum.plus(new Decimal(supplier.deliveredQuantity || 0)),
                  new Decimal(0)
                );

                let deliveryStatus: DeliveryStatus;
                if (totalDeliveredQuantity === null || totalDeliveredQuantity === undefined || totalDeliveredQuantity.equals(0)) {
                  deliveryStatus = DeliveryStatus.NOT_DELIVERED;
                } else if (totalDeliveredQuantity.equals(totalExpectedQuantity)) {
                  deliveryStatus = DeliveryStatus.COMPLETE;
                } else if (totalDeliveredQuantity.greaterThan(totalExpectedQuantity)) {
                  deliveryStatus = DeliveryStatus.OVER_DELIVERED;
                } else if (totalDeliveredQuantity.greaterThan(0) && totalDeliveredQuantity.lessThan(totalExpectedQuantity)) {
                  deliveryStatus = DeliveryStatus.PARTIAL;
                } else {
                  deliveryStatus = DeliveryStatus.PENDING;
                }

                return {
                  where: { id: detail.id },
                  data: {
                    productId: detail.productId,
                    totalDeliveredQuantity,
                    deliveryStatus,
                  },
                };
              }),
            },
          }
        });

        // 2. Actualiza y crea los detailSuppliers por separado
        for (const detail of updateDetailsAndStatusDto.inventoryMovementDetails) {
          const dtoSuppliers = detail.detailSuppliers ?? [];

          // 1. Eliminar los suppliers que ya no están en el DTO
          // const dtoSupplierIds = dtoSuppliers.filter(s => s.id).map(s => s.id);
          // await this.prisma.inventoryMovementDetailSupplier.deleteMany({
          //   where: {
          //     inventoryMovementDetailId: detail.id,
          //     ...(dtoSupplierIds.length > 0 && { NOT: { id: { in: dtoSupplierIds } } }),
          //   }
          // });

          // 2. Actualizar los existentes
          for (const supplier of dtoSuppliers.filter(s => s.id)) {
            await this.prisma.inventoryMovementDetailSupplier.update({
              where: { id: supplier.id },
              data: {
                supplierId: supplier.supplierId,
                deliveredQuantity: supplier.deliveredQuantity,
                // otros campos si aplica
                updatedByUserId: updateDetailsAndStatusDto.updatedByUserId, // ejemplo de trazabilidad
              }
            });
          }

          // 3. Crear los nuevos
          for (const supplier of dtoSuppliers.filter(s => !s.id)) {
            await this.prisma.inventoryMovementDetailSupplier.create({
              data: {
                inventoryMovementDetailId: detail.id,
                supplierId: supplier.supplierId,
                deliveredQuantity: supplier.deliveredQuantity,
                // otros campos si aplica
                createdByUserId: updateDetailsAndStatusDto.updatedByUserId, // ejemplo de trazabilidad
              }
            });
          }
        }
      });

      // Consulta el movimiento actualizado con detalles y suppliers
      const updatedMovement = await this.prisma.inventoryMovement.findUnique({
        where: { id },
        include: {
          inventoryMovementDetails: {
            include: {
              detailSuppliers: true,
            }
          },
          adjustment: true,
        }
      });

      if (updateDetailsAndStatusDto.status === StatusInventoryMovement.COMPLETED) {
        // Actualizar stock
        updatedMovement.inventoryMovementDetails.forEach(detail => {
          // const { branchStock, warehouseStock } = detail;
          // Procesar actualización de stock en almacenes
          const stockData = [];

          if (detail.totalDeliveredQuantity) {
            if (updatedMovement.originWarehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: updatedMovement.originWarehouseId,
                quantity: -detail.totalDeliveredQuantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }
            if (updatedMovement.originBranchId) {
              stockData.push({
                productId: detail.productId,
                updateId: updatedMovement.originBranchId,
                quantity: -detail.totalDeliveredQuantity,
                branchOrWarehouse: 'BRANCH'
              });
            }
            if (updatedMovement.destinationWarehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: updatedMovement.destinationWarehouseId,
                quantity: detail.totalDeliveredQuantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }
            if (updatedMovement.destinationBranchId) {
              stockData.push({
                productId: detail.productId,
                updateId: updatedMovement.destinationBranchId,
                quantity: detail.totalDeliveredQuantity,
                branchOrWarehouse: 'BRANCH'
              });
            }

            if (stockData.length > 0) {
              this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
            }
          }
          // Procesar actualización de stock en sucursales

        })
      }

      // Obtener los IDs únicos de sucursales y almacenes
      const branchIds = [updatedMovement.originBranchId, updatedMovement.destinationBranchId].filter(Boolean);
      const warehouseIds = [updatedMovement.originWarehouseId, updatedMovement.destinationWarehouseId].filter(Boolean);


      // Consultar branches y warehouses solo si hay IDs
      const branches = branchIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
        : [];

      const warehouses = warehouseIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
        : [];

      const updatedMovementWithBranchesAndWarehouses = {
        ...updatedMovement,
        originBranch: branches.find(b => b.id === updatedMovement.originBranchId)
          ? { name: branches.find(b => b.id === updatedMovement.originBranchId).name }
          : null,
        originWarehouse: warehouses.find(w => w.id === updatedMovement.originWarehouseId)
          ? { name: warehouses.find(w => w.id === updatedMovement.originWarehouseId).name }
          : null,
        destinationBranch: branches.find(b => b.id === updatedMovement.destinationBranchId)
          ? { name: branches.find(b => b.id === updatedMovement.destinationBranchId).name }
          : null,
        destinationWarehouse: warehouses.find(b => b.id === updatedMovement.destinationWarehouseId)
          ? { name: warehouses.find(b => b.id === updatedMovement.destinationWarehouseId).name }
          : null,
      }

      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', updatedMovement.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', updatedMovement.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      return {
        message: "Movimiento actualizado con éxito",
        movement: {
          ...updatedMovementWithBranchesAndWarehouses,
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

  async removeDetailSupplier(id: string) {
    try {
      const detailSupplier = await this.prisma.inventoryMovementDetailSupplier.findUnique({
        where: { id },
      });

      if (!detailSupplier) {
        throw new RpcException({
          message: 'Detalle de proveedor no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      await this.prisma.inventoryMovementDetailSupplier.delete({
        where: { id },
      });

      return {
        message: 'Detalle de proveedor eliminado con éxito.',
        detailSupplier
      };
    } catch (error) {
      console.error('Error al eliminar el detalle de proveedor:', error);
      throw new RpcException({
        message: 'Error al eliminar el detalle de proveedor.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }
}