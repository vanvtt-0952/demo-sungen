# demo-sungen

# Bước 1: Install & setup
Tạo mới thư mục -> Mở VSCode IDE với lệnh `code .` ở cmd

```
npm install -g @sun-asterisk/sungen@latest
sungen init --base-url https://ask.awesome-services.net/
```
Điền overview dự án

## Từ bước này, thực hiện ở Chat AI
# Bước 2: Add screen
- Chuẩn bị: tạo mới file `.env.qa`
```
/sungen:add-screen contact-points /vi/contact-points
Đọc file .env.qa để
1. Lấy thông tin Basic Authen
2. Login qua AIP https://ask.awesome-services.net/api/login/test/{EMAIL_USER}
```

# Bước 3: Gen testcases Gherkin
```
/sungen:create-test contact-points
```


# Bước 4: Run automation test 
```
/sungen:run-test contact-points 
```

# Bước 5: Delivery 
```
/sungen:delivery contact-points 
```
