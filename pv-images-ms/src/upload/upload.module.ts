import { BadRequestException, Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { extname, join } from 'path';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

//  crear archivo 'uploads' a la raíz
const uploadDir = join(process.cwd(), 'uploads');

@Module({
  imports:[
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const filename = `${Date.now()}${ext}`;
          cb(null, filename);
        }
      }),
      fileFilter: (req, file, cb) => { // fileFilter puede controlar el tipo y tamaño del os archivos cargados.
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten imágenes...'), false);
          // cb(new Error('Solo se permiten imágenes...'), false);
        }
      }
    })
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
