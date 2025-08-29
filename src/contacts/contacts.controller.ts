import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

@UseGuards(ApiKeyGuard) // <-- Bảo vệ toàn bộ controller
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) { }

  @Get()
  findAll() {
    return this.contactsService.findAll();
  }
  @Get('/requisite')
  requisiteList() {
    return this.contactsService.requisiteList();
  }
  // Lấy requisites theo contact ID
  @Get('/requisite/:id')
  getRequisiteByContact(@Param('id', ParseIntPipe) id: number) {
    return this.contactsService.requisiteByContact(id);
  }
  @Post('/requisite')
  requisiteCreate(@Body() fields: Record<string, any>) {
    return this.contactsService.requisiteCreate(fields);
  }

  @Put('/requisite/:id')
  requisiteUpdate(@Param('id', ParseIntPipe) id: number, @Body() fields: Record<string, any>) {
    return this.contactsService.requisiteUpdate(id, fields);
  }

  @Delete('/requisite/:id')
  requisiteRemove(@Param('id', ParseIntPipe) id: number) {
    return this.contactsService.requisiteRemove(id);
  }

  @Post()
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contactsService.remove(id);
  }
}
