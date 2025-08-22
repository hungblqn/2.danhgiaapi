import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BitrixService } from './bitrix.service';

@Controller('bitrix')
export class BitrixController {
  constructor(private readonly bitrixService: BitrixService) {}

  // Case OAuth chuẩn (GET /install?code=...)
  @Get('install')
  async installGet(@Query('code') code?: string) {
    if (!code) {
      return { message: 'Install GET received, but no ?code found.' };
    }
    const res = await this.bitrixService.exchangeCodeForToken(code);
    return { message: 'Token saved', token_preview: { ...res } };
  }

  // Case Local App gửi POST event (DOMAIN/APP_SID...) – để log/kiểm tra
  @Post('install')
  async installPost(@Body() body: any) {
    // Bạn có thể dùng body.DOMAIN, body.MEMBER_ID... nếu cần
    return { message: 'Install POST event received', received: body };
  }

  // Test gọi API (crm.contact.list)
  @Get('test')
  async test() {
    const data = await this.bitrixService.callBitrixAPI('crm.contact.list', {
      select: ['ID', 'NAME', 'PHONE', 'EMAIL'],
    });
    return data;
  }

  // Test refresh thủ công (tuỳ chọn)
  @Post('refresh')
  async refresh() {
    const res = await this.bitrixService.refreshToken();
    return { message: 'Token refreshed', token_preview: { ...res, access_token: '***', refresh_token: '***' } };
  }
}
