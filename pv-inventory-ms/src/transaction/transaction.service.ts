import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { NATS_SERVICE } from 'src/config';
import { AdjustmentType, StatusInventoryMovement } from '@prisma/client';
import { TransactionsPaginationDto } from './dto/transactions-pagination';

@Injectable()
export class TransactionService {
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

  async verifyStockForMovement(type: string, productId: string, stockData: any, adjustmentType?: AdjustmentType): Promise<void> {
    const { quantity, warehouseId, branchId, originBranchId, originWarehouseId } = stockData;

    // Si es un ajuste, debe tener un tipo de ajuste definido
    if (type === 'ADJUSTMENT' && !adjustmentType) {
      throw new RpcException({
        message: 'Para una transacción de ajuste, se debe especificar el tipo de Ajuste.',
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Si es un ajuste con tipo 'INCOME' o 'OUTCOME', tratarlo como tal
    if (type === 'ADJUSTMENT') {
      type = adjustmentType as string; // Convertir a 'INCOME' o 'OUTCOME'
    }

    switch (type) {
      case 'INCOME':
        if (!branchId && !warehouseId) {
          throw new RpcException({
            message: 'Para una entrada, se debe especificar un almacén o sucursal de destino.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        if (originBranchId || originWarehouseId) {
          throw new RpcException({
            message: 'No se debe especificar un origen para las entradas.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        break;
      case 'OUTCOME':
        // Al menos uno de los dos (originBranchId u originWarehouseId) debe estar presente.
        if (!originBranchId && !originWarehouseId) {
          throw new RpcException({
            message: 'Las salidas deben realizarse desde una sucursal o almacén de origen.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        // Validamos que no se haya especificado un destino (ni branchId ni warehouseId)
        if (branchId || warehouseId) {
          throw new RpcException({
            message: 'No se debe especificar un destino para las salidas. Las salidas solo ocurren desde una sucursal o almacén de origen.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        // Verificación del stock en la sucursal o almacén de origen
        const availableStock = await this.handleRpcError(
          this.natsClient.send(
            originWarehouseId ? 'products.verifyStockWarehouse' : 'products.verifyStockBranch',
            {
              productId,
              ...(originWarehouseId ? { warehouseId: originWarehouseId } : {}),
              ...(originBranchId ? { branchId: originBranchId } : {}),
            }
          )
        );

        if (parseFloat(availableStock) < parseFloat(quantity)) {
          throw new RpcException({
            message: `No hay suficiente stock en la sucursal de origen ${originBranchId} para el producto con ID ${productId}.`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        break;
      case 'TRANSFER':
        if (!originBranchId && !originWarehouseId) {
          throw new RpcException({
            message: 'Para una transferencia, se debe especificar un almacén o sucursal de origen.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        if (originBranchId && originBranchId === branchId) {
          throw new RpcException({
            message: 'No se puede transferir stock dentro de la misma sucursal.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        if (originWarehouseId && originWarehouseId === warehouseId) {
          throw new RpcException({
            message: 'No se puede transferir stock dentro del mismo almacén.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }

        const sourceStock = await this.handleRpcError(
          this.natsClient.send(
            originWarehouseId ? 'products.verifyStockWarehouse' : 'products.verifyStockBranch',
            {
              productId,
              ...(originWarehouseId ? { warehouseId: originWarehouseId } : {}),
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
          const warehouse = originWarehouseId ? await firstValueFrom(
            this.natsClient.send('findOneWarehouse', originWarehouseId).pipe(
              catchError((error) => {
                console.error('Error fetching warehouse:', error);
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
            message: `No hay suficiente stock en el ${originWarehouseId ? 'almacén' : 'sucursal'
              } ${(warehouse ? warehouse.name : originWarehouseId) || (branch ? branch.name : originBranchId)} para transferir el producto ${product ? product.name : productId}.`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
        break;

      default:
        throw new RpcException({
          message: `Tipo de movimiento no válido: ${type}.`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
    }

  }




  async create(createTransactionDto: CreateInventoryTransactionDto) {
    try {
      const { inventoryTransactionProducts, movementType, adjustmentType, description, ...data } = createTransactionDto;
      if (!data.entryDate && movementType !== 'OUTCOME') {
        throw new RpcException({
          message: `La fecha de ingreso es requerida.`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      const branchIds: Set<string> = new Set();
      const warehouseIds: Set<string> = new Set();
      const productIds: Set<string> = new Set();
      const seenProductIds = new Set();

      const warehouseStockUpdates: { productId: string, originWarehouseId?: string, originBranchId?: string, warehouseId: string, quantity: number }[] = [];
      const branchStockUpdates: { productId: string, originBranchId?: string, originWarehouseId?: string, branchId: string, quantity: number }[] = [];
      if (inventoryTransactionProducts) {
        for (const product of inventoryTransactionProducts) {
          const { productId, warehouseStock, branchStock } = product;

          if (!warehouseStock && !branchStock) {
            throw new RpcException({
              message: `Debe proporcionar un almacén o una sucursal para el producto con ID ${productId}.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }

          let uniqueIdentifier: string;
          if (warehouseStock) {
            uniqueIdentifier = `${productId}-${warehouseStock.warehouseId}`;
            if (warehouseStock.warehouseId) warehouseIds.add(warehouseStock.warehouseId);
            if (warehouseStock.originBranchId) branchIds.add(warehouseStock.originBranchId);
            if (warehouseStock.originWarehouseId) warehouseIds.add(warehouseStock.originWarehouseId);
            warehouseStockUpdates.push({
              productId,
              originWarehouseId: warehouseStock.originWarehouseId ?? undefined,
              originBranchId: warehouseStock.originBranchId ?? undefined,
              warehouseId: warehouseStock.warehouseId ?? undefined,
              quantity: warehouseStock.quantity,
            });
          }
          if (branchStock) {
            uniqueIdentifier = `${productId}-${branchStock.branchId}`;
            if (branchStock.branchId) branchIds.add(branchStock.branchId);
            if (branchStock.originBranchId) branchIds.add(branchStock.originBranchId);
            if (branchStock.originWarehouseId) warehouseIds.add(branchStock.originWarehouseId);
            branchStockUpdates.push({
              productId,
              originWarehouseId: branchStock.originWarehouseId ?? undefined,
              originBranchId: branchStock.originBranchId ?? undefined,
              branchId: branchStock.branchId,
              quantity: branchStock.quantity,
            });
          }

          if (seenProductIds.has(uniqueIdentifier)) {
            throw new RpcException({
              message: `El producto con ID ${productId} ya está asignado al mismo almacén o sucursal.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }

          seenProductIds.add(uniqueIdentifier);
          productIds.add(productId);
        }

        await Promise.all([
          branchIds.size > 0 ? this.handleRpcError(this.natsClient.send('branches.validateIds', Array.from(branchIds))) : Promise.resolve(),
          warehouseIds.size > 0 ? this.handleRpcError(this.natsClient.send('warehouses.validateIds', Array.from(warehouseIds))) : Promise.resolve(),
          productIds.size > 0 ? this.handleRpcError(this.natsClient.send('products.validateIds', Array.from(productIds))) : Promise.resolve(),
        ]);

      }

      if (inventoryTransactionProducts) {
        for (const product of inventoryTransactionProducts) {
          const { productId, warehouseStock, branchStock } = product;

          if (warehouseStock?.originWarehouseId) {
            await this.verifyStockForMovement(movementType, productId, warehouseStock, adjustmentType);
          }

          if (branchStock?.originBranchId) {
            await this.verifyStockForMovement(movementType, productId, branchStock, adjustmentType);
          }

          await this.verifyStockForMovement(movementType, productId, warehouseStock || branchStock, adjustmentType);
        }
      }

      const createdTransaction = await this.prisma.$transaction(async (prisma) => {
        const newTransaction = await prisma.inventoryMovement.create({
          data: {
            ...data,
            description,
            movementType,
            adjustmentType,
            inventoryTransactionProducts: {
              create: inventoryTransactionProducts.map((product) => ({
                productId: product.productId,
                unit: product.unit,
                branchStock: product.branchStock ? {
                  create: product.branchStock
                } : undefined,
                warehouseStock: product.warehouseStock ? {
                  create: product.warehouseStock
                } : undefined,
              })),
            },
          },
          include: {
            inventoryTransactionProducts: {
              include: {
                branchStock: true,
                warehouseStock: true,
              }
            },
          },
        });

        try {
          // Procesar actualización de stock en almacenes
          if (warehouseStockUpdates.length > 0 && newTransaction.status === 'COMPLETED') {
            const stockData = [];

            warehouseStockUpdates.forEach(stock => {
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
              if (stock.warehouseId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.warehouseId,
                  quantity: stock.quantity,
                  branchOrWarehouse: 'WAREHOUSE'
                });
              }
            });

            if (stockData.length > 0) {
              await this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
            }
          }

          // Procesar actualización de stock en sucursales
          if (branchStockUpdates.length > 0 && newTransaction.status === 'COMPLETED') {
            const stockData = [];

            branchStockUpdates.forEach(stock => {
              // Descontar stock de almacén de origen
              if (stock.originWarehouseId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.originWarehouseId,
                  quantity: -stock.quantity,
                  branchOrWarehouse: 'WAREHOUSE'
                });
              }
              // Descontar Stock de Sucursal de Origen
              if (stock.originBranchId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.originBranchId,
                  quantity: -stock.quantity,
                  branchOrWarehouse: 'BRANCH'
                });
              }
              // Sumar stock a Sucursal de destino
              if (stock.branchId) {
                stockData.push({
                  productId: stock.productId,
                  updateId: stock.branchId,
                  quantity: stock.quantity,
                  branchOrWarehouse: 'BRANCH'
                });
              }
            });

            // Enviar la solicitud de creacion o modificación de stock
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
        const branchIds = [
          ...new Set(newTransaction.inventoryTransactionProducts.map(b => b.branchStock?.branchId)),
          ...new Set(newTransaction.inventoryTransactionProducts.map(b => b.branchStock?.originBranchId)),
          ...new Set(newTransaction.inventoryTransactionProducts.map(b => b.warehouseStock?.originBranchId)),
        ].filter(Boolean); // Filtrar valores `undefined` o `null`

        const warehouseIds = [
          ...new Set(newTransaction.inventoryTransactionProducts.map(b => b.warehouseStock?.warehouseId)),
          ...new Set(newTransaction.inventoryTransactionProducts.map(b => b.warehouseStock?.originWarehouseId)),
          ...new Set(newTransaction.inventoryTransactionProducts.map(b => b.branchStock?.originWarehouseId)),
        ].filter(Boolean);

        // Consultar branches y warehouses solo si hay IDs
        const branches = branchIds.length > 0
          ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
          : [];

        const warehouses = warehouseIds.length > 0
          ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
          : [];
        // Mapear la respuesta para incluir los datos de branches y warehouses
        const transactionsWithDetails = {
          ...newTransaction,
          inventoryTransactionProducts: newTransaction.inventoryTransactionProducts.map(i => {
            const branchStock = {
              ...i.branchStock,
              originBranch: branches.find(b => b.id === i.branchStock?.originBranchId)
                ? { name: branches.find(b => b.id === i.branchStock?.originBranchId).name }
                : null,
              originWarehouse: warehouses.find(w => w.id === i.branchStock?.originWarehouseId)
                ? { name: warehouses.find(w => w.id === i.branchStock?.originWarehouseId).name }
                : null,
              branch: branches.find(b => b.id === i.branchStock?.branchId)
                ? { name: branches.find(b => b.id === i.branchStock?.branchId).name }
                : null,
            };

            // Si todos los valores en branchStock son null, establecerlo como null
            const isBranchStockNull = Object.values(branchStock).every(value => value === null);

            const warehouseStock = {
              ...i.warehouseStock,
              originWarehouse: warehouses.find(w => w.id === i.warehouseStock?.originWarehouseId)
                ? { name: warehouses.find(w => w.id === i.warehouseStock?.originWarehouseId).name }
                : null,
              originBranch: branches.find(b => b.id === i.warehouseStock?.originBranchId)
                ? { name: branches.find(b => b.id === i.warehouseStock?.originBranchId).name }
                : null,
              warehouse: warehouses.find(w => w.id === i.warehouseStock?.warehouseId)
                ? { name: warehouses.find(w => w.id === i.warehouseStock?.warehouseId).name }
                : null,
            };

            // Si todos los valores en warehouseStock son null, establecerlo como null
            const isWarehouseStockNull = Object.values(warehouseStock).every(value => value === null);

            return {
              ...i,
              branchStock: isBranchStockNull ? null : branchStock,
              warehouseStock: isWarehouseStockNull ? null : warehouseStock,
            };
          })
        };

        return transactionsWithDetails;
      });

      const updatedByUser = createdTransaction.updatedByUserId ? await firstValueFrom(
        this.natsClient.send('auth.user.findOne', createdTransaction.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      ) : null;

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', createdTransaction.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );
      return {
        ...createdTransaction,
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
        message: 'Error al registrar la transacción.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async findAll(paginationDto: TransactionsPaginationDto) {
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

      const transactions = await this.prisma.inventoryMovement.findMany({
        skip,
        take: limit || undefined,
        orderBy: { [columnOrderBy]: orderBy },
        where: whereFilters,
        include: {
          inventoryTransactionProducts: {
            include: {
              branchStock: true,
              warehouseStock: true,
            }
          }
        }
      });

      // Obtener los IDs únicos de sucursales y almacenes
      const branchIds = [
        ...new Set(transactions.flatMap(w => w.inventoryTransactionProducts.map(b => b.branchStock?.branchId))),
        ...new Set(transactions.flatMap(w => w.inventoryTransactionProducts.map(b => b.branchStock?.originBranchId))),
        ...new Set(transactions.flatMap(w => w.inventoryTransactionProducts.map(b => b.warehouseStock?.originBranchId))),
      ].filter(Boolean); // Filtrar valores `undefined` o `null`

      const warehouseIds = [
        ...new Set(transactions.flatMap(w => w.inventoryTransactionProducts.map(b => b.warehouseStock?.warehouseId))),
        ...new Set(transactions.flatMap(w => w.inventoryTransactionProducts.map(b => b.warehouseStock?.originWarehouseId))),
        ...new Set(transactions.flatMap(w => w.inventoryTransactionProducts.map(b => b.branchStock?.originWarehouseId))),
      ].filter(Boolean);

      // Consultar branches y warehouses solo si hay IDs
      const branches = branchIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
        : [];

      const warehouses = warehouseIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
        : [];

      // Mapear la respuesta para incluir los datos de branches y warehouses
      const transactionsWithDetails = transactions.map(t => ({
        ...t,
        inventoryTransactionProducts: t.inventoryTransactionProducts.map(i => {
          const branchStock = {
            ...i.branchStock,
            originBranch: branches.find(b => b.id === i.branchStock?.originBranchId)
              ? { name: branches.find(b => b.id === i.branchStock?.originBranchId).name }
              : null,
            originWarehouse: warehouses.find(w => w.id === i.branchStock?.originWarehouseId)
              ? { name: warehouses.find(w => w.id === i.branchStock?.originWarehouseId).name }
              : null,
            branch: branches.find(b => b.id === i.branchStock?.branchId)
              ? { name: branches.find(b => b.id === i.branchStock?.branchId).name }
              : null,
          };

          // Si todos los valores en branchStock son null, establecerlo como null
          const isBranchStockNull = Object.values(branchStock).every(value => value === null);

          const warehouseStock = {
            ...i.warehouseStock,
            originWarehouse: warehouses.find(w => w.id === i.warehouseStock?.originWarehouseId)
              ? { name: warehouses.find(w => w.id === i.warehouseStock?.originWarehouseId).name }
              : null,
            originBranch: branches.find(b => b.id === i.warehouseStock?.originBranchId)
              ? { name: branches.find(b => b.id === i.warehouseStock?.originBranchId).name }
              : null,
            warehouse: warehouses.find(w => w.id === i.warehouseStock?.warehouseId)
              ? { name: warehouses.find(w => w.id === i.warehouseStock?.warehouseId).name }
              : null,
          };

          // Si todos los valores en warehouseStock son null, establecerlo como null
          const isWarehouseStockNull = Object.values(warehouseStock).every(value => value === null);

          return {
            ...i,
            branchStock: isBranchStockNull ? null : branchStock,
            warehouseStock: isWarehouseStockNull ? null : warehouseStock,
          };
        })
      }));


      // Contar el total de transacciones con el mismo filtro
      const totalItems = await this.prisma.inventoryMovement.count({
        where: whereFilters,
      });

      // Mapear la respuesta: anidal los datos de las sucursales a cada almacén
      const transactionsWithDetailsAndUsers = await Promise.all(
        transactionsWithDetails.map(async (transaction) => {
          const updatedByUser = transaction.updatedByUserId ? await firstValueFrom(
            this.natsClient.send('auth.user.findOne', transaction.updatedByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching updatedByUser:', error);
                return of(null);
              })
            )
          ) : null;

          const createdByUser = await firstValueFrom(
            this.natsClient.send('auth.user.findOne', transaction.createdByUserId).pipe(
              catchError((error) => {
                console.error('Error fetching createdByUser:', error);
                return of(null);
              })
            )
          );

          const inventoryAndProducts = await Promise.all(
            transaction.inventoryTransactionProducts.map(async i => {
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
                product: {
                  name: product.name,
                }
              };
            })
          );


          return {
            ...transaction,
            inventoryTransactionProducts: inventoryAndProducts,
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
        transactions: transactionsWithDetailsAndUsers,
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

  update(id: string, updateInventoryDto: UpdateInventoryTransactionDto) {
    return `This action updates a #${id} inventory`;
  }

  async changeStatus(id: string, status: StatusInventoryMovement, updatedByUserId: string) {
    try {
      const transacionExists = await this.prisma.inventoryMovement.findUnique({
        where: { id },
        include: {
          inventoryTransactionProducts: {
            include: {
              branchStock: true,
              warehouseStock: true,
            }
          }
        }
      })
      if (!transacionExists) {
        throw new RpcException({
          message: "Transacción no encontrada",
          statusCode: HttpStatus.BAD_REQUEST // Envia el codigo 400
        });
      }

      // Verificar si el status ya está en COMPLETED
      if (transacionExists.status === StatusInventoryMovement.COMPLETED) {
        throw new RpcException({
          message: "La transacción ya está completada y no puede modificarse",
          statusCode: HttpStatus.BAD_REQUEST, // Envía el código 400
        });
      }

      if (transacionExists.inventoryTransactionProducts) {
        for (const product of transacionExists.inventoryTransactionProducts) {
          const { productId, warehouseStock, branchStock } = product;

          if (warehouseStock?.originWarehouseId) {
            await this.verifyStockForMovement(transacionExists.movementType, productId, warehouseStock, transacionExists.adjustmentType);
          }

          if (branchStock?.originBranchId) {
            await this.verifyStockForMovement(transacionExists.movementType, productId, branchStock, transacionExists.adjustmentType);
          }

          await this.verifyStockForMovement(transacionExists.movementType, productId, warehouseStock || branchStock, transacionExists.adjustmentType);
        }
      }

      const updateTransaction = await this.prisma.inventoryMovement.update({
        where: { id },
        data: {
          status: status,
          updatedByUserId
        },
        include: {
          inventoryTransactionProducts: {
            include: {
              branchStock: true,
              warehouseStock: true,
            }
          }
        }
      })

      try {
        // Actualizar stock
        updateTransaction.inventoryTransactionProducts.forEach(detail => {
          const { branchStock, warehouseStock } = detail;
          // Procesar actualización de stock en almacenes
          if (warehouseStock) {
            const stockData = [];

            if (warehouseStock.originWarehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: warehouseStock.originWarehouseId,
                quantity: -warehouseStock.quantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }
            if (warehouseStock.originBranchId) {
              stockData.push({
                productId: detail.productId,
                updateId: warehouseStock.originBranchId,
                quantity: -warehouseStock.quantity,
                branchOrWarehouse: 'BRANCH'
              });
            }
            if (warehouseStock.warehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: warehouseStock.warehouseId,
                quantity: warehouseStock.quantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }

            if (stockData.length > 0) {
              this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
            }
          }
          // Procesar actualización de stock en sucursales
          if (branchStock) {
            const stockData = [];

            if (branchStock.originWarehouseId) {
              stockData.push({
                productId: detail.productId,
                updateId: branchStock.originWarehouseId,
                quantity: -branchStock.quantity,
                branchOrWarehouse: 'WAREHOUSE'
              });
            }
            if (branchStock.originBranchId) {
              stockData.push({
                productId: detail.productId,
                updateId: branchStock.originBranchId,
                quantity: -branchStock.quantity,
                branchOrWarehouse: 'BRANCH'
              });
            }
            if (branchStock.branchId) {
              stockData.push({
                productId: detail.productId,
                updateId: branchStock.branchId,
                quantity: branchStock.quantity,
                branchOrWarehouse: 'BRANCH'
              });
            }
            if (stockData.length > 0) {
              this.handleRpcError(this.natsClient.send('products.updateOrCreateStock', stockData));
            }
          }
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
      const branchIds = [
        ...new Set(updateTransaction.inventoryTransactionProducts.map(b => b.branchStock?.branchId)),
        ...new Set(updateTransaction.inventoryTransactionProducts.map(b => b.branchStock?.originBranchId)),
        ...new Set(updateTransaction.inventoryTransactionProducts.map(b => b.warehouseStock?.originBranchId)),
      ].filter(Boolean); // Filtrar valores `undefined` o `null`

      const warehouseIds = [
        ...new Set(updateTransaction.inventoryTransactionProducts.map(b => b.warehouseStock?.warehouseId)),
        ...new Set(updateTransaction.inventoryTransactionProducts.map(b => b.warehouseStock?.originWarehouseId)),
        ...new Set(updateTransaction.inventoryTransactionProducts.map(b => b.branchStock?.originWarehouseId)),
      ].filter(Boolean);

      // Consultar branches y warehouses solo si hay IDs
      const branches = branchIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_branches_by_ids', branchIds))
        : [];

      const warehouses = warehouseIds.length > 0
        ? await firstValueFrom(this.natsClient.send('get_warehouses_by_ids', warehouseIds))
        : [];
      // Mapear la respuesta para incluir los datos de branches y warehouses
      const updateTransactionWithDetails = {
        ...updateTransaction,
        inventoryTransactionProducts: updateTransaction.inventoryTransactionProducts.map(i => {
          const branchStock = {
            ...i.branchStock,
            originBranch: branches.find(b => b.id === i.branchStock?.originBranchId)
              ? { name: branches.find(b => b.id === i.branchStock?.originBranchId).name }
              : null,
            originWarehouse: warehouses.find(w => w.id === i.branchStock?.originWarehouseId)
              ? { name: warehouses.find(w => w.id === i.branchStock?.originWarehouseId).name }
              : null,
            branch: branches.find(b => b.id === i.branchStock?.branchId)
              ? { name: branches.find(b => b.id === i.branchStock?.branchId).name }
              : null,
          };

          // Si todos los valores en branchStock son null, establecerlo como null
          const isBranchStockNull = Object.values(branchStock).every(value => value === null);

          const warehouseStock = {
            ...i.warehouseStock,
            originWarehouse: warehouses.find(w => w.id === i.warehouseStock?.originWarehouseId)
              ? { name: warehouses.find(w => w.id === i.warehouseStock?.originWarehouseId).name }
              : null,
            originBranch: branches.find(b => b.id === i.warehouseStock?.originBranchId)
              ? { name: branches.find(b => b.id === i.warehouseStock?.originBranchId).name }
              : null,
            warehouse: warehouses.find(w => w.id === i.warehouseStock?.warehouseId)
              ? { name: warehouses.find(w => w.id === i.warehouseStock?.warehouseId).name }
              : null,
          };

          // Si todos los valores en warehouseStock son null, establecerlo como null
          const isWarehouseStockNull = Object.values(warehouseStock).every(value => value === null);

          return {
            ...i,
            branchStock: isBranchStockNull ? null : branchStock,
            warehouseStock: isWarehouseStockNull ? null : warehouseStock,
          };
        })
      };

      const updatedByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', updateTransaction.updatedByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching updatedByUser:', error);
            return of(null);
          })
        )
      );

      const createdByUser = await firstValueFrom(
        this.natsClient.send('auth.user.findOne', updateTransaction.createdByUserId).pipe(
          catchError((error) => {
            console.error('Error fetching createdByUser:', error);
            return of(null);
          })
        )
      );

      return {
        message: "Transacción actualizada con éxito",
        product: {
          ...updateTransactionWithDetails,
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
    return `This action updates a #${id} inventory`;
  }

  remove(id: string) {
    return `This action removes a #${id} inventory`;
  }
}
