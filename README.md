# fix

loại bỏ các field custom liên quan đến ngân hàng

thêm ngân hàng bằng cách add requisite trực tiếp với entity_id là contact id

thông tin ngân hàng có thể thêm thủ công trên giao diện bitrix24 hoặc nếu làm thêm sẽ sử dụng crm.bank.detail... để crud

https://github.com/user-attachments/assets/4765a04b-070c-48ad-9eea-b718b7656ae3

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

4. Test api
get /contacts
[
    {
        "ID": "15",
        "NAME": "Hùng",
        "LAST_NAME": "Lô Việt",
        "ADDRESS": "Hà Nội",
        "BANK_ACCOUNT": "135135164846",
        "BANK_NAME": "MBBank",
        "PHONE": [
            {
                "ID": "13",
                "VALUE_TYPE": "WORK",
                "VALUE": "+84398054209",
                "TYPE_ID": "PHONE"
            }
        ],
        "EMAIL": [
            {
                "ID": "15",
                "VALUE_TYPE": "WORK",
                "VALUE": "hungblqn@hotmail.com",
                "TYPE_ID": "EMAIL"
            }
        ],
        "WEB": [
            {
                "ID": "17",
                "VALUE_TYPE": "WORK",
                "VALUE": "hungblqn.com",
                "TYPE_ID": "WEB"
            }
        ]
    },
    {
        "ID": "17",
        "NAME": "Nguyen Van A",
        "LAST_NAME": "Nguyen",
        "ADDRESS": "123 Đường Láng, Hà Nội",
        "BANK_ACCOUNT": "123456789",
        "BANK_NAME": "Vietcombank",
        "PHONE": [
            {
                "ID": "19",
                "VALUE_TYPE": "WORK",
                "VALUE": "+84901234567",
                "TYPE_ID": "PHONE"
            }
        ],
        "EMAIL": [
            {
                "ID": "21",
                "VALUE_TYPE": "WORK",
                "VALUE": "nguyenvana@example.com",
                "TYPE_ID": "EMAIL"
            }
        ],
        "WEB": [
            {
                "ID": "23",
                "VALUE_TYPE": "WORK",
                "VALUE": "https://nguyenvana.com",
                "TYPE_ID": "WEB"
            }
        ]
    },
    {
        "ID": "19",
        "NAME": "An",
        "LAST_NAME": "Nguyen Van",
        "ADDRESS": "123 Đường Láng, Hà Nội",
        "BANK_ACCOUNT": "123456789",
        "BANK_NAME": "Vietcombank",
        "PHONE": [
            {
                "ID": "25",
                "VALUE_TYPE": "WORK",
                "VALUE": "+84943198705",
                "TYPE_ID": "PHONE"
            }
        ],
        "EMAIL": [
            {
                "ID": "27",
                "VALUE_TYPE": "WORK",
                "VALUE": "nguyenvana@example.com",
                "TYPE_ID": "EMAIL"
            }
        ],
        "WEB": [
            {
                "ID": "29",
                "VALUE_TYPE": "WORK",
                "VALUE": "https://nguyenvana.com",
                "TYPE_ID": "WEB"
            }
        ]
    },
    {
        "ID": "21",
        "NAME": null,
        "LAST_NAME": "Liên lạc với #21",
        "ADDRESS": null,
        "BANK_ACCOUNT": null,
        "BANK_NAME": null,
        "PHONE": [],
        "EMAIL": [],
        "WEB": []
    },
    {
        "ID": "23",
        "NAME": "Mr Hùng",
        "LAST_NAME": null,
        "ADDRESS": null,
        "BANK_ACCOUNT": null,
        "BANK_NAME": null,
        "PHONE": [
            {
                "ID": "31",
                "VALUE_TYPE": "WORK",
                "VALUE": "1234567890",
                "TYPE_ID": "PHONE"
            }
        ],
        "EMAIL": [
            {
                "ID": "33",
                "VALUE_TYPE": "WORK",
                "VALUE": "hungblqn@hotmail.com",
                "TYPE_ID": "EMAIL"
            }
        ],
        "WEB": []
    },
    {
        "ID": "25",
        "NAME": "test123",
        "LAST_NAME": null,
        "ADDRESS": null,
        "BANK_ACCOUNT": null,
        "BANK_NAME": null,
        "PHONE": [
            {
                "ID": "35",
                "VALUE_TYPE": "WORK",
                "VALUE": "1234567899",
                "TYPE_ID": "PHONE"
            }
        ],
        "EMAIL": [
            {
                "ID": "37",
                "VALUE_TYPE": "WORK",
                "VALUE": "test123@gmail.com",
                "TYPE_ID": "EMAIL"
            }
        ],
        "WEB": []
    }
]

post /contacts
{
  "name": "Nguyen Van A",
  "last_name": "Tran",
  "address": "123 Le Loi, District 1, Ho Chi Minh City",
  "phone": "+84901234567",
  "email": "a.nguyen@example.com",
  "website": "https://example.com",
  "bank_account": "1234567890",
  "bank_name": "MB Bank"
}

put /contacts/27
{
  "name": "Nguyen Van B",
  "last_name": "Tran",
  "address": "456 Hai Ba Trung, District 3, Ho Chi Minh City",
  "phone": "+84909876543",
  "email": "b.nguyen@example.com",
  "website": "https://example.com",
  "bank_account": "0987654321",
  "bank_name": "Vietcombank"
}

trả  về (thành công)
{
    "message": "Contact updated"
}

delete /contacts/27
trả về {
    "message": "Contact deleted"
}

trả về (thành công)
{
    "contactId": 27
}
get /contacts/requisite

[
    {
        "ID": "9",
        "ENTITY_TYPE_ID": "3",
        "ENTITY_ID": "15",
        "PRESET_ID": "1",
        "DATE_CREATE": "2025-08-20T19:17:12+03:00",
        "DATE_MODIFY": "",
        "CREATED_BY_ID": "1",
        "MODIFY_BY_ID": null,
        "NAME": "MB Bank",
        "CODE": null,
        "XML_ID": null,
        "ORIGINATOR_ID": null,
        "ACTIVE": "Y",
        "ADDRESS_ONLY": "N",
        "SORT": "500",
        "RQ_NAME": null,
        "RQ_FIRST_NAME": null,
        "RQ_LAST_NAME": null,
        "RQ_SECOND_NAME": null,
        "RQ_COMPANY_ID": null,
        "RQ_COMPANY_NAME": null,
        "RQ_COMPANY_FULL_NAME": null,
        "RQ_COMPANY_REG_DATE": null,
        "RQ_DIRECTOR": null,
        "RQ_ACCOUNTANT": null,
        "RQ_CEO_NAME": null,
        "RQ_CEO_WORK_POS": null,
        "RQ_CONTACT": null,
        "RQ_EMAIL": null,
        "RQ_PHONE": null,
        "RQ_FAX": null,
        "RQ_IDENT_TYPE": null,
        "RQ_IDENT_DOC": null,
        "RQ_IDENT_DOC_SER": null,
        "RQ_IDENT_DOC_NUM": null,
        "RQ_IDENT_DOC_PERS_NUM": null,
        "RQ_IDENT_DOC_DATE": null,
        "RQ_IDENT_DOC_ISSUED_BY": null,
        "RQ_IDENT_DOC_DEP_CODE": null,
        "RQ_INN": "5168468468",
        "RQ_KPP": null,
        "RQ_USRLE": null,
        "RQ_IFNS": null,
        "RQ_OGRN": null,
        "RQ_OGRNIP": null,
        "RQ_OKPO": null,
        "RQ_OKTMO": null,
        "RQ_OKVED": null,
        "RQ_EDRPOU": null,
        "RQ_DRFO": null,
        "RQ_KBE": null,
        "RQ_IIN": null,
        "RQ_BIN": null,
        "RQ_ST_CERT_SER": null,
        "RQ_ST_CERT_NUM": null,
        "RQ_ST_CERT_DATE": null,
        "RQ_VAT_PAYER": "N",
        "RQ_VAT_ID": null,
        "RQ_VAT_CERT_SER": null,
        "RQ_VAT_CERT_NUM": null,
        "RQ_VAT_CERT_DATE": null,
        "RQ_RESIDENCE_COUNTRY": null,
        "RQ_BASE_DOC": null,
        "RQ_REGON": null,
        "RQ_KRS": null,
        "RQ_PESEL": null,
        "RQ_LEGAL_FORM": null,
        "RQ_SIRET": null,
        "RQ_SIREN": null,
        "RQ_CAPITAL": null,
        "RQ_RCS": null,
        "RQ_CNPJ": null,
        "RQ_STATE_REG": null,
        "RQ_MNPL_REG": null,
        "RQ_CPF": null
    }
]

post contacts/requisite
{
"ENTITY_TYPE_ID": 3,
"ENTITY_ID": 15,
"PRESET_ID": 1,
"NAME": "Vietcombank Info",
"RQ_INN": "123456789"
}

trả về thành công
{
    "requisiteId": 11
}

put localhost:3000/contacts/requisite/11
{
"NAME" : "VIETINBANK"
}
trả về thành công
{
    "message": "Requisite updated"
}

delete localhost:3000/contacts/requisite/11
trả về thành công
{
    "message": "Requisite deleted"
}

Kết quả unit test

https://github.com/user-attachments/assets/647b457a-4689-47de-afa8-264a0c0deae6

