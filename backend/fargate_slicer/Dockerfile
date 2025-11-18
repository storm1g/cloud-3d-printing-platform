# ------------------------------------
# Stage 1: 'builder' - Download tools
# ------------------------------------
FROM ubuntu:24.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive

# Install ca-certificates for SSL connections
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip

# Download and extract Bambu Studio
WORKDIR /app
RUN curl -L -o BambuStudio.AppImage https://github.com/bambulab/BambuStudio/releases/download/v02.02.02.56/Bambu_Studio_ubuntu-24.04_PR-8184.AppImage
RUN chmod +x BambuStudio.AppImage && ./BambuStudio.AppImage --appimage-extract

# ------------------------------------
# Stage 2: 'final' - The clean, final image
# ------------------------------------
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies including minimal Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libegl1 \
    libgtk-3-0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libwebkit2gtk-4.1-0 \
    python3-minimal \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy AWS CLI
COPY --from=builder /usr/local/aws-cli /usr/local/aws-cli
COPY --from=builder /usr/local/bin/aws /usr/local/bin/aws

# Set Python path for AWS CLI
ENV PYTHONHOME=/usr/local/aws-cli/v2/current
ENV PATH=/usr/local/aws-cli/v2/current/bin:$PATH

# Copy Bambu Studio and entrypoint
COPY --from=builder /app/squashfs-root /app/squashfs-root
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

WORKDIR /data
ENTRYPOINT ["/app/entrypoint.sh"]