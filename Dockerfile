# Base image
FROM ubuntu:24.04

# Radni direktorijum
WORKDIR /app

# Instalacija zavisnosti koje AppImage traži
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    libgl1 \
    libegl1 \
    libgtk-3-0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libwebkit2gtk-4.1-0 \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Preuzmi Bambu Studio AppImage
RUN curl -L -o BambuStudio.AppImage https://github.com/bambulab/BambuStudio/releases/download/v02.02.02.56/Bambu_Studio_ubuntu-24.04_PR-8184.AppImage

# Dozvole + ekstrakcija AppImage-a
RUN chmod +x BambuStudio.AppImage && ./BambuStudio.AppImage --appimage-extract

# Podesi AppRun kao entrypoint
ENV BAMBUSTUDIO_PATH=/app/squashfs-root/AppRun
WORKDIR /data

# Test command
ENTRYPOINT ["/app/squashfs-root/AppRun"]
CMD ["--help"]
