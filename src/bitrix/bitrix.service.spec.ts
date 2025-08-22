import { Test, TestingModule } from '@nestjs/testing';
import { BitrixService } from './bitrix.service';
import { HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as path from 'path';

describe('BitrixService with .env', () => {
  let service: BitrixService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockAxiosResponse = (data: any): AxiosResponse => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: path.resolve(__dirname, '../.env'), // đường dẫn tới file .env của project
        }),
      ],
      providers: [
        BitrixService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
      ],
    }).compile();

    service = module.get<BitrixService>(BitrixService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call Bitrix API successfully with access token from token.json', async () => {
    // Mock token reading hợp lệ
    jest.spyOn<any, any>(service, 'readToken').mockReturnValue({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 10000,
      obtained_at: Date.now(),
    });

    (httpService.post as jest.Mock).mockReturnValue(of(mockAxiosResponse({ result: 'ok' })));

    const result = await service.callBitrixAPI('crm.contact.list', { filter: {} });

    expect(result).toEqual({ result: 'ok' });
    expect(httpService.post).toHaveBeenCalledWith(
      `${configService.get<string>('BITRIX24_DOMAIN')}/rest/crm.contact.list`,
      { filter: {}, auth: 'valid-token' },
    );
  });

  it('should refresh token when expired and retry API call', async () => {
    const expiredToken = {
      access_token: 'expired-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() - 1000,
      obtained_at: Date.now() - 3600000,
    };
    const newToken = {
      access_token: 'new-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      obtained_at: Date.now(),
    };

    jest.spyOn<any, any>(service, 'readToken').mockReturnValue(expiredToken);
    jest.spyOn<any, any>(service, 'refreshToken').mockResolvedValue(newToken);

    (httpService.post as jest.Mock).mockReturnValue(of(mockAxiosResponse({ result: 'ok-after-refresh' })));

    const result = await service.callBitrixAPI('crm.contact.list');

    expect(result).toEqual({ result: 'ok-after-refresh' });
    expect(httpService.post).toHaveBeenCalledWith(
      `${configService.get<string>('BITRIX24_DOMAIN')}/rest/crm.contact.list`,
      { auth: 'new-token' },
    );
  });
});
