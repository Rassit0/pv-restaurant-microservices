import { Injectable } from '@nestjs/common';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UpdateUploadDto } from './dto/update-upload.dto';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  async compressImage(file: Express.Multer.File): Promise<string> {
    const outputDir = path.join(process.cwd(), 'uploads/compress');
    const fileName = file.filename;
    const filePath = path.join(outputDir, file.filename);
    const compressedImageBuffer = await sharp(file.path)
      .webp({ quality: 75 }) // se comprimira a una calidad de 75 que es ideal para imagenes gtandes >500KB
      .toBuffer();

    fs.writeFileSync(filePath, compressedImageBuffer);
    return fileName;
  }
}
