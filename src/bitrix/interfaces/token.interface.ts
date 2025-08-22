export interface BitrixToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;      // giây (Bitrix trả về)
  scope?: string;
  domain?: string;
  client_endpoint?: string;
  member_id?: string;

  // fields do mình thêm để quản lý hạn
  obtained_at: number;     // ms epoch
  expires_at: number;      // ms epoch
}
