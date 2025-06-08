import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { SupplierPaginationDto } from './dto/supplier-pagination.dto';
import { catchError, firstValueFrom, of } from 'rxjs';
import { NATS_SERVICE } from 'src/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class SuppliersService {

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE) private readonly natsClient: ClientProxy
  ) { }

  async create(createSupplierDto: CreateSupplierDto) {
    try {
      const { contactsInfo, personId, ...data } = createSupplierDto;

      if (personId) {
        const existingSupplierIndividual = await this.prisma.supplier.findFirst({
          where: { personId },
        });

        if (existingSupplierIndividual) {
          throw new RpcException({
            message: 'El proveedor individual (personId) ya está registrado.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      const person = personId ? await firstValueFrom(
        this.natsClient.send('findOnePerson', personId).pipe(
          catchError((error) => {
            if (error.message && error.statusCode) {
              // Solo volvemos a lanzar el RpcException capturado
              throw new RpcException({
                message: error.message,
                statusCode: error.statusCode,
              });
            } else {
              console.error('Error fetching findOne:', error);
              throw new RpcException({
                message: 'Error al obtener el persona',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              })
            }
            return of(null);
          })
        )
      ) : null;

      if (data.name) {
        const existingSupplier = await this.prisma.supplier.findFirst({
          where: { name: data.name },
        });

        if (existingSupplier) {
          throw new RpcException({
            message: 'El nombre de la sucursal ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      // Verificar si el taxtIs existe
      if (data.taxId) {
        const taxIdSupplierExists = await this.prisma.supplier.findUnique({
          where: { taxId: createSupplierDto.taxId }
        });

        if (taxIdSupplierExists) {
          throw new RpcException({
            message: 'El taxId (Número de identificación fiscal) ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      // Validar la lista de contactos
      if (contactsInfo && contactsInfo.length > 0) {
        const emails = new Set();
        const phoneNumbers = new Set();
        let primaryCount = 0;

        for (const contact of contactsInfo) {

          const { email, phoneNumber, isPrimary } = contact;

          if (contact.id) {
            throw new RpcException({
              message: 'El id del contacto no debe estar presente al crear proveedor.',
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
          // Verificar duplicados en la misma lista
          if (email && emails.has(email)) {
            throw new RpcException({
              message: `El email ${email} está duplicado en la lista de contactos.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
          if (phoneNumber && phoneNumbers.has(phoneNumber)) {
            throw new RpcException({
              message: `El teléfono ${phoneNumber} está duplicado en la lista de contactos.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }

          emails.add(email);
          phoneNumbers.add(phoneNumber);

          // Contar contactos principales
          if (isPrimary) primaryCount++;
        }

        // Verificar que solo haya un contacto principal
        if (primaryCount > 1) {
          throw new RpcException({
            message: 'Solo puede haber un contacto principal.',
            statusCode: HttpStatus.BAD_REQUEST
          })
        }

        // Verificar si los emails o teléfonos ya existen en la base de datos para el mismo prooveedor
        for (const contact of contactsInfo) {
          const contactExists = await this.prisma.contactInfo.findFirst({
            where: {
              OR: [
                { email: contact.email },
                { phoneNumber: contact.phoneNumber },
              ]
            }
          });

          if (contactExists) {
            throw new RpcException({
              message: `El email ${contact.email} o teléfono ${contact.phoneNumber} ya están registrados.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
        }
      }

      // Crear el proveedor y los contactos
      const supplier = await this.prisma.supplier.create({
        data: {
          name: person ? (`${person.name} ${person.lastname || ''} ${person.secondLastname || ''}`).trim() : data.name,
          ...data,
          personId,
          contactInfo: {
            create: contactsInfo,
          },
        },
        include: {
          contactInfo: true
        }
      });

      return {
        message: 'Proveedor creado con éxito.',
        supplier: {
          ...supplier,
          person
        }
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear el proveedor',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findAll(paginationDto: SupplierPaginationDto) {
    try {
      const { limit, page, search, orderBy, columnOrderBy, status, deleted, searchName, filterSuppliersByProductId, supplierIds } = paginationDto;

      // Obtener los supplierIds si llega filterSuppliersByProductId
      const supplierIdsByProduct = filterSuppliersByProductId ? await firstValueFrom(
        this.natsClient.send('products.getSupplierIdsByProduct', filterSuppliersByProductId).pipe(
          catchError((error) => {
            if (error.message && error.statusCode) {
              // Solo volvemos a lanzar el RpcException capturado
              throw new RpcException({
                message: error.message,
                statusCode: error.statusCode,
              });
            } else {
              console.error('Error fetching findOne:', error);
              throw new RpcException({
                message: 'Error al obtener el supplierIds por producto',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              })
            }
            return of(null);
          })
        )
      ) : null;

      // Calcular el offset para la paginación
      const skip = limit ? (page - 1) * limit : undefined;

      // Combinar supplierIds del DTO y los supplierIdsByProduct
      let filteredSupplierIds: string[] | null = null;
      if (supplierIdsByProduct && supplierIds?.length > 0) {
        // Intersección
        filteredSupplierIds = supplierIds.filter((id) => supplierIdsByProduct.supplierIds.includes(id));
        if (filteredSupplierIds.length === 0) {
          // IDs enviados que no están asociados al producto
          const notAssociated = supplierIds.filter(id => !supplierIdsByProduct.supplierIds.includes(id));
          throw new RpcException({
            message: `Los siguientes supplierIds no están asociados al producto: ${notAssociated.join(', ')}`,
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      } else if (supplierIdsByProduct) {
        filteredSupplierIds = supplierIdsByProduct.supplierIds;
      } else if (supplierIds?.length > 0) {
        filteredSupplierIds = supplierIds;
      }

      // Construcción del filtro WHERE reutilizable
      const baseWhere = {
        ...(filteredSupplierIds && Array.isArray(filteredSupplierIds) && filteredSupplierIds.length > 0
          ? { id: { in: filteredSupplierIds } }
          : {}),

        ...(searchName
          ? {
            name: { contains: searchName, mode: Prisma.QueryMode.insensitive }
          }
          : search
            ? {
              OR: [
                { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { country: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { state: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { taxId: { contains: search, mode: Prisma.QueryMode.insensitive } },
                {
                  AND: search.split(/[\s+]+/).map((word) => ({
                    OR: [
                      { name: { contains: word, mode: Prisma.QueryMode.insensitive } },
                      { city: { contains: word, mode: Prisma.QueryMode.insensitive } },
                      { country: { contains: word, mode: Prisma.QueryMode.insensitive } },
                      { state: { contains: word, mode: Prisma.QueryMode.insensitive } },
                      { taxId: { contains: word, mode: Prisma.QueryMode.insensitive } }
                    ]
                  }))
                }
              ]
            }
            : {}),

        // Filtro para el campo status (si está presente en el DTO)
        ...((status && status !== 'all') && { isActive: status === 'active' }), // Asegúrate de que el campo en tu base de datos sea 'isEnable'
        ...(deleted !== undefined
          ? deleted
            ? { deletedAt: { not: null } } // Mostrar eliminados
            : { deletedAt: null }         // Mostrar no eliminados
          : {}),
      };
      const suppliers = await this.prisma.supplier.findMany({
        skip, // Desplazamiento para la paginación
        take: limit ? limit : undefined, // si es 0 devuelve todo
        where: baseWhere,
        orderBy: {
          [columnOrderBy]: orderBy
        },
        include: {
          contactInfo: true
        }
      });

      const totalItems = await this.prisma.supplier.count({
        where: baseWhere,
      });
      // Obtener personas para cada proveedor
      const personsWithWarehouses = await Promise.all(
        suppliers.map(async (supplier) => {
          // Enviar solicitud al servicio de sucursales para validar los branchIds
          const person = await firstValueFrom(
            this.natsClient.send('findOnePerson', supplier.personId).pipe(
              catchError((error) => {
                // console.error('Error fetching findOne:', error);
                return of(null);
              })
            )
          );
          return { ...supplier, person };
        })
      );

      return {
        suppliers: personsWithWarehouses,
        meta: {
          totalItems, // Total de productos encontrados
          itemsPerPage: limit || totalItems, // Si limit es 0, mostrar todos los elementos
          totalPages: limit ? Math.ceil(totalItems / limit) : 1, // Total de páginas
          currentPage: page, // Página actual
        }
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log('Error al obtener la lista de proveedores:', error);
      throw new RpcException({
        message: 'Error al obtener la lista de proveedores.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  async findOne(id: string) {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id },
        include: {
          contactInfo: true,
        },
      });

      if (!supplier) {
        throw new RpcException({
          message: 'Proveedor no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      return supplier;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al obtener el proveedor',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    try {
      const { contactsInfo, personId, ...data } = updateSupplierDto;

      // Verificar si existe el proveedor
      const supplierExists = await this.prisma.supplier.findUnique({
        where: { id }
      });
      if (!supplierExists) {
        throw new RpcException({
          message: 'Proveedor no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      if (personId) {
        const existingSupplierIndividual = await this.prisma.supplier.findFirst({
          where: {
            personId,
            id: { not: id }
          },
        });

        if (existingSupplierIndividual) {
          throw new RpcException({
            message: 'El proveedor individual ya está registrado.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      const person = personId ? await firstValueFrom(
        this.natsClient.send('findOnePerson', personId).pipe(
          catchError((error) => {
            if (error.message && error.statusCode) {
              // Solo volvemos a lanzar el RpcException capturado
              throw new RpcException({
                message: error.message,
                statusCode: error.statusCode,
              });
            } else {
              console.error('Error fetching findOne:', error);
              throw new RpcException({
                message: 'Error al obtener el persona',
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
              })
            }
            return of(null);
          })
        )
      ) : null;

      if (data.name) {
        const duplicateSupplier = await this.prisma.supplier.findFirst({
          where: {
            name: data.name,
            id: { not: id },
          },
        });


        if (duplicateSupplier !== null) {
          throw new RpcException({
            message: 'El nombre del proveedor ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }
      // Verificar si el taxtIs existe
      if (data.taxId) {
        const taxIdSupplierExists = await this.prisma.supplier.findFirst({
          where: {
            taxId: updateSupplierDto.taxId,
            id: { not: id }, // excluir el proveedor actual
          }
        });

        if (taxIdSupplierExists) {
          throw new RpcException({
            message: 'El taxId (Número de identificación fiscal) ya está en uso.',
            statusCode: HttpStatus.BAD_REQUEST,
          });
        }
      }

      // Validar la lista de contactos
      if (contactsInfo && contactsInfo.length > 0) {
        const emails = new Set();
        const phoneNumbers = new Set();
        let primaryCount = 0;

        for (const contact of contactsInfo) {
          if (contact.id) {
            const contactExists = await this.prisma.contactInfo.findUnique({
              where: {
                id: contact.id,
                supplierId: id // Validar que el contacto pertenece al proveedor actual
              }
            })
            if (!contactExists) {
              throw new RpcException({
                message: `El contacto con ID ${contact.id} no existe o no está relacionado con el proveedor actual.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }
          const { email, phoneNumber, isPrimary } = contact;

          // Verificar duplicados en la misma lista
          if (email && emails.has(email)) {
            throw new RpcException({
              message: `El email ${email} está duplicado en la lista de contactos.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }
          if (phoneNumber && phoneNumbers.has(phoneNumber)) {
            throw new RpcException({
              message: `El teléfono ${phoneNumber} está duplicado en la lista de contactos.`,
              statusCode: HttpStatus.BAD_REQUEST,
            });
          }

          emails.add(email);
          phoneNumbers.add(phoneNumber);

          // Contar contactos principales
          if (isPrimary) primaryCount++;
        }

        // Verificar que solo haya un contacto principal
        if (primaryCount > 1) {
          throw new RpcException({
            message: 'Solo puede haber un contacto principal.',
            statusCode: HttpStatus.BAD_REQUEST
          })
        }

        // Verificar si los emails o teléfonos ya existen en la base de datos para el mismo prooveedor
        for (const contact of contactsInfo) {
          // Verificar si las propiedades email y phoneNumber están definidas
          if (contact.email || contact.phoneNumber) {
            // Verificar si el contacto con el mismo email o teléfono ya existe en otro proveedor
            const contactExists = await this.prisma.contactInfo.findFirst({
              where: {
                OR: [
                  { email: contact.email },
                  { phoneNumber: contact.phoneNumber },
                ].filter(Boolean), // Filtrar los valores undefined
                ...(contact.id && {
                  NOT: {
                    id: contact.id, // Excluir el proveedor actual
                  }
                })
              }
            });

            if (contactExists) {
              throw new RpcException({
                message: `El email ${contact.email} o teléfono ${contact.phoneNumber} ya están registrados para otro proveedor.`,
                statusCode: HttpStatus.BAD_REQUEST,
              });
            }
          }
        }

      }

      // Actualizar el proveedor
      const supplier = await this.prisma.supplier.update({
        where: { id },
        data: {
          name: person ? (`${person.name} ${person.lastname || ''} ${person.secondLastname || ''}`).trim() : data.name,
          personId,
          ...data,
          ...((data.type === 'COMPANY') && { personId: null }),
          ...(contactsInfo && contactsInfo.length > 0 && {
            contactInfo: {
              update: contactsInfo.filter(contact => contact.id).map(contact => ({
                where: { id: contact.id },
                data: contact,
              })),
              create: contactsInfo.filter(contact => !contact.id).map(contact => ({
                ...contact,
                contactName: contact.contactName
              }))
            },
          })
        },
        include: {
          contactInfo: true
        }
      });

      return {
        message: 'Proveedor actulizado con éxito.',
        supplier
      }
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al crear el proveedor',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      })
    }
  }

  // async remove(id: string) {
  //   try {
  //     const supplier = await this.prisma.supplier.findUnique({
  //       where: { id },
  //       include: {
  //         contactInfo: true,
  //       }
  //     });

  //     if (!supplier) {
  //       throw new RpcException({
  //         message: 'Proveedor no encontrado.',
  //         statusCode: HttpStatus.NOT_FOUND
  //       });
  //     }

  //     // Eliminar contactos asociados
  //     if (supplier.contactInfo && supplier.contactInfo.length > 0) {
  //       await this.prisma.contactInfo.deleteMany({
  //         where: {
  //           supplierId: id,
  //         },
  //       });
  //     }
  //     // Eliminar el proveedor
  //     await this.prisma.supplier.delete({
  //       where: { id },
  //     });

  //     return {
  //       message: 'Proveedor eliminado con éxito.',
  //       supplier
  //     }

  //   } catch (error) {
  //     if (error instanceof RpcException) throw error;
  //     console.log(error);
  //     throw new RpcException({
  //       message: 'Error al eliminar el proveedor.',
  //       statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  //     });
  //   }
  // }
  async remove(id: string) {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id },
      });

      if (!supplier) {
        throw new RpcException({
          message: 'Proveedor no encontrado.',
          statusCode: HttpStatus.NOT_FOUND
        });
      }

      // Realizar la eliminación lógica
      const supplierDelted = await this.prisma.supplier.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { contactInfo: true },
      });

      return {
        message: 'Proveedor eliminado con éxito.',
        supplier: supplierDelted
      }

    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar el proveedor.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async removeContact(id: number) {
    try {
      // Verificar si existe el contacto
      const contact = await this.prisma.contactInfo.findUnique({
        where: { id },
        include: {
          supplier: true,
        }
      });

      if (!contact) {
        throw new RpcException({
          message: 'Contacto no encontrado.',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      // Eliminar el contacto
      await this.prisma.contactInfo.delete({
        where: { id },
      });

      return {
        message: 'Contacto eliminado con éxito.',
        contact
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      console.log(error);
      throw new RpcException({
        message: 'Error al eliminar el contacto.',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async validateSuppliersIds(ids: string[]) {
    // Eliminar duplicados
    ids = Array.from(new Set(ids));

    // Validar proveedores existentes
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        id: {
          in: ids
        },
      },
    });

    // Verificar que se encontraron todas
    if (suppliers.length !== ids.length) {
      const foundIds = suppliers.map(supplier => supplier.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));

      throw new RpcException({
        message: `No se encontraron los siguientes proveedores: ${missingIds.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
      })
    }

    return suppliers;
  }
}
