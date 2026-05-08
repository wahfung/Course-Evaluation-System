# Course Evaluation System (2904)

## 技术栈

- **Frontend**: HTML5 + Tailwind CSS + Vanilla JavaScript
- **Backend**: Python + Django + Django REST Framework
- **Database**: SQLite（本地开发默认）/ MySQL 8.0（容器运行）

## 本地启动

### 后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python seed.py
python manage.py runserver 127.0.0.1:8000
```

### 前端

直接在浏览器中打开 `frontend/index.html`。本地文件方式会调用 `http://127.0.0.1:8000/api`，请先启动后端服务。

## 服务地址

- **Frontend**: `frontend/index.html`
- **Backend API**: `http://127.0.0.1:8000/api/`
- **Local Database**: `backend/db.sqlite3`

## 测试账号

- **Admin**: `admin` / `admin123`
- **Teacher**: `teacher1` / `teacher123`
- **Student**: `student1` / `student123`
