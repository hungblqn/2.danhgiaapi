import { IsString, IsOptional, IsEmail, IsPhoneNumber, Matches ,IsUrl } from 'class-validator';

export class CreateContactDto {
  @IsString()
  name: string;
  
  @IsString()
  last_name: string;

  @IsOptional()
  @IsString()
  address: string;

  @IsPhoneNumber()
  @Matches(/^(0|\+84)\d{9}$/, { message: 'Số điện thoại không hợp lệ (Việt Nam)' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  bank_account?: string;
}
