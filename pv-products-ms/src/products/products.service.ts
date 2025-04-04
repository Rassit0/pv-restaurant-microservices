import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoriesService } from 'src/categories/categories.service';
import { slugify } from 'src/common/helpers/slugify';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { contains, equals } from 'class-validator';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ProductType } from '@prisma/client';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { catchError, firstValueFrom, Observable } from 'rxjs';
import { NATS_SERVICE } from 'src/config';

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
        branchProductStock,
        warehouseProductStock,
        suppliersProduct,
        typesProduct,
        userId,
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

      if (branchProductStock) {
        // Verificar si hay duplicados en branchProductStock
        const branchIds = branchProductStock.map(inventory => inventory.branchId);

        const uniqueBranchIds = new Set(branchIds); // Usamos un Set para filtrar duplicados

        if (branchIds.length !== uniqueBranchIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados de branchId en el inventario por sucursal.",
            statusCode: HttpStatus.BAD_REQUEST
          });
        }

        // Enviar solicitud al servicio de sucursales para validar los branchIds
        //   await firstValueFrom(
        //     this.natsClient.send('branches.validateIds', branchIds).pipe(
        //       catchError(error => {
        //         console.error('Error capturado al enviar mensaje:', error);

        //         // Si el error tiene message y statusCode, convertirlo en un RpcException
        //         if (error?.message && error?.statusCode) {
        //           throw new RpcException({
        //             message: error.message,
        //             statusCode: error.statusCode,
        //           });
        //         }

        //         // Si no tiene estas propiedades, lanzar un RpcException genérico
        //         throw new RpcException({
        //           message: 'Error desconocido al comunicarse con el servicio de sucursales.',
        //           statusCode: HttpStatus.INTERNAL_SERVER_ERROR, // Internal Server Error
        //         });
        //       })
        //     )
        //   );
        await this.handleRpcError(this.natsClient.send('branches.validateIds', branchIds));
      }
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
          // Crear stock por sucursal (si existe)       
          branchProductStock: branchProductStock
            ? {
              create: branchProductStock
            }
            : undefined,
          // Crear tock por almacén (si existe)       
          warehouseProductStock: warehouseProductStock
            ? {
              create: warehouseProductStock
            }
            : undefined,
          suppliersProduct: suppliersProduct
            ? {
              create: suppliersProduct
            }
            : undefined,
          types: {
            create: typesProduct.map((type) => ({
              type: type
            }))
          },
        },
        include: {
          categories: true,
        }
      });

      return {
        message: "Producto creado con éxito",
        product: newRecord
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
      const { limit, page, search, status, branchId, warehouseId, orderBy, columnOrderBy, productIds } = paginationDto;
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
          // Filtro basado en branchId si está presente
          ...(branchId && {
            branchProductStock: {
              some: {
                branchId
              }
            }
          }),
          // Filtro basado en warehouseId si está presente
          ...(warehouseId && {
            warehouseProductStock: {
              some: {
                warehouseId
              }
            }
          }),
        },
        include: {
          unit: true,
          categories: true,
          branchProductStock: true,
          warehouseProductStock: true,
          suppliersProduct: {
            select: {
              supplierId: true,
            }
          },
          types: true,
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
          // Filtro basado en brnachId si está presente
          ...(branchId && {
            branchProductStock: {
              some: {
                branchId
              }
            }
          }),
          // Filtro basado en warehouseId si está presente
          ...(warehouseId && {
            warehouseProductStock: {
              some: {
                warehouseId
              }
            }
          }),
        },
      });

      const productsAndBranchesAndWarehouses = await Promise.all(
        products.map(async (product) => {
          const branchProductStock = await Promise.all(
            product.branchProductStock.map(async (bps) => {
              try {
                const branch = await firstValueFrom(
                  this.natsClient.send('findOneBranch', bps.branchId)
                );

                return {
                  ...bps,
                  nameBranch: branch?.name || null, // Manejar el caso de que `branch` sea `null`
                };
              } catch (error) {
                console.error('Error fetching branch:', error);
                return {
                  ...bps,
                  nameBranch: null, // Valor por defecto en caso de error
                };
              }
            })
          );

          const warehouseProductStock = await Promise.all(
            product.warehouseProductStock.map(async (bps) => {
              try {
                const warehouse = await firstValueFrom(
                  this.natsClient.send('findOneWarehouse', bps.warehouseId)
                );

                return {
                  ...bps,
                  nameWarehouse: warehouse?.name || null, // Manejar el caso de que `warehouse` sea `null`
                };
              } catch (error) {
                console.error('Error fetching warehouse:', error);
                return {
                  ...bps,
                  nameWarehouse: null, // Valor por defecto en caso de error
                };
              }
            })
          );

          return {
            ...product,
            branchProductStock,
            warehouseProductStock
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
        branchProductStock: true,
        warehouseProductStock: true,
        suppliersProduct: {
          select: {
            supplierId: true,
          }
        },
        types: true,
      }
    });

    // Si no se encuentra ningún registro, lanza una excepción de tipo NotFoundException
    if (!record) {
      throw new RpcException({
        message: "No se encontro el producto",
        statusCode: HttpStatus.NOT_FOUND
      })
    }

    const branchProductStock = await Promise.all(
      record.branchProductStock.map(async (bps) => {
        try {
          const branch = await firstValueFrom(
            this.natsClient.send('findOneBranch', bps.branchId)
          );

          return {
            ...bps,
            nameBranch: branch?.name || null, // Manejar el caso de que `branch` sea `null`
          };
        } catch (error) {
          console.error('Error fetching branch:', error);
          return {
            ...bps,
            nameBranch: null, // Valor por defecto en caso de error
          };
        }
      })
    );

    const warehouseProductStock = await Promise.all(
      record.warehouseProductStock.map(async (bps) => {
        try {
          const warehouse = await firstValueFrom(
            this.natsClient.send('findOneWarehouse', bps.warehouseId)
          );

          return {
            ...bps,
            nameWarehouse: warehouse?.name || null, // Manejar el caso de que `warehouse` sea `null`
          };
        } catch (error) {
          console.error('Error fetching warehouse:', error);
          return {
            ...bps,
            nameWarehouse: null, // Valor por defecto en caso de error
          };
        }
      })
    );

    // Devuelve el registro encontrado
    return {
      ...record,
      branchProductStock,
      warehouseProductStock
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
        branchProductStock,
        warehouseProductStock,
        suppliersProduct,
        unitId,
        typesProduct,
        userId,
        ...productData // El resto de las propiedades se asignan a productData
      } = updateProductDto;

      if (branchProductStock) {
        // Verificar si hay duplicados en branchProductInventory
        const branchIds = branchProductStock.map(inventory => inventory.branchId);

        const uniqueBranchIds = new Set(branchIds); // Usamos un Set para filtrar duplicados

        if (branchIds.length !== uniqueBranchIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados de branchId en el inventario por sucursal.",
            statusCode: HttpStatus.BAD_REQUEST
          });
        }

        // Enviar solicitud al servicio de sucursales para validar los branchIds
        await this.handleRpcError(this.natsClient.send('branches.validateIds', branchIds));
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
          ...(branchProductStock && {
            branchProductStock: {
              deleteMany: {
                productId: id, // Elimina inventarios anteriores relacionados al producto
              },
              createMany: {
                data: branchProductStock
              }
            }
          }),
          ...(suppliersProduct && {
            suppliersProduct: {
              deleteMany: {
                productId: id, // Elimina inventarios anteriores relacionados al producto
              },
              createMany: {
                data: suppliersProduct
              }
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
        branchProductStock: true,
        warehouseProductStock: true,
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
      recordExists.branchProductStock.length > 0 || recordExists.warehouseProductStock.length > 0 //|| // Tiene composiciones
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
    // Eliminar duplicados
    ids = Array.from(new Set(ids));

    // Validar sucursales existentes
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: ids
        },
      },
    });

    // Verificar que se encontraron todas
    if (products.length !== ids.length) {
      const foundIds = products.map(product => product.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));

      throw new RpcException({
        message: `No se encontraron los siguientes productos: ${missingIds.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
      })
    }

    return products;
  }

  async verifyStockWarehouse(productId: string, warehouseId: string) {
    try {
      const warehouseStock = await this.prisma.warehouseProductStock.findFirst({
        where: {
          productId: productId,
          warehouseId: warehouseId,
        }
      });

      if (!warehouseStock) {
        return 0;
        // throw new RpcException({
        //   message: `No se encontró stock para el producto con ID ${productId} en el almacén con ID ${warehouseId}.`,
        //   statusCode: HttpStatus.BAD_REQUEST,
        // });
      }

      return warehouseStock.stock;
    } catch (error) {
      if (error instanceof RpcException) throw error; // Si ya es una RpcException, re-lanzarla
      console.error('Error en verifyStockWarehouse:', error); // Registrar el error para depuración
      throw new RpcException({
        message: 'Error al verificar el stock del producto.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // async updateOrCreateStockWarehouse(stockUpdates: { productId: string, warehouseId: string, quantity: number }[]) {
  //   try {
  //     const updatePromises = stockUpdates.map(async ({ productId, warehouseId, quantity }) => {
  //       return this.prisma.warehouseProductStock.upsert({
  //         where: {
  //           productId_warehouseId: { productId, warehouseId } // Usa una clave compuesta si existe
  //         },
  //         update: {
  //           stock: { increment: quantity } // Suma al stock existente
  //         },
  //         create: {
  //           productId,
  //           warehouseId,
  //           stock: quantity // Crea un nuevo registro con la cantidad inicial
  //         }
  //       });
  //     });

  //     const results = await Promise.all(updatePromises);
  //     return results;
  //   } catch (error) {
  //     console.error('Error en updateOrCreateStockWarehouse:', error);
  //     throw new RpcException({
  //       message: 'Error al actualizar o crear el stock en almacenes.',
  //       statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  //     });
  //   }
  // }

  async updateOrCreateStock(stockUpdates: { productId: string, branchOrWarehouse: 'BRANCH' | 'WAREHOUSE', updateId: string, quantity: number }[]) {
    try {
      const updatePromises = stockUpdates.map(async ({ productId, updateId, quantity, branchOrWarehouse }) => {
        if (branchOrWarehouse === 'WAREHOUSE') {
          return this.prisma.warehouseProductStock.upsert({
            where: {
              productId_warehouseId: { productId, warehouseId: updateId } // Usa una clave compuesta si existe
            },
            update: {
              stock: { increment: quantity } // Suma al stock existente
            },
            create: {
              productId,
              warehouseId: updateId,
              stock: quantity // Crea un nuevo registro con la cantidad inicial
            }
          });
        }
        if (branchOrWarehouse === 'BRANCH') {
          return this.prisma.branchProductStock.upsert({
            where: {
              productId_branchId: { productId, branchId: updateId } // Usa una clave compuesta si existe
            },
            update: {
              stock: { increment: quantity } // Suma al stock existente
            },
            create: {
              productId,
              branchId: updateId,
              stock: quantity // Crea un nuevo registro con la cantidad inicial
            }
          });
        }
      });

      const results = await Promise.all(updatePromises);
      return results;
    } catch (error) {
      console.error('Error en updateOrCreateStockWarehouse:', error);
      throw new RpcException({
        message: 'Error al actualizar o crear el stock en sucursales o almacenes.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async verifyStockBranch(productId: string, branchId: string) {
    try {
      const branchStock = await this.prisma.branchProductStock.findFirst({
        where: {
          productId: productId,
          branchId: branchId,
        }
      });

      if (!branchStock) {
        return 0;
        // throw new RpcException({
        //   message: `No se encontró stock para el producto con ID ${productId} en la sucursal con ID ${branchId}.`,
        //   statusCode: HttpStatus.BAD_REQUEST,
        // });
      }

      return branchStock.stock;
    } catch (error) {
      if (error instanceof RpcException) throw error; // Si ya es una RpcException, re-lanzarla
      console.error('Error en verifyStockBranch:', error); // Registrar el error para depuración
      throw new RpcException({
        message: 'Error al verificar el stock del producto.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  // async updateOrCreateStockBranch(stockUpdates: { productId: string, branchId: string, quantity: number }[]) {
  //   try {
  //     const updatePromises = stockUpdates.map(async ({ productId, branchId, quantity }) => {
  //       return this.prisma.branchProductStock.upsert({
  //         where: {
  //           productId_branchId: { productId, branchId } // Usa una clave compuesta si existe
  //         },
  //         update: {
  //           stock: { increment: quantity } // Suma al stock existente
  //         },
  //         create: {
  //           productId,
  //           branchId,
  //           stock: quantity // Crea un nuevo registro con la cantidad inicial
  //         }
  //       });
  //     });

  //     const results = await Promise.all(updatePromises);
  //     return results;
  //   } catch (error) {
  //     console.error('Error en updateOrCreateStockWarehouse:', error);
  //     throw new RpcException({
  //       message: 'Error al actualizar o crear el stock en almacenes.',
  //       statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  //     });
  //   }
  // }


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

  async getLowStockProducts() {
    try {
      const lowStockMessages: { slug: string, message: string }[] = [];  // Definimos un arreglo de objetos con `slug` y `message`

      // Obtener productos con su mínimo stock
      const productsWithMinStock = await this.prisma.product.findMany({
        select: { id: true, name: true, slug: true, minimumStock: true },
      });

      // Iterar sobre cada producto y verificar su stock en sucursales y almacenes
      for (const product of productsWithMinStock) {
        // Buscar stock en sucursales
        const branchStocks = await this.prisma.branchProductStock.findMany({
          where: {
            productId: product.id,
            stock: { lt: product.minimumStock },
          },
          // include: { branch: true }, // Incluir información de la sucursal
        });

        // Buscar stock en almacenes
        const warehouseStocks = await this.prisma.warehouseProductStock.findMany({
          where: {
            productId: product.id,
            stock: { lt: product.minimumStock },
          },
          // include: { warehouse: true }, // Incluir información del almacén
        });

        const branchStocksAndBranchName = await Promise.all(
          branchStocks.map(async (bs) => {
            try {
              const branch = await firstValueFrom(
                this.natsClient.send('findOneBranch', bs.branchId)
              );

              return {
                ...bs,
                nameBranch: branch?.name || null, // Manejar el caso de que `branch` sea `null`
              };
            } catch (error) {
              console.error('Error fetching branch:', error);
              return {
                ...bs,
                nameBranch: null, // Valor por defecto en caso de error
              };
            }
          })
        );

        const warehouseStocksAndWarehouseName = await Promise.all(
          warehouseStocks.map(async (ws) => {
            try {
              const warehouse = await firstValueFrom(
                this.natsClient.send('findOneWarehouse', ws.warehouseId)
              );

              return {
                ...ws,
                nameWarehouse: warehouse?.name || null, // Manejar el caso de que `warehouse` sea `null`
              };
            } catch (error) {
              console.error('Error fetching warehouse:', error);
              return {
                ...ws,
                nameWarehouse: null, // Valor por defecto en caso de error
              };
            }
          })
        );

        // Generar mensajes de sucursales
        branchStocksAndBranchName.forEach(branchStock => {
          lowStockMessages.push({
            slug: product.slug,
            message: `El producto '${product.name}' tiene bajo stock en la sucursal '${branchStock.nameBranch}' (Stock: ${branchStock.stock}, Mínimo: ${product.minimumStock}).`,
          });
        });

        // Generar mensajes de almacenes
        warehouseStocksAndWarehouseName.forEach(warehouseStock => {
          lowStockMessages.push({
            slug: product.slug,
            message: `El producto '${product.name}' tiene bajo stock en el almacén '${warehouseStock.nameWarehouse}' (Stock: ${warehouseStock.stock}, Mínimo: ${product.minimumStock}).`
          });
        });
      }

      return lowStockMessages;
    } catch (error) {
      console.error("Error al obtener productos con bajo stock:", error);
      throw new Error("No se pudo obtener la lista de productos con bajo stock");
    } finally {
      await this.prisma.$disconnect();
    }
  }


  async stockWarehouseExists(warehouseId: string) {
    try {
      const warehouseStock = await this.prisma.warehouseProductStock.findFirst({
        where: {
          warehouseId: warehouseId,
        }
      });

      if (!warehouseStock) {
        return false;
      } else {
        return true;
      }

    } catch (error) {
      if (error instanceof RpcException) throw error; // Si ya es una RpcException, re-lanzarla
      console.error('Error en stockWarehouseExists:', error); // Registrar el error para depuración
      throw new RpcException({
        message: 'Error al verificar si existe stock en el almacén.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async stockBranchExists(branchId: string) {
    try {
      const branchStock = await this.prisma.branchProductStock.findFirst({
        where: {
          branchId: branchId,
        }
      });

      if (!branchStock) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      if (error instanceof RpcException) throw error; // Si ya es una RpcException, re-lanzarla
      console.error('Error en stockBranchExists:', error); // Registrar el error para depuración
      throw new RpcException({
        message: 'Error al verificar si existe stock en la sucursal.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

}
