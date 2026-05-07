FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir torch==2.2.2+cpu torchvision==0.17.2+cpu --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir fastapi==0.111.0 uvicorn==0.29.0 python-multipart==0.0.9 pillow==10.3.0 opencv-python-headless==4.9.0.80 numpy==1.26.4
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
