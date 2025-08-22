import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Dùng ValidationPipe để validate dữ liệu từ DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // loại bỏ field không có trong DTO
      forbidNonWhitelisted: true, // báo lỗi nếu có field lạ
      transform: true, // tự động convert kiểu dữ liệu (string -> number)
    }),
  );

  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
