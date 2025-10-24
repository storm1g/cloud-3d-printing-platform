# --- FAZA 1: "BUILDER" ---
# Koristimo pun Ubuntu da preuzmemo i otpakujemo sve što nam treba.
# Nazivamo ovu fazu "builder" da bismo je kasnije mogli referencirati.
FROM ubuntu:24.04 AS builder

# Postavlja non-interactive mod za apt-get
ENV DEBIAN_FRONTEND=noninteractive

# 1. Instaliramo SAMO alate koji nam trebaju za build
# ISPRAVKA: Dodat je 'ca-certificates' koji je neophodan za curl (HTTPS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    xz-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Preuzimamo i instaliramo AWS CLI
WORKDIR /app
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip
    # Napomena: ./aws folder se *ne* briše, treba nam

# 3. Preuzimamo i ekstraktujemo AppImage
RUN curl -L -o BambuStudio.AppImage https://github.com/bambulab/BambuStudio/releases/download/v02.02.02.56/Bambu_Studio_ubuntu-24.04_PR-8184.AppImage \
    && chmod +x BambuStudio.AppImage \
    && ./BambuStudio.AppImage --appimage-extract
    # Napomena: Ne brišemo ništa, jer će ceo ovaj sloj biti bačen


# --- FAZA 2: "FINALNA SLIKA" ---
# Počinjemo PONOVO od čiste Ubuntu slike.
FROM ubuntu:24.04

# Postavlja non-interactive mod za apt-get
ENV DEBIAN_FRONTEND=noninteractive

# 1. Instaliramo SAMO biblioteke koje su potrebne za *rad* (runtime)
# Ne instaliramo curl, unzip, xz-utils... oni nam više ne trebaju
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libegl1 \
    libgtk-3-0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libwebkit2gtk-4.1-0 \
    && rm -rf /var/lib/apt/lists/*

# 2. Kopiramo gotove programe iz "builder" faze
# Kopiramo instalirani AWS CLI
COPY --from=builder /usr/local/aws-cli /usr/local/aws-cli
COPY --from=builder /usr/local/bin/aws /usr/local/bin/aws

# Kopiramo ekstraktovani AppImage
COPY --from=builder /app/squashfs-root /app/squashfs-root

# 3. Podešavamo metadata kao i pre
ENV BAMBUSTUDIO_PATH=/app/squashfs-root/AppRun
WORKDIR /data

ENTRYPOINT ["/app/squashfs-root/AppRun"]
CMD ["--help"]
