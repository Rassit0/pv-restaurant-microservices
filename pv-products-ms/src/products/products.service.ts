import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { slugify } from 'src/common/helpers/slugify';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { LocationType, ProductType } from '@prisma/client';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { catchError, firstValueFrom, Observable, of } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductsService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async handleRpcError<T>(observable$: Observable<T>): Promise<T> {
    return firstValueFrom(
      observable$.pipe(
        catchError(error => {
          console.error('Error capturado en handleRpcError:', error);

          // Si el error tiene message y statusCode, lanzar un RpcException con esos datos
          if (error?.message && error?.statusCode) {
            throw new RpcException({
              message: error.message,
              statusCode: error.statusCode,
            });
          }

          // Si el error no tiene message ni statusCode, lanzar un error genérico
          throw new RpcException({
            message: 'Error desconocido al comunicarse con el microservicio.',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          });
        })
      )
    );
  }

  async create(createProductDto: CreateProductDto) {
    try {
      // Desestructuramos el DTO para extraer las propiedades de tipo array
      const {
        categories,
        // branchProductStock,
        // warehouseProductStock,
        typesProduct,
        userId,
        suppliers,
        ...productData // El resto de las propiedades se asignan a productData
      } = createProductDto;

      const productExists = await this.prisma.product.findUnique({
        where: {
          name: productData.name.toLowerCase()
        }
      });

      if (productExists) {
        throw new RpcException({
          message: "El nombre del producto ya está en uso.",
          statusCode: HttpStatus.BAD_REQUEST
        });
      }

      // Validar que no haya supplierId duplicados en suppliers
      if (suppliers) {
        const supplierIds = suppliers.map(s => s.supplierId);
        const duplicates = supplierIds.filter((id, idx) => supplierIds.indexOf(id) !== idx);
        if (duplicates.length > 0) {
          throw new RpcException({
            message: `No puede enviar supplierId(s) duplicados en suppliers: ${[...new Set(duplicates)].join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      // if (branchProductStock) {
      //   // Verificar si hay duplicados en branchProductStock
      //   const branchIds = branchProductStock.map(inventory => inventory.branchId);

      //   const uniqueBranchIds = new Set(branchIds); // Usamos un Set para filtrar duplicados

      //   if (branchIds.length !== uniqueBranchIds.size) {
      //     throw new RpcException({
      //       message: "No se pueden agregar duplicados de branchId en el inventario por sucursal.",
      //       statusCode: HttpStatus.BAD_REQUEST
      //     });
      //   }

      //   // Enviar solicitud al servicio de sucursales para validar los branchIds
      //   //   await firstValueFrom(
      //   //     this.natsClient.send('branches.validateIds', branchIds).pipe(
      //   //       catchError(error => {
      //   //         console.error('Error capturado al enviar mensaje:', error);

      //   //         // Si el error tiene message y statusCode, convertirlo en un RpcException
      //   //         if (error?.message && error?.statusCode) {
      //   //           throw new RpcException({
      //   //             message: error.message,
      //   //             statusCode: error.statusCode,
      //   //           });
      //   //         }

      //   //         // Si no tiene estas propiedades, lanzar un RpcException genérico
      //   //         throw new RpcException({
      //   //           message: 'Error desconocido al comunicarse con el servicio de sucursales.',
      //   //           statusCode: HttpStatus.INTERNAL_SERVER_ERROR, // Internal Server Error
      //   //         });
      //   //       })
      //   //     )
      //   //   );
      //   await this.handleRpcError(this.natsClient.send('branches.validateIds', branchIds));
      // }
      // Crea un nuevo registro en la vase de datos con Prisma ORM
      const newRecord = await this.prisma.product.create({
        data: {
          ...productData,
          slug: slugify(productData.name),
          createdByUserId: userId,
          // Relacionar categorías
          categories: {
            connect: categories.map(category => ({
              id: category.id
            }))
          },
          types: {
            create: typesProduct.map((type) => ({
              type: type
            }))
          },
          ...(suppliers && {
            suppliers: {
              create: suppliers.map((supplier) => ({
                supplierId: supplier.supplierId
              }))
            }
          })
        },
        include: {
          categories: true,
          types: {
            select: {
              id: true,
              type: true,
            }
          },
          suppliers: {
            select: {
              supplierId: true,
            }
          },
          locationProductStock: true,
        }
      });

      const locationProductStock = await Promise.all(
        newRecord.locationProductStock.map(async (lps) => {
          try {
            const branch = lps.locationType === LocationType.BRANCH ? await firstValueFrom(
              this.natsClient.send('findOneBranch', lps.locationId).pipe(
                catchError(error => {
                  console.error('Error fetching branch:', error);
                  return of(null);
                })
              )
            ) : null;

            const warehouse = lps.locationType === LocationType.WAREHOUSE ? await firstValueFrom(
              this.natsClient.send('findOneWarehouse', lps.locationId).pipe(
                catchError(error => {
                  console.error('Error fetching warehouse:', error);
                  return of(null);
                })
              )
            ) : null;

            return {
              ...lps,
              branch: branch ? {
                name: branch.name || null, // Manejar el caso de que `branch` sea `null`
              } : null,
              warehouse: warehouse ? {
                name: warehouse.name || null, // Manejar el caso de que `warehouse` sea `null`
              } : null,
            };
          } catch (error) {
            console.error('Error fetching branch:', error);
            return {
              ...lps,
              branch: null, // Valor por defecto en caso de error
              warehouse: null, // Valor por defecto en caso de error
            };
          }
        })
      );

      return {
        message: "Producto creado con éxito",
        product: {
          ...newRecord,
          locationProductStock
        }
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear el producto.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async findAll(paginationDto: ProductPaginationDto) {
    try {
      // Método para obtener todos los productos con paginación y búsqueda opcional.
      const { limit, page, search, status, filterByLocationId, orderBy, columnOrderBy, productIds } = paginationDto;
      // 'limit': Número máximo de productos por página
      // 'page' : Número de la página actual.
      // 'search' : Texto opcional para filtrar los productos.

      // Calcular el offset para la paginación
      const skip = limit ? (page - 1) * limit : undefined;

      const isValidProductType = (value: string): value is ProductType => {
        return Object.values(ProductType).includes(value as ProductType);
      };

      const products = await this.prisma.product.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        orderBy: {
          [columnOrderBy]: orderBy
        },
        where: {
          ...(productIds && productIds.length > 0 ? { id: { in: productIds } } : {}),
          // Filtro opcional basado en el campo "search" si esque existe
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
              { description: { contains: search, mode: 'insensitive' } },
              ...(isValidProductType(search) ? [{ types: { some: { type: { equals: search as ProductType } } } }] : []),
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
          // Filtro basado en locationId si está presente 
          ...(filterByLocationId && {
            locationProductStock: {
              some: {
                locationId: filterByLocationId
              }
            }
          }),
        },
        include: {
          unit: true,
          categories: true,
          locationProductStock: true,
          types: true,
          suppliers: {
            select: {
              supplierId: true, // Selecciona solo el campo supplierId
            }
          },
        }
      });

      // Contar el total de productos que cumplen el filtro (sin paginación)
      const totalItems = await this.prisma.product.count({
        where: {
          ...(productIds && productIds.length > 0 ? { id: { in: productIds } } : {}),
          OR: search
            ? [
              { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
              { description: { contains: search, mode: 'insensitive' } },
              ...(isValidProductType(search) ? [{ types: { some: { type: { equals: search as ProductType } } } }] : []),
            ]
            : undefined,
          // Filtro para el campo status (si está presente en el DTO)
          ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
          // Filtro basado en locationId si está presente 
          ...(filterByLocationId && {
            locationProductStock: {
              some: {
                locationId: filterByLocationId
              }
            }
          }),
        },
      });

      const productsAndBranchesAndWarehouses = await Promise.all(
        products.map(async (product) => {
          const locationProductStock = await Promise.all(
            product.locationProductStock.map(async (lps) => {
              try {
                const branch = lps.locationType === LocationType.BRANCH ? await firstValueFrom(
                  this.natsClient.send('findOneBranch', lps.locationId).pipe(
                    catchError(error => {
                      console.error('Error fetching branch:', error);
                      return of(null);
                    })
                  )
                ) : null;

                const warehouse = lps.locationType === LocationType.WAREHOUSE ? await firstValueFrom(
                  this.natsClient.send('findOneWarehouse', lps.locationId).pipe(
                    catchError(error => {
                      console.error('Error fetching warehouse:', error);
                      return of(null);
                    })
                  )
                ) : null;

                return {
                  ...lps,
                  branch: branch ? {
                    name: branch.name || null, // Manejar el caso de que `branch` sea `null`
                  } : null,
                  warehouse: warehouse ? {
                    name: warehouse.name || null, // Manejar el caso de que `warehouse` sea `null`
                  } : null,
                };
              } catch (error) {
                console.error('Error fetching branch:', error);
                return {
                  ...lps,
                  branch: null, // Valor por defecto en caso de error
                  warehouse: null, // Valor por defecto en caso de error
                };
              }
            })
          );

          // const warehouseProductStock = await Promise.all(
          //   product.warehouseProductStock.map(async (bps) => {
          //     try {
          //       const warehouse = await firstValueFrom(
          //         this.natsClient.send('findOneWarehouse', bps.warehouseId)
          //       );

          //       return {
          //         ...bps,
          //         nameWarehouse: warehouse?.name || null, // Manejar el caso de que `warehouse` sea `null`
          //       };
          //     } catch (error) {
          //       console.error('Error fetching warehouse:', error);
          //       return {
          //         ...bps,
          //         nameWarehouse: null, // Valor por defecto en caso de error
          //       };
          //     }
          //   })
          // );

          return {
            ...product,
            locationProductStock
          };
        })
      );


      return {
        products: productsAndBranchesAndWarehouses,
        meta: {
          totalItems, // Total de productos encontrados
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      };
    } catch (error) {
      console.log('Error al obtener la lista de productos:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de productos.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findOne(term: string) {
    const record = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: term },
          { slug: term }
        ]
      },
      include: {
        unit: true,
        categories: true,
        locationProductStock: true,
        types: true,
        suppliers: {
          select: {
            supplierId: true, // Selecciona solo el campo supplierId
          }
        }
      }
    });

    // Si no se encuentra ningún registro, lanza una excepción de tipo NotFoundException
    if (!record) {
      throw new RpcException({
        message: "No se encontro el producto",
        statusCode: HttpStatus.NOT_FOUND
      })
    }

    const locationProductStock = await Promise.all(
      record.locationProductStock.map(async (lps) => {
        try {
          const branch = lps.locationType === LocationType.BRANCH ? await firstValueFrom(
            this.natsClient.send('findOneBranch', lps.locationId).pipe(
              catchError(error => {
                console.error('Error fetching branch:', error);
                return of(null);
              })
            )
          ) : null;

          const warehouse = lps.locationType === LocationType.WAREHOUSE ? await firstValueFrom(
            this.natsClient.send('findOneWarehouse', lps.locationId).pipe(
              catchError(error => {
                console.error('Error fetching warehouse:', error);
                return of(null);
              })
            )
          ) : null;

          return {
            ...lps,
            branch: branch ? {
              name: branch.name || null, // Manejar el caso de que `branch` sea `null`
            } : null,
            warehouse: warehouse ? {
              name: warehouse.name || null, // Manejar el caso de que `warehouse` sea `null`
            } : null,
          };
        } catch (error) {
          console.error('Error fetching branch:', error);
          return {
            ...lps,
            branch: null, // Valor por defecto en caso de error
            warehouse: null, // Valor por defecto en caso de error
          };
        }
      })
    );

    // Devuelve el registro encontrado
    return {
      ...record,
      locationProductStock
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {

      // Verificamos si el producto existe antes de continuar con la actualización
      const existingProduct = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new RpcException({
          message: "Producto no encontrado",
          statusCode: HttpStatus.BAD_REQUEST // Envia el codigo 400
        });
      }
      // Validar que no exista otro producto con el mismo nombre
      if (updateProductDto.name) {
        const duplicateProduct = await this.prisma.product.findFirst({
          where: {
            name: updateProductDto.name,
            id: { not: id }, // Excluir el producto actual de la búsqueda
          },
        });

        if (duplicateProduct) {
          throw new RpcException({
            message: "El nombre del producto ya está en uso",
            statusCode: HttpStatus.BAD_REQUEST, // Envia el código 400
          });
        }
      }

      // Desestructuramos el DTO para extraer las propiedades de tipo array
      const {
        categories,
        // branchProductStock,
        // warehouseProductStock,
        unitId,
        typesProduct,
        userId,
        suppliers,
        ...productData // El resto de las propiedades se asignan a productData
      } = updateProductDto;

      // Validar que no haya supplierId duplicados en suppliers
      if (suppliers) {
        const supplierIds = suppliers.map(s => s.supplierId);
        const duplicates = supplierIds.filter((id, idx) => supplierIds.indexOf(id) !== idx);
        if (duplicates.length > 0) {
          throw new RpcException({
            message: `No puede enviar supplierId(s) duplicados en suppliers: ${[...new Set(duplicates)].join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      const updatedData = {
        ...productData,
        ...(productData.name && { slug: slugify(productData.name) }),
      }

      //Actualizar el registro existente en la base de datos con Prisma ORM
      const updatedRecord = await this.prisma.product.update({
        where: { id },
        data: {
          ...updatedData,
          updatedByUserId: userId,
          ...(updateProductDto.name && { slug: slugify(updateProductDto.name) }), // Agrega 'slug' solo si 'name' tiene un valor.
          ...(updateProductDto.categories && {
            categories: {
              set: updateProductDto.categories.map(category => ({
                id: category.id
              }))
            }
          }),
          ...(typesProduct && {
            types: {
              deleteMany: {
                productId: id, // Elimina inventarios anteriores relacionados al producto
              },
              createMany: {
                data: typesProduct.map((type) => ({
                  type
                }))
              }
            }
          }),
          ...(suppliers && {
            suppliers: {
              deleteMany: {
                productId: id, // Elimina inventarios anteriores relacionados al producto
              },
              createMany: {
                data: suppliers.map((supplier) => ({
                  supplierId: supplier.supplierId
                }))
              }
            }
          }),
        },
        include: {
          unit: true,
          categories: true,
        }
      });

      return {
        message: "Producto actualizado con éxito",
        product: updatedRecord
      }
    } catch (error) {
      console.log(error);
      /// Si el error es una instancia de RpcException
      if (error instanceof RpcException) {
        // Solo volvemos a lanzar el RpcException capturado
        throw error;
      }

      // Si no es un RpcException, creamos un nuevo RpcException con mensaje genérico
      throw new RpcException({
        message: 'Error al actualizar el producto',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR, // Envia código 500 para error general
      });
      // throw new Error('Error al actualizar el producto')
    }
  }

  async remove(id: string, userId: string) {
    // Verifica si el registro existe en la base de datos utilizando el ID proporcionado.
    const recordExists = await this.prisma.product.findUnique({
      where: { id }, // Filtra por el campo 'id'.
      include: {
        unit: true,
        categories: true,
        locationProductStock: true,
        types: true,
      }
    });

    // Si no existe el registro, lanza una excepción indicando que no se encontró.
    if (!recordExists) {
      throw new RpcException({
        message: "No se encontró  el producto",
        statusCode: HttpStatus.BAD_REQUEST // envia el codigo 400
      });
    }

    // Verifica si el producto tiene relaciones que lo bloquean para ser eliminado
    if (
      recordExists.locationProductStock.length > 0 //|| // Tiene composiciones
      // (recordExists.orders && recordExists.orders.length > 0) // Relación con órdenes (si aplica)
    ) {
      throw new RpcException({
        message: "No se puede eliminar el producto porque contiene información.",
        statusCode: HttpStatus.CONFLICT, // Envia el código 409 (conflicto)
      });
    }

    await this.prisma.typeProduct.deleteMany({
      where: { productId: id }
    })

    // Elimina el registro encontrado en la BD usando el ID
    await this.prisma.product.delete({
      where: { id }
    })

    // Retorna un mensaje de exito junto con el registro eliminado
    return {
      message: "Producto eliminado con éxito",
      product: recordExists
    }
  }

  async validateProductsIds(ids: string[]) {
    // 1️⃣ Elimina duplicados
    ids = Array.from(new Set(ids));

    // 2️⃣ Obtiene todos los productos solicitados (sin filtrar isEnable)
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, isEnable: true },
    });

    // 3️⃣ Clasifica resultados
    const foundIds = products.map(p => p.id);
    const inactive = products.filter(p => !p.isEnable);
    const missingIds = ids.filter(id => !foundIds.includes(id));

    // 3a ▸ Tip: prepara las cadenas ya formateadas
    const inactiveLabels = inactive.map(p => `${p.name} [${p.id}]`);
    const missingLabels = missingIds.map(id => `[${id}]`);

    // 4️⃣ Si hay problemas, arma mensaje claro
    if (inactiveLabels.length || missingLabels.length) {
      const partes: string[] = [];

      if (missingLabels.length) {
        partes.push(`no existen: ${missingLabels.join(', ')}`);
      }
      if (inactiveLabels.length) {
        partes.push(`están inactivos: ${inactiveLabels.join(', ')}`);
      }

      throw new RpcException({
        message: `Los siguientes productos ${partes.join(' y ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // 5️⃣ Devuelve solo los productos activos
    return products.filter(p => p.isEnable);
  }


  async updateOrCreateStockLocations(stockUpdates: { productId: string, locationType: LocationType, updateId: string, quantity: number }[]) {
    try {
      const updatePromises = stockUpdates.map(async ({ productId, updateId, quantity, locationType }) => {
        // Buscar el registro actual
        const existing = await this.prisma.locationProductStock.findUnique({
          where: {
            productId_locationId_locationType: { productId, locationId: updateId, locationType }
          }
        });

        if (existing) {
          const newStock = Number(existing.stock) + quantity;
          if (newStock <= 0) {
            // Eliminar si el stock llega a 0 o menos
            await this.prisma.locationProductStock.delete({
              where: {
                productId_locationId_locationType: { productId, locationId: updateId, locationType }
              }
            });
            return null;
          } else {
            return this.prisma.locationProductStock.update({
              where: {
                productId_locationId_locationType: { productId, locationId: updateId, locationType }
              },
              data: { stock: newStock }
            });
          }
        } else {
          // Solo crear si la cantidad es mayor a 0
          if (quantity > 0) {
            return this.prisma.locationProductStock.create({
              data: {
                productId,
                locationId: updateId,
                locationType,
                stock: quantity
              }
            });
          } else {
            // No crear si la cantidad es 0 o negativa
            return null;
          }
        }
      });


      const results = await Promise.all(updatePromises);
      console.error(results)
      return results;
    } catch (error) {
      console.error('Error en updateOrCreateStock:', error);
      throw new RpcException({
        message: 'Error al actualizar o crear el stock en sucursales o almacenes.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getStock({
    productId,
    locationId,
    locationType,
  }: {
    productId: string;
    locationId: string;
    locationType: LocationType;
  }): Promise<number> {
    try {
      // 🔹 Buscar el stock directamente (si el producto no existe, no habrá stock)
      const stockLocation = await this.prisma.locationProductStock.findUnique({
        where: {
          productId_locationId_locationType: {
            productId,
            locationId,
            locationType,
          }
        },
        select: {
          stock: true,
          product: {
            select: { isEnable: true },
          },
        },
      });

      // 🔸 Si no existe la fila (no hay stock registrado), verificar si el producto existe
      if (!stockLocation) {
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: { id: true }, // solo necesitamos confirmar existencia
        });

        if (!product) {
          throw new RpcException({
            message: `El producto con ID [${productId}] no existe.`,
            statusCode: HttpStatus.NOT_FOUND,
          });
        }

        return 0; // producto existe, pero no hay stock registrado en esa ubicación
      }

      // 🔸 Si el producto está inactivo (por seguridad)
      if (!stockLocation.product.isEnable) {
        throw new RpcException({
          message: `El producto con ID [${productId}] está inactivo.`,
          statusCode: HttpStatus.BAD_REQUEST,
        });
      }

      return stockLocation.stock.toNumber();
    } catch (error) {
      console.error('Error en getStock:', error);

      throw new RpcException({
        message: 'Error al obtener el stock en la ubicación.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async getProductsByIds(ids: string[]) {
    try {
      if (!ids || ids.length === 0) {
        return [];
      }

      // Consultar las sucursales en la db
      const products = await this.prisma.product.findMany({
        where: { id: { in: ids } },
        include: {
          unit: {
            select: {
              abbreviation: true,
              name: true,
            }
          }
        }
      });

      return products;
    } catch (error) {
      console.log('Error al obtener los productos', error);
      return [];
    }
  }

  // Método para obtener productos con bajo stock
  async getLowStockProducts() {
    try {
      const lowStockMessages: { slug: string, message: string }[] = [];  // Definimos un arreglo de objetos con `slug` y `message`

      // Obtener productos con su mínimo stock
      const productsWithMinStock = await this.prisma.product.findMany({
        select: { id: true, name: true, slug: true, minimumStock: true },
      });

      // Iterar sobre cada producto y verificar su stock en sucursales y almacenes
      for (const product of productsWithMinStock) {


        const locationStocks = await this.prisma.locationProductStock.findMany({
          where: {
            productId: product.id,
            stock: { lt: product.minimumStock },
          },
          // include: { branch: true }, // Incluir información de la sucursal
        });

        // Buscar stock en sucursales
        // const branchStocks = await this.prisma.branchProductStock.findMany({
        //   where: {
        //     productId: product.id,
        //     stock: { lt: product.minimumStock },
        //   },
        //   // include: { branch: true }, // Incluir información de la sucursal
        // });

        // // Buscar stock en almacenes
        // const warehouseStocks = await this.prisma.warehouseProductStock.findMany({
        //   where: {
        //     productId: product.id,
        //     stock: { lt: product.minimumStock },
        //   },
        // include: { warehouse: true }, // Incluir información del almacén
        // });

        const locationStocksAndLocationName = await Promise.all(
          locationStocks.map(async (ls) => {
            const locationBranch = ls.locationType === LocationType.BRANCH ? await firstValueFrom(
              this.natsClient.send('findOneBranch', ls.locationId).pipe(
                catchError(error => {
                  console.error('Error fetching branch:', error);
                  return of(null);
                })
              )
            ) : null;
            const locationWarehouse = ls.locationType === LocationType.WAREHOUSE ? await firstValueFrom(
              this.natsClient.send('findOneWarehouse', ls.locationId).pipe(
                catchError(error => {
                  console.error('Error fetching warehouse:', error);
                  return of(null);
                })
              )
            ) : null;

            return {
              ...ls,
              branch: locationBranch ? {
                name: locationBranch.name || null, // Manejar el caso de que `branch` sea `null`
              } : null,
              warehouse: locationWarehouse ? {
                name: locationWarehouse.name || null, // Manejar el caso de que `warehouse` sea `null`
              } : null
            };
          }));

        // const branchStocksAndBranchName = await Promise.all(
        //   branchStocks.map(async (bs) => {
        //     try {
        //       const branch = await firstValueFrom(
        //         this.natsClient.send('findOneBranch', bs.branchId)
        //       );

        //       return {
        //         ...bs,
        //         nameBranch: branch?.name || null, // Manejar el caso de que `branch` sea `null`
        //       };
        //     } catch (error) {
        //       console.error('Error fetching branch:', error);
        //       return {
        //         ...bs,
        //         nameBranch: null, // Valor por defecto en caso de error
        //       };
        //     }
        //   })
        // );

        // const warehouseStocksAndWarehouseName = await Promise.all(
        //   warehouseStocks.map(async (ws) => {
        //     try {
        //       const warehouse = await firstValueFrom(
        //         this.natsClient.send('findOneWarehouse', ws.warehouseId)
        //       );

        //       return {
        //         ...ws,
        //         nameWarehouse: warehouse?.name || null, // Manejar el caso de que `warehouse` sea `null`
        //       };
        //     } catch (error) {
        //       console.error('Error fetching warehouse:', error);
        //       return {
        //         ...ws,
        //         nameWarehouse: null, // Valor por defecto en caso de error
        //       };
        //     }
        //   })
        // );

        // Generar mensajes de bajo stock
        // Mensajes para ubicaciones (sucursales y almacenes) 
        locationStocksAndLocationName.forEach(locationStock => {
          if (locationStock.branch) {
            lowStockMessages.push({
              slug: product.slug,
              message: `El producto '${product.name}' tiene bajo stock en la sucursal '${locationStock.branch.name}' (Stock: ${locationStock.stock}, Mínimo: ${product.minimumStock}).`,
            });
          } else if (locationStock.warehouse) {
            lowStockMessages.push({
              slug: product.slug,
              message: `El producto '${product.name}' tiene bajo stock en el almacén '${locationStock.warehouse.name}' (Stock: ${locationStock.stock}, Mínimo: ${product.minimumStock}).`
            });
          }
        });

        // Generar mensajes de sucursales
        // branchStocksAndBranchName.forEach(branchStock => {
        //   lowStockMessages.push({
        //     slug: product.slug,
        //     message: `El producto '${product.name}' tiene bajo stock en la sucursal '${branchStock.nameBranch}' (Stock: ${branchStock.stock}, Mínimo: ${product.minimumStock}).`,
        //   });
        // });

        // // Generar mensajes de almacenes
        // warehouseStocksAndWarehouseName.forEach(warehouseStock => {
        //   lowStockMessages.push({
        //     slug: product.slug,
        //     message: `El producto '${product.name}' tiene bajo stock en el almacén '${warehouseStock.nameWarehouse}' (Stock: ${warehouseStock.stock}, Mínimo: ${product.minimumStock}).`
        //   });
        // });
      }

      return lowStockMessages;
    } catch (error) {
      console.error("Error al obtener productos con bajo stock:", error);
      throw new Error("No se pudo obtener la lista de productos con bajo stock");
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async validateSupplierIds({ productId, supplierIds }: { productId: string, supplierIds: string[] }) {
    // Eliminar duplicados y vacíos
    supplierIds = Array.from(new Set(supplierIds.filter(Boolean)));

    // Buscar el producto y sus suppliers asociados
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        suppliers: {
          select: { supplierId: true }
        }
      }
    });

    if (!product) {
      throw new RpcException({
        message: `El producto ${productId} no existe.`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const associatedSupplierIds = product.suppliers.map(s => s.supplierId);

    // Filtrar los supplierIds que no están asociados al producto
    const missingIds = supplierIds.filter(id => !associatedSupplierIds.includes(id));

    if (missingIds.length > 0) {
      throw new RpcException({
        message: `Los siguientes proveedores no están relacionados con el producto ${productId}: ${missingIds.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }

  async getSupplierIdsByProduct(term: string) {
    // Validar proveedores existentes
    const productExists = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: term },
          { slug: term }
        ]
      },
      include: {
        suppliers: {
          select: {
            supplierId: true, // Selecciona solo el campo supplierId
          }
        }
      }
    });

    // Verificar que se encontraron todas
    if (!productExists) {
      throw new RpcException({
        message: `El producto ${term} no existe.`,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }


    return {
      term,
      supplierIds: productExists.suppliers.map(supplier => supplier.supplierId),
    };
  }

}
