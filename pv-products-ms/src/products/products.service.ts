import { HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoriesService } from 'src/categories/categories.service';
import { slugify } from 'src/common/helpers/slugify';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { contains } from 'class-validator';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ProductType } from '@prisma/client';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { NATS_SERVICE } from 'src/config';

@Injectable()
export class ProductsService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async create(createProductDto: CreateProductDto) {
    try {
      // Desestructuramos el DTO para extraer las propiedades de tipo array
      const {
        categories,
        branchProductInventory,
        ...productData // El resto de las propiedades se asignan a productData
      } = createProductDto;

      const productExists = await this.prisma.product.findUnique({
        where: {
          name: productData.name.toLowerCase()
        }
      });
      
      if(productExists){
        throw new RpcException({
          message: "El nombre del producto ya está en uso.",
          statusCode: HttpStatus.BAD_REQUEST
        });
      }

      if (branchProductInventory) {
        // Verificar si hay duplicados en branchProductInventory
        const branchIds = branchProductInventory.map(inventory => inventory.branchId);

        const uniqueBranchIds = new Set(branchIds); // Usamos un Set para filtrar duplicados

        if (branchIds.length !== uniqueBranchIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados de branchId en el inventario por sucursal.",
            statusCode: HttpStatus.BAD_REQUEST
          });
        }

        // Enviar solicitud al servicio de sucursales para validar los branchIds
        await firstValueFrom(
          this.natsClient.send('branches.validateIds', branchIds).pipe(
            catchError(error => {
              console.error('Error capturado al enviar mensaje:', error);

              // Si el error tiene message y statusCode, convertirlo en un RpcException
              if (error?.message && error?.statusCode) {
                throw new RpcException({
                  message: error.message,
                  statusCode: error.statusCode,
                });
              }

              // Si no tiene estas propiedades, lanzar un RpcException genérico
              throw new RpcException({
                message: 'Error desconocido al comunicarse con el servicio de sucursales.',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR, // Internal Server Error
              });
            })
          )
        );
      }
      // Crea un nuevo registro en la vase de datos con Prisma ORM
      const newRecord = await this.prisma.product.create({
        data: {
          ...productData,
          slug: slugify(productData.name),
          // Relacionar categorías
          categories: {
            connect: categories.map(category => ({
              id: category.id
            }))
          },
          // Crear inventario por sucursal (si existe)       
          branchProductInventory: branchProductInventory
            ? {
              create: branchProductInventory.map((inventory) => ({
                branchId: inventory.branchId,
                stock: inventory.stock,
                minimumStock: inventory.minimumStock,
                reorderPoint: inventory.reorderPoint,
                warehouseId: inventory.warehouseId,
                purchasePriceOverride: inventory.purchasePriceOverride
              }))
            }
            : undefined,
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
      console.log(error)
    }
  }

  async findAll(paginationDto: ProductPaginationDto) {

    // Método para obtener todos los productos con paginación y búsqueda opcional.
    const { limit, page, search, status, branchId } = paginationDto;
    // 'limit': Número máximo de productos por página
    // 'page' : Número de la página actual.
    // 'search' : Texto opcional para filtrar los productos.

    // Calcular el offset para la paginación
    const skip = (page - 1) * limit;

    const isValidProductType = (value: string): value is ProductType => {
      return Object.values(ProductType).includes(value as ProductType);
    };

    const products = await this.prisma.product.findMany({
      skip, // Desplazamiento para la paginación
      take: limit? limit : undefined, // si es 0 devuelve todo
      orderBy: {
        name: 'asc'
      },
      where: {
        // Filtro opcional basado en el campo "search" si esque existe
        OR: search
          ? [
            { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            { description: { contains: search, mode: 'insensitive' } },
            ...(isValidProductType(search) ? [{ type: { equals: search as ProductType } }] : []),
          ]
          : undefined,
        // Filtro para el campo status (si está presente en el DTO)
        ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        // Filtro basado en brnachId si está presente
        ...(branchId && {
          branchProductInventory: {
            some: {
              branchId
            }
          }
        }),
      },
      include: {
        unit: true,
        categories: true,
        branchProductInventory: true,
      }
    });

    // Contar el total de productos que cumplen el filtro (sin paginación)
    const totalItems = await this.prisma.product.count({
      where: {
        OR: search
          ? [
            { name: { contains: search, mode: 'insensitive' } }, // insensitive q no distingue de mayusculas o minusculas
            { description: { contains: search, mode: 'insensitive' } },
            ...(isValidProductType(search) ? [{ type: { equals: search as ProductType } }] : []),
          ]
          : undefined,
        // Filtro para el campo status (si está presente en el DTO)
        ...((status && status !== 'all') && { isEnable: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        // Filtro basado en brnachId si está presente
        ...(branchId && {
          branchProductInventory: {
            some: {
              branchId
            }
          }
        }),
      },
    });

    return {
      products,
      meta: {
        totalItems, // Total de productos encontrados
        itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
        totalPages: limit? Math.ceil(totalItems / limit) : 1, // Total de páginas
        currentPage: page, // Página actual
      }
    };
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
        branchProductInventory: true,
      }
    });

    // Si no se encuentra ningún registro, lanza una excepción de tipo NotFoundException
    if (!record) {
      throw new RpcException({
        message: "No se encontro el producto",
        statusCode: HttpStatus.NOT_FOUND
      })
    }

    // Devuelve el registro encontrado
    return record;
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
        branchProductInventory,
        unitId,
        ...productData // El resto de las propiedades se asignan a productData
      } = updateProductDto;

      if (branchProductInventory) {
        // Verificar si hay duplicados en branchProductInventory
        const branchIds = branchProductInventory.map(inventory => inventory.branchId);

        const uniqueBranchIds = new Set(branchIds); // Usamos un Set para filtrar duplicados

        if (branchIds.length !== uniqueBranchIds.size) {
          throw new RpcException({
            message: "No se pueden agregar duplicados de branchId en el inventario por sucursal.",
            statusCode: HttpStatus.BAD_REQUEST
          });
        }

        // Enviar solicitud al servicio de sucursales para validar los branchIds
        await firstValueFrom(
          this.natsClient.send('branches.validateIds', branchIds).pipe(
            catchError(error => {
              console.error('Error capturado al enviar mensaje:', error);

              // Si el error tiene message y statusCode, convertirlo en un RpcException
              if (error?.message && error?.statusCode) {
                throw new RpcException({
                  message: error.message,
                  statusCode: error.statusCode,
                });
              }

              // Si no tiene estas propiedades, lanzar un RpcException genérico
              throw new RpcException({
                message: 'Error desconocido al comunicarse con el servicio de sucursales.',
                statusCode: 500, // Internal Server Error
              });
            })
          )
        );
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
          ...(updateProductDto.name && { slug: slugify(updateProductDto.name) }), // Agrega 'slug' solo si 'name' tiene un valor.
          ...(updateProductDto.categories && {
            categories: {
              set: updateProductDto.categories.map(category => ({
                id: category.id
              }))
            }
          }),
          ...(branchProductInventory && {
            branchProductInventory: {
              deleteMany: {
                productId: id, // Elimina inventarios anteriores relacionados al producto
              },
              createMany: {
                data: branchProductInventory.map((inventory) => (inventory))
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

  async remove(id: string) {
    // Verifica si el registro existe en la base de datos utilizando el ID proporcionado.
    const recordExists = await this.prisma.product.findUnique({
      where: { id }, // Filtra por el campo 'id'.
      include: {
        unit: true,
        categories: true,
        branchProductInventory: true,
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
      recordExists.branchProductInventory.length > 0 //|| // Tiene composiciones
      // (recordExists.orders && recordExists.orders.length > 0) // Relación con órdenes (si aplica)
    ) {
      throw new RpcException({
        message: "No se puede eliminar el producto porque contiene información.",
        statusCode: HttpStatus.CONFLICT, // Envia el código 409 (conflicto)
      });
    }

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
}
