import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @MessagePattern('generateProductsOutOfStockReport')
  generateProductsOutOfStockReport() {
    return this.reportsService.generateProductsOutOfStockReport();
  }

  @MessagePattern('generateHighDemandProductsReport')
  generateHighDemandProductsReport() {
    return this.reportsService.generateHighDemandProductsReport();
  }

  @MessagePattern('generateInventoryByCategoryReport')
  generateInventoryByCategoryReport() {
    return this.reportsService.generateInventoryByCategoryReport();
  }

  @MessagePattern('generateInventoryByProductReport')
  generateInventoryByProductReport(@Payload() productId: string) {
    return this.reportsService.generateInventoryByProductReport(productId);
  }

  @MessagePattern('generateCategoryStatistics')
  generateCategoryStatistics() {
    return this.reportsService.generateCategoryStatistics();
  }

  @MessagePattern('generateProductsInTransitReport')
  generateProductsInTransitReport() {
    return this.reportsService.generateProductsInTransitReport();
  }
}
