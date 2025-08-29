import { Injectable, NotFoundException } from '@nestjs/common';
import { BitrixService } from '../bitrix/bitrix.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly bitrix: BitrixService) { }

  /** Lấy danh sách contact */
  async findAll() {
    const result = await this.bitrix.callBitrixAPI('crm.contact.list', {
      select: ['ID', 'NAME', 'LAST_NAME', 'PHONE', 'EMAIL', 'WEB', 'UF_*'], // bao gồm tất cả UF_*
    });

    if (!result?.result?.length) return [];

    return result.result.map((contact: any) => ({
      ID: contact.ID,
      NAME: contact.NAME,
      LAST_NAME: contact.LAST_NAME,
      PHONE: contact.PHONE || [],
      EMAIL: contact.EMAIL || [],
      WEB: contact.WEB || [],
      ADDRESS: contact.UF_CRM_1756492267845 || null, // map trường UF_CRM_1756492267845 thành address
    }));
  }

  async requisiteList() {
    const res = await this.bitrix.callBitrixAPI('crm.requisite.list', {
      select: ['*'], // lấy tất cả fields từ Bitrix
    });

    if (!res?.result?.length) return [];

    return res.result.map((req: any) => ({
      "ID Khách hàng": req.ENTITY_ID || null, // id contact
      "Tên ngân hàng": req.NAME || null,      // tên ngân hàng
    }));
  }

  /** Lấy requisites theo contact ID (ENTITY_ID) */
  async requisiteByContact(contactId: number) {
    const res = await this.bitrix.callBitrixAPI('crm.requisite.list', {
      filter: { ENTITY_ID: contactId }, // lọc theo contactId
      select: ['*'], // lấy tất cả fields
    });

    console.log('Contact ID:', contactId); // debug id

    if (!res?.result?.length) return [];

    // chỉ lấy những trường cần thiết
    return res.result.map((req: any) => ({
      "ID Khách hàng": req.ENTITY_ID || null, // id contact
      "Tên ngân hàng": req.NAME || null,      // tên ngân hàng
    }));
  }



  /** Tạo requisites mới */
  async requisiteCreate(fields: Record<string, any>) {
    const result = await this.bitrix.callBitrixAPI('crm.requisite.add', { fields });
    const requisiteId = result?.result;
    if (!requisiteId) throw new NotFoundException('Failed to create requisite');
    return { requisiteId };
  }

  /** Cập nhật requisites */
  async requisiteUpdate(id: number, fields: Record<string, any>) {
    const list = await this.bitrix.callBitrixAPI('crm.requisite.list', { filter: { ID: id } });
    if (!list?.result?.length) throw new NotFoundException('Requisite not found');

    await this.bitrix.callBitrixAPI('crm.requisite.update', { id, fields });
    return { message: 'Requisite updated' };
  }

  /** Xóa requisites */
  async requisiteRemove(id: number) {
    await this.bitrix.callBitrixAPI('crm.requisite.delete', { id });
    return { message: 'Requisite deleted' };
  }

  /** Tạo contact mới */
  async create(dto: CreateContactDto) {
    const result = await this.bitrix.callBitrixAPI('crm.contact.add', {
      fields: {
        NAME: dto.name,
        LAST_NAME: dto.last_name || '',
        PHONE: dto.phone ? [{ VALUE: dto.phone, VALUE_TYPE: 'WORK' }] : [],
        EMAIL: dto.email ? [{ VALUE: dto.email, VALUE_TYPE: 'WORK' }] : [],
        WEB: dto.website ? [{ VALUE: dto.website, VALUE_TYPE: 'WORK' }] : [],
        UF_CRM_1756492267845: dto.address || null, // map address vào UF_CRM
      },
    });

    const contactId = result?.result;
    if (!contactId) throw new NotFoundException('Failed to create contact');

    return { contactId };
  }

  /** Cập nhật contact */
  async update(id: number, dto: UpdateContactDto) {
    const list = await this.bitrix.callBitrixAPI('crm.contact.list', { filter: { ID: id } });
    if (!list?.result?.length) throw new NotFoundException('Contact not found');

    await this.bitrix.callBitrixAPI('crm.contact.update', {
      id,
      fields: {
        NAME: dto.name,
        LAST_NAME: dto.last_name || '',
        PHONE: dto.phone ? [{ VALUE: dto.phone, VALUE_TYPE: 'WORK' }] : [],
        EMAIL: dto.email ? [{ VALUE: dto.email, VALUE_TYPE: 'WORK' }] : [],
        WEB: dto.website ? [{ VALUE: dto.website, VALUE_TYPE: 'WORK' }] : [],
      },
    });

    return { message: 'Contact updated' };
  }

  /** Xóa contact */
  async remove(id: number) {
    await this.bitrix.callBitrixAPI('crm.contact.delete', { id });
    return { message: 'Contact deleted' };
  }
}
