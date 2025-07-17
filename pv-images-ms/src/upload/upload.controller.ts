import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('/uploadImage')
  @UseInterceptors(FileInterceptor('file', {
    // limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      const isValid = file.mimetype.match(/\/(jpg|jpeg|png)$/);
      if (!isValid) {
        const errorMessage = 'Solo se permiten imágenes JPG, JPEG o PNG';
        console.error('[Error de tipo de archivo]', errorMessage, '->', file.originalname);
        // Devuelve un error personalizado, NestJS lo manejará automáticamente
        return cb(new BadRequestException(errorMessage), false);
      }
      cb(null, true);
    }
  }))
  // @UseInterceptors(FileInterceptor('file', { // controlar el tamaño
  //   limits: { fileSize: Math.pow(1024, 2) * 5 } // tamano limite de 5mb
  // }))
  async uploadImage(@UploadedFile() file) {
    // return "upload success"
    // const fileUrl = `http://localhost:3009/uploads/${file.filename}`;
    // return {
    //   url: fileUrl,
    // };
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }
    const fileName = await this.uploadService.compressImage(file);
    return {
      originImage: `http://localhost:3009/uploads/${file.filename}`,
      compressImage: `http://localhost:3009/uploads/compress/${fileName}`
    }
  }
}
