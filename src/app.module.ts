import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BitrixModule } from './bitrix/bitrix.module';
import { ContactsModule } from './contacts/contacts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BitrixModule,
	ContactsModule
  ],
})
export class AppModule {}
