import { Controller, Get, Post, Body, Patch, Param, Delete, Inject } from '@nestjs/common';
import { NATS_SERVICE } from 'src/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError } from 'rxjs';

@Controller('products/reports')
export class ReportsController {
  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy // Ayuda a enviar mensajes
  ) { }

  @Get('out-of-stock')
  findAll() {
    return this.client.send("generateProductsOutOfStockReport", {})
      .pipe(
        catchError(error => {
          throw new RpcException(error);
        })
      );
  }

  @Get('high-demand')
  generateHighDemandProductsReport() {
    return this.client.send('generateHighDemandProductsReport', {}).pipe(
      catchError((error) => {
        throw new RpcException(error);
      })
    );
  }

  @Get('inventory-by-category')
  generateInventoryByCategoryReport() {
    return this.client.send('generateInventoryByCategoryReport', {}).pipe(
      catchError((error) => {
        throw new RpcException(error);
      })
    );
  }

  @Get('inventory-by-product/:productId')
  generateInventoryByProductReport(@Param('productId') productId: string) {
    return this.client
      .send('generateInventoryByProductReport',  productId )
      .pipe(
        catchError((error) => {
          throw new RpcException(error);
        })
      );
  }

  @Get('category-statistics')
  generateCategoryStatistics() {
    return this.client.send('generateCategoryStatistics', {}).pipe(
      catchError((error) => {
        throw new RpcException(error);
      })
    );
  }

  @Get('products-in-transit')
  generateProductsInTransitReport() {
    return this.client.send('generateProductsInTransitReport', {}).pipe(
      catchError((error) => {
        throw new RpcException(error);
      })
    );
  }

}
