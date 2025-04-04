import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductPaginationDto } from './dto/product-pagination.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @MessagePattern('createProduct')
  create(@Payload() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @MessagePattern('findAllProducts')
  findAll(@Payload() paginationDto: ProductPaginationDto) {
    return this.productsService.findAll(paginationDto);
  }

  @MessagePattern('findOneProduct')
  findOne(@Payload() term: string) {
    return this.productsService.findOne(term);
  }

  @MessagePattern('updateProduct')
  update(@Payload() updateProductDto: UpdateProductDto) {
    return this.productsService.update(updateProductDto.id, updateProductDto);
  }

  @MessagePattern('removeProduct')
  remove(@Payload() { id, userId }: { id: string, userId: string }) {
    return this.productsService.remove(id, userId);
  }

  @MessagePattern('products.validateIds')
  validateProductsIds(@Payload() ids: string[]) {
    return this.productsService.validateProductsIds(ids);
  }

  @MessagePattern('products.verifyStockWarehouse')
  verifyStockWarehouse(@Payload() { productId, warehouseId }: { productId: string, warehouseId: string }) {
    return this.productsService.verifyStockWarehouse(productId, warehouseId);
  }
  @MessagePattern('products.verifyStockBranch')
  verifyStockBranch(@Payload() { productId, branchId }: { productId: string, branchId: string }) {
    return this.productsService.verifyStockBranch(productId, branchId);
  }

  @MessagePattern('products.stockWarehouseExists')
  stockWarehouseExists(@Payload() warehouseId: string) {
    return this.productsService.stockWarehouseExists(warehouseId);
  }
  @MessagePattern('products.validateStockBranch')
  stockBranchExists(@Payload() branchId: string) {
    return this.productsService.stockBranchExists(branchId);
  }

  // @MessagePattern('products.updateOrCreateStockWarehouse')
  // updateOrCreateStockWarehouse(stockUpdates: { productId: string, warehouseId: string, quantity: number }[]){
  //   return this.productsService.updateOrCreateStockWarehouse(stockUpdates);
  // }

  // @MessagePattern('products.updateOrCreateStockBranch')
  // updateOrCreateStockBranch(stockUpdates: { productId: string, branchId: string, quantity: number }[]){
  //   return this.productsService.updateOrCreateStockBranch(stockUpdates);
  // }

  @MessagePattern('products.updateOrCreateStock')
  updateOrCreateStock(stockUpdates: { productId: string, branchOrWarehouse: 'BRANCH' | 'WAREHOUSE', updateId: string, quantity: number }[]) {
    return this.productsService.updateOrCreateStock(stockUpdates);
  }

  @MessagePattern('get_products_by_ids')
  getBranchesByIds(@Payload() ids: string[]) {
    return this.productsService.getProductsByIds(ids);
  }

  @MessagePattern('get_low_stock_products')
  getLowStockProducts() {
    return this.productsService.getLowStockProducts();
  }
}
