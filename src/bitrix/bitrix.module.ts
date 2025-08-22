import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BitrixController } from './bitrix.controller';
import { BitrixService } from './bitrix.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 0,
    }),
    ConfigModule, // <--- chỉ cần dấu phẩy, KHÔNG thêm )
  ],
  controllers: [BitrixController],
  providers: [BitrixService],
  exports: [BitrixService],
})
export class BitrixModule {}
