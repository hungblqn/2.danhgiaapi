#2.danhgiaapi
1. Cài đặt và cấu hình
   Tải ngrok và dự án. sử dụng ngrok http 3000 để điều hướng. npm i để cài package, chạy server sử dụng npm run start.
   Cấu hình bitrix24:
   - vào phần contact, tạo trường -> thêm số tài khoản, tên ngân hàng, địa chỉ
   - vào phần ứng dụng -> tài nguyên nhà phát triển -> khác -> ứng dụng cục bộ -> phần dường dẫn xử lý cho <đường dẫn ngrok>/bitrix/install, ví dụ: https://6853daf89350.ngrok-free.app/bitrix/install -> lưu, sẽ hiện ra client_id và client_secret -> lưu vào .env, đường dẫn cài đặt ban đầu sẽ có dạng <linkbitrix>/oauth/authorize/?client_id=<client_id>&response_type=code&redirect_uri=<đường dẫn ngrok>/bitrix/install, ví dụ: https://viethung.bitrix24.vn/oauth/authorize/?client_id=local.68a5698f61b5e5.43162226&response_type=code&redirect_uri=https://6853daf89350.ngrok-free.app/bitrix/install
     -> lưu, bấm cài đặt lại -> từ đó ta có được access_token và refresh_token
2. Các endpoint api sẽ xuất hiện trong /docs đã được setup bằng @nestjs/swagger
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7684958e-85c6-4566-aaa3-5b4b05660524" />

BitrixController
a) Cài đặt ứng dụng trên Bitrix24
Mở trình duyệt:
GET http://localhost:3000/bitrix/install?code=OAUTH_CODE
  Nếu code hợp lệ → token được lưu trong token.json.
  Hoặc nhận POST webhook/installation event:

POST http://localhost:3000/bitrix/install
  Body: { DOMAIN: 'example.bitrix24.com', MEMBER_ID: '123' }

b) Test gọi API Bitrix24
GET http://localhost:3000/bitrix/test
Gọi crm.contact.list, trả về danh sách contact.
Service tự check token hết hạn → refresh → gọi lại.

c) Refresh token thủ công
POST http://localhost:3000/bitrix/refresh
Trả về access token mới lưu vào token.json

ContactsController

Controller này có API key guard, nên cần gửi header x-api-key đúng nếu bạn đã setup ApiKeyGuard.

a) Contact
List all:
GET http://localhost:3000/contacts

Create contact:
POST http://localhost:3000/contacts
Body: {
  "name": "Nguyen",
  "last_name": "Van A",
  "phone": "0123456789",
  "email": "abc@example.com",
  "address": "Hanoi",
  "bank_account": "123456789",
  "bank_name": "Vietcombank",
  "website": "example.com"
}

Update contact:
PUT http://localhost:3000/contacts/1
Body: { ...same as create... }

Delete contact:
DELETE http://localhost:3000/contacts/1

b) Requisite (thông tin bổ sung của contact)

List requisites:

GET http://localhost:3000/contacts/requisite


Create requisite:
POST http://localhost:3000/contacts/requisite
Body: {
  "ID": "9",
  "ENTITY_TYPE_ID": "3", (3 đại diện cho contact)
  "ENTITY_ID": "15", (id contact)
  "PRESET_ID": "1",
  "DATE_CREATE": "2025-08-20T19:17:12+03:00",
  "NAME": "MB Bank", (tên ngân hàng)
  "RQ_INN": "5168468468", (số tài khoản)
}



Update requisite:

PUT http://localhost:3000/contacts/requisite/:id
Body: { "FIELD_NAME": "new_value" }


Delete requisite:

DELETE http://localhost:3000/contacts/requisite/123

3. Lỗi xử lý và cách kiểm tra
Các lỗi đã xử lý:

OAuth / Token
Không có code khi install app: Endpoint /bitrix/install kiểm tra query code. Trả về thông báo: "Install GET received, but no ?code found."
Token hết hạn: BitrixService tự động refresh token khi gọi API. Trả về thông báo: "Token refreshed".
Refresh token thất bại: Nếu refresh không thành công, log lỗi và ném lỗi InternalServerError với thông báo: "Token refresh failed".
Trao đổi code → token thất bại: Nếu OAuth exchange lỗi, log chi tiết và ném InternalServerError với thông báo: "OAuth exchange failed".

API Bitrix24
HTTP 4xx / 5xx từ Bitrix24: Log chi tiết và ném InternalServerError, thông báo ví dụ: "Bitrix API error 400".
Timeout / lỗi mạng: Log lỗi và ném InternalServerError, thông báo ví dụ: "Timeout when calling Bitrix API".
Token không hợp lệ / expired: Refresh và retry 1 lần, nếu vẫn lỗi ném InternalServerError, thông báo ví dụ: "Bitrix API call failed after refresh".
Contact / Requisite
ID không tồn tại khi update/delete: Ném NotFoundException với thông báo: "Contact not found" hoặc "Requisite not found".
Tạo contact/requisite thất bại: Kiểm tra kết quả API, nếu thất bại ném NotFoundException với thông báo: "Failed to create contact" hoặc "Failed to create requisite".

Validate dữ liệu (DTO)
Email, phone, field bắt buộc: ValidationPipe tự validate và trả về lỗi 400 với thông báo chi tiết, ví dụ: "email must be an email".
Bảo mật
API key không hợp lệ: ApiKeyGuard trả về 401 Unauthorized, thông báo: "Unauthorized".
