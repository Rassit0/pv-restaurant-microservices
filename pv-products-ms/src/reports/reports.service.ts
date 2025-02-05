import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReportsService {

  constructor(private readonly prisma: PrismaService) { }

  async generateProductsOutOfStockReport() {
    return null;
    // Lógica para consultar inventario y generar reporte
    // const products = await this.prisma.product.findMany({
    //   where: {
    //     stock: {
    //       lte: 0, // Productos con stock menor o igual a 0
    //     }
    //   },
    //   select: {
    //     id: true,
    //     name: true,
    //     stock: true,
    //     unit: {
    //       select: {
    //         name: true,
    //         abbreviation: true,
    //       }
    //     }
    //   }
    // });

    // return {
    //   reportName: 'Productos sin stock',
    //   products
    // }
  }

  // Reporte: Productos con alta demanda
  async generateHighDemandProductsReport() {
    return null;
    // Lógica para analizar datos de productos con alta demanda
    // const highDemandProducts = await this.prisma.product.findMany({
    //   where: {
    //     lastSaleDate: {
    //       not: null, // Productos que han sido vendidos
    //     }
    //   },
    //   orderBy: {
    //     lastSaleDate: 'desc',
    //   },
    //   take: 10, // Obtener los 10 productos más vendidos recientemente
    //   select: {
    //     id: true,
    //     name: true,
    //     stock: true,
    //     lastSaleDate: true,
    //   }
    // });

    // return {
    //   reportName: 'Productos con alta demanda',
    //   products: highDemandProducts
    // }
  }

  //Reporte: Inventario por categoría
  async generateInventoryByCategoryReport() {
    return null;
    // Lógica para combinar datos de categorías y stock
    // const inventoryByCategory = await this.prisma.category.findMany({
    //   include: {
    //     products: {
    //       select: {
    //         id: true,
    //         imageUrl: true,
    //         name: true,
    //         stock: true,
    //         unit: {
    //           select: {
    //             name: true,
    //             abbreviation: true,
    //           }
    //         }
    //       }
    //     }
    //   }
    // });

    // return {
    //   reportName: 'Inventario por categoría',
    //   inventoryByCategory
    // }
  }

  // Reporte: Inventario de un producto específico
  async generateInventoryByProductReport(term: string) {
    return null;
    // Lógica para consultar inventario de un producto específico
    // const product = await this.prisma.product.findFirst({
    //   where: {
    //     OR: [
    //       { id: term },
    //       { slug: term }
    //     ]
    //   },
    //   select: {
    //     id: true,
    //     name: true,
    //     stock: true,
    //     price: true,
    //     lastSaleDate: true,
    //     unit: {
    //       select: {
    //         name: true,
    //         abbreviation: true,
    //       },
    //     },
    //     categories: {
    //       select: {
    //         name: true,
    //       },
    //     },
    //   },
    // });

    // if (!product) {
    //   throw new RpcException({
    //     message: "No se encontro el producto",
    //     statusCode: HttpStatus.NOT_FOUND
    //   })
    // }

    // return {
    //   reportName: 'Inventario de producto específico',
    //   product
    // }
  }

  // Reporte: Estadísticas por categoría
  async generateCategoryStatistics() {
    // Lógica para calcular estadísticas por categoría
    // const categoryStats = await this.prisma.category.findMany({
    //   include: {
    //     products: {
    //       select: {
    //         id: true,
    //         stock: true,
    //       },
    //     },
    //   },
    // });

    // const statistics = categoryStats.map((category) => {
    //   const totalStock = category.products.reduce(
    //     (sum, product) => sum + Number(product.stock),
    //     0,
    //   );

    //   return {
    //     imageUrl: category.imageUrl,
    //     categoryName: category.name,
    //     totalProducts: category.products.length,
    //     totalStock
    //   };
    // });

    return {
      reportName: 'Estadísticas por categoría',
      statistics: [{
        imageUrl: "imagen",
        categoryName: "product",
        totalProducts: 2,
        totalStock: 12
      }]
    }
  }

  // Reporte: Productos en tránsito
  async generateProductsInTransitReport() {
    return null;
    // Lógica para consultar productos en tránsito
    // Supogamos q tienes una columna o modelo para productos de tránsito
    // const productsInTransit = await this.prisma.product.findMany({
    //   where: {
    //     stockLocation: {
    //       contains: 'tránsito', // Suponiendo que la ubicación física indica "tránsito"
    //     },
    //   },
    //   select: {
    //     id: true,
    //     name: true,
    //     stock: true,
    //     stockLocation: true,
    //   },
    // });

    const productsInTransit = await this.prisma.branchProductInventory.findMany({
      where: {
        warehouseId: {
          contains: 'transit',
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return {
      reportName: 'Productos en tránsito',
      productsInTransit: productsInTransit.map((product) => ({
        id: product.product.id,
        name: product.product.name,
        stock: product.stock,
        stockLocation: product.warehouseId,
      })),
    };
  }
}
