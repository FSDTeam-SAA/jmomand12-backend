#!/bin/bash
set -e

echo "=== Installing Native Grafana, Loki, and Promtail Monitoring Stack ==="

# 1. Install Grafana Server
echo "-> Installing Grafana Server..."
apt-get update -y
apt-get install -y apt-transport-https software-properties-common wget
mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list
apt-get update -y
apt-get install -y grafana

systemctl daemon-reload
systemctl enable --now grafana-server

echo "-> Grafana server installed and running on port 3000."

# 2. Install Loki Binary & Systemd Service
echo "-> Installing Loki..."
LOKI_VERSION="2.9.4"
mkdir -p /etc/loki /var/lib/loki
wget -q "https://github.com/grafana/loki/releases/download/v${LOKI_VERSION}/loki-linux-amd64.zip" -O /tmp/loki.zip
apt-get install -y unzip
unzip -o /tmp/loki.zip -d /usr/local/bin/
chmod +x /usr/local/bin/loki-linux-amd64
ln -sf /usr/local/bin/loki-linux-amd64 /usr/local/bin/loki

cp /var/www/discountdealsdmv/backend/monitoring/native/loki-config.yml /etc/loki/loki-config.yml

cat << 'EOF' > /etc/systemd/system/loki.service
[Unit]
Description=Grafana Loki Log Aggregation System
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki-config.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now loki

echo "-> Loki storage engine installed and running on port 3100."

# 3. Install Promtail Binary & Systemd Service
echo "-> Installing Promtail..."
wget -q "https://github.com/grafana/loki/releases/download/v${LOKI_VERSION}/promtail-linux-amd64.zip" -O /tmp/promtail.zip
unzip -o /tmp/promtail.zip -d /usr/local/bin/
chmod +x /usr/local/bin/promtail-linux-amd64
ln -sf /usr/local/bin/promtail-linux-amd64 /usr/local/bin/promtail

mkdir -p /etc/promtail
cp /var/www/discountdealsdmv/backend/monitoring/native/promtail-config.yml /etc/promtail/promtail-config.yml

cat << 'EOF' > /etc/systemd/system/promtail.service
[Unit]
Description=Promtail Log Shipper Agent
After=network.target loki.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/promtail -config.file=/etc/promtail/promtail-config.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now promtail

echo "=== Monitoring Stack Installation Complete! ==="
echo "Grafana Dashboard: http://2.25.69.234:3000 (Default login: admin / admin)"
echo "Loki Server: http://127.0.0.1:3100"
echo "Promtail Status: systemctl status promtail"
