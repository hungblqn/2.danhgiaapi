import { Injectable, NotFoundException } from '@nestjs/common';
import { BitrixService } from '../bitrix/bitrix.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly bitrix: BitrixService) {}

  /** Lấy danh sách contact */
  async findAll() {
    const result = await this.bitrix.callBitrixAPI('crm.contact.list', {
      select: ['ID', 'NAME', 'LAST_NAME', 'PHONE', 'EMAIL', 'WEB', 'UF_*'],
    });

    if (!result?.result?.length) return [];

    return result.result.map((contact: any) => ({
      ID: contact.ID,
      NAME: contact.NAME,
      LAST_NAME: contact.LAST_NAME,
      ADDRESS: contact.UF_CRM_1755680729742 || null,      // UF địa chỉ
      BANK_ACCOUNT: contact.UF_CRM_1755676961232 || null,  // UF số tài khoản
      BANK_NAME: contact.UF_CRM_1755677012008 || null,     // UF ngân hàng
      PHONE: contact.PHONE || [],
      EMAIL: contact.EMAIL || [],
      WEB: contact.WEB || [],
    }));
  }
  
  async requisiteList() {
    const res = await this.bitrix.callBitrixAPI('crm.requisite.list', {
      
    });
    return res.result || [];
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
    // Kiểm tra tồn tại
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
        UF_CRM_1755680729742: dto.address || null,      // địa chỉ
        UF_CRM_1755676961232: dto.bank_account || null, // số tài khoản
        UF_CRM_1755677012008: dto.bank_name || null,    // ngân hàng
        PHONE: dto.phone ? [{ VALUE: dto.phone, VALUE_TYPE: 'WORK' }] : [],
        EMAIL: dto.email ? [{ VALUE: dto.email, VALUE_TYPE: 'WORK' }] : [],
        WEB: dto.website ? [{ VALUE: dto.website, VALUE_TYPE: 'WORK' }] : [],
      },
    });

    const contactId = result?.result;
    if (!contactId) throw new NotFoundException('Failed to create contact');

    return { contactId };
  }

  /** Cập nhật contact */
  async update(id: number, dto: UpdateContactDto) {
    // Kiểm tra contact tồn tại
    const list = await this.bitrix.callBitrixAPI('crm.contact.list', { filter: { ID: id } });
    if (!list?.result?.length) throw new NotFoundException('Contact not found');

    await this.bitrix.callBitrixAPI('crm.contact.update', {
      id,
      fields: {
        NAME: dto.name,
        LAST_NAME: dto.last_name || '',
        UF_CRM_1755680729742: dto.address || null,
        UF_CRM_1755676961232: dto.bank_account || null,
        UF_CRM_1755677012008: dto.bank_name || null,
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
