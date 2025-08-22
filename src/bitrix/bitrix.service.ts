import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import { BitrixToken } from './interfaces/token.interface';

@Injectable()
export class BitrixService {
  private readonly logger = new Logger(BitrixService.name);
  private readonly tokenFile = path.join(process.cwd(), 'token.json');

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /** Đọc token từ file JSON */
  private readToken(): BitrixToken | null {
    try {
      const raw = fs.readFileSync(this.tokenFile, 'utf8');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /** Ghi token + tính expires_at để dễ kiểm soát */
  private writeToken(token: any): BitrixToken {
    const now = Date.now();
    // buffer 60s để tránh sát hạn
    const expiresAt = now + ((token?.expires_in ?? 3600) - 60) * 1000;
    const full: BitrixToken = {
      ...token,
      obtained_at: now,
      expires_at: expiresAt,
    };
    fs.writeFileSync(this.tokenFile, JSON.stringify(full, null, 2));
    return full;
  }

  /** Kiểm tra token còn hạn không */
  private isExpired(t: BitrixToken | null): boolean {
    if (!t?.access_token) return true;
    return Date.now() >= (t.expires_at ?? 0);
  }

  /** Đổi authorization code → access_token + refresh_token */
  async exchangeCodeForToken(code: string): Promise<BitrixToken> {
    const clientId = this.config.get<string>('CLIENT_ID');
    const clientSecret = this.config.get<string>('CLIENT_SECRET');
    const domain = this.config.get<string>('BITRIX24_DOMAIN');

    const url = `${domain}/oauth/token/`;
    this.logger.log(`Exchanging code for token at ${url}`);

    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: {
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code,
          },
        }),
      );
      const saved = this.writeToken(data);
      this.logger.log('Token saved successfully');
      return saved;
    } catch (e) {
      const err = e as AxiosError<any>;
      this.logger.error(`OAuth exchange failed: ${err.message}`, err.response?.data);
      throw new InternalServerErrorException('OAuth exchange failed');
    }
  }

  /** Làm mới access_token bằng refresh_token */
  async refreshToken(): Promise<BitrixToken> {
    const current = this.readToken();
    if (!current?.refresh_token) {
      throw new InternalServerErrorException('No refresh_token available');
    }

    const clientId = this.config.get<string>('CLIENT_ID');
    const clientSecret = this.config.get<string>('CLIENT_SECRET');
    const domain = this.config.get<string>('BITRIX24_DOMAIN');
    const url = `${domain}/oauth/token/`;

    this.logger.log('Refreshing access token...');
    try {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: {
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: current.refresh_token,
          },
        }),
      );
      const saved = this.writeToken(data);
      this.logger.log('Token refreshed successfully');
      return saved;
    } catch (e) {
      const err = e as AxiosError<any>;
      this.logger.error(`Token refresh failed: ${err.message}`, err.response?.data);
      throw new InternalServerErrorException('Token refresh failed');
    }
  }

  /** Lấy access_token hợp lệ (tự refresh nếu hết hạn) */
  private async getValidAccessToken(): Promise<string> {
    let token = this.readToken();
    if (this.isExpired(token)) {
      token = await this.refreshToken();
    }
    if (!token?.access_token) {
      throw new InternalServerErrorException('No access token available');
    }
    return token.access_token;
  }

  /**
   * Gọi REST Bitrix24
   * - method: ví dụ "crm.contact.list"
   * - payload: object tham số theo tài liệu Bitrix
   * Tự động:
   *  - đính kèm auth
   *  - retry 1 lần nếu 401/expired → refresh → gọi lại
   *  - log lỗi mạng/timeout/5xx
   */
  async callBitrixAPI(method: string, payload: Record<string, any> = {}) {
    const domain = this.config.get<string>('BITRIX24_DOMAIN');
    const url = `${domain}/rest/${method}`;

    const doCall = async (accessToken: string) => {
      const { data } = await firstValueFrom(
        this.http.post(url, { ...payload, auth: accessToken }),
      );
      return data;
    };

    // Lần 1
    try {
      const token = await this.getValidAccessToken();
      return await doCall(token);
    } catch (e) {
      const err = e as AxiosError<any>;
      // Nếu là lỗi HTTP từ Bitrix khi gọi REST (sau khi đã có token)
      if (err?.response) {
        const status = err.response.status;
        const body = err.response.data;

        // Token hết hạn / không hợp lệ → refresh và thử lại 1 lần
        const isUnauthorized =
          status === 401 ||
          (typeof body === 'object' && (body?.error === 'INVALID_TOKEN' || body?.error_description?.includes('expired')));

        if (isUnauthorized) {
          this.logger.warn('Access token may be expired/invalid. Refreshing and retrying...');
          const newToken = await this.refreshToken();
          try {
            return await doCall(newToken.access_token);
          } catch (e2) {
            const err2 = e2 as AxiosError<any>;
            this.logger.error(`Bitrix API call failed after refresh: ${method}`, err2.response?.data ?? err2.message);
            throw new InternalServerErrorException('Bitrix API call failed after refresh');
          }
        }

        // Lỗi 4xx/5xx khác
        this.logger.error(`Bitrix API error ${status} for ${method}`, body);
        throw new InternalServerErrorException(`Bitrix API error ${status}`);
      }

      // Lỗi mạng/timeout hoặc không có response
      if (err?.code === 'ECONNABORTED') {
        this.logger.error(`Timeout when calling ${method}`);
        throw new InternalServerErrorException('Timeout when calling Bitrix API');
      }
      this.logger.error(`Network/unknown error calling ${method}: ${err?.message}`);
      throw new InternalServerErrorException('Network error calling Bitrix API');
    }
  }
}
