import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('/uploadImage')
  @UseInterceptors(FileInterceptor('file'))
  // @UseInterceptors(FileInterceptor('file', { // controlar el tamaño
  //   limits: { fileSize: Math.pow(1024, 2) * 5 } // tamano limite de 5mb
  // }))
  async uploadImage(@UploadedFile() file) {
    // return "upload success"
    // const fileUrl = `http://localhost:3009/uploads/${file.filename}`;
    // return {
    //   url: fileUrl,
    // };
    const fileName = await this.uploadService.compressImage(file);
    return {
      originImage: `http://localhost:3009/uploads/${file.filename}`,
      compressImage: `http://localhost:3009/uploads/compress/${fileName}`
    }  
  }
}
