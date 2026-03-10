FROM python:3.11-slim

# Install Blender
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      wget xz-utils libx11-6 libxi6 libxxf86vm1 libxfixes3 libxrender1 \
      libgl1-mesa-glx libglib2.0-0 && \
    wget -q https://mirror.clarkson.edu/blender/release/Blender4.2/blender-4.2.0-linux-x64.tar.xz -O /tmp/blender.tar.xz && \
    tar -xf /tmp/blender.tar.xz -C /opt/ && \
    ln -s /opt/blender-4.2.0-linux-x64/blender /usr/bin/blender && \
    rm /tmp/blender.tar.xz && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV BLENDER_BIN=/usr/bin/blender
ENV PORT=10000

EXPOSE 10000
CMD ["python", "app.py"]
