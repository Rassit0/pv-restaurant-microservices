import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductPaginationDto } from './dto/product-pagination.dto';
import { LocationType } from '@prisma/client';

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

  @MessagePattern('products.getStock')
  getStock(@Payload() { productId, locationId, locationType }: { productId: string, locationId: string, locationType: LocationType }) {
    return this.productsService.getStock({ productId, locationId, locationType });
  }

  @MessagePattern('products.updateOrCreateStockLocations')
  updateOrCreateStockLocations(stockUpdates: { productId: string, locationType: LocationType, updateId: string, quantity: number }[]) {
    return this.productsService.updateOrCreateStockLocations(stockUpdates);
  }

  @MessagePattern('get_products_by_ids')
  getBranchesByIds(@Payload() ids: string[]) {
    return this.productsService.getProductsByIds(ids);
  }

  @MessagePattern('get_low_stock_products')
  getLowStockProducts() {
    return this.productsService.getLowStockProducts();
  }

  @MessagePattern('products.validateSupplierIds')
  validateSupplierIds(@Payload() { productId, supplierIds }: { productId: string, supplierIds: string[] }) {
    return this.productsService.validateSupplierIds({ productId, supplierIds });
  }

  @MessagePattern('products.getSupplierIdsByProduct')
  getSupplierIdsByProduct(@Payload() term: string) {
    return this.productsService.getSupplierIdsByProduct(term);
  }
}
