#!/bin/bash
set -e

WG_INTERFACE="${WG_INTERFACE:-wg0}"
WG_SUBNET="${WG_SUBNET:-10.0.0.0/24}"
WG_SERVER_IP="${WG_SERVER_IP:-10.0.0.1}"
WG_PORT="${WG_PORT:-51820}"
WG_CONF="/etc/wireguard/${WG_INTERFACE}.conf"

# Generate server config if it doesn't exist
if [ ! -f "$WG_CONF" ]; then
    echo "[INFO] No WireGuard config found. Generating initial config..."

    SERVER_PRIVATE_KEY=$(wg genkey)
    SERVER_PUBLIC_KEY=$(echo "$SERVER_PRIVATE_KEY" | wg pubkey)

    echo "[INFO] Server public key: ${SERVER_PUBLIC_KEY}"

    # Determine default network interface for NAT
    DEFAULT_IFACE=$(ip route show default | awk '/default/ {print $5}' | head -1)
    [ -z "$DEFAULT_IFACE" ] && DEFAULT_IFACE="eth0"

    PREFIX="${WG_SUBNET#*/}"

    cat > "$WG_CONF" <<EOF
[Interface]
Address = ${WG_SERVER_IP}/${PREFIX}
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIVATE_KEY}
PostUp = iptables -t nat -A POSTROUTING -s ${WG_SUBNET} -o ${DEFAULT_IFACE} -j MASQUERADE
PostDown = iptables -t nat -D POSTROUTING -s ${WG_SUBNET} -o ${DEFAULT_IFACE} -j MASQUERADE
EOF

    chmod 600 "$WG_CONF"
    echo "[INFO] WireGuard config generated at ${WG_CONF}"
fi

echo "[INFO] Starting WireGuard interface ${WG_INTERFACE}..."
wg-quick up "$WG_INTERFACE"

echo "[INFO] WireGuard is running."
wg show "$WG_INTERFACE"

# Graceful shutdown
shutdown() {
    echo "[INFO] Shutting down WireGuard..."
    wg-quick down "$WG_INTERFACE"
    exit 0
}
trap shutdown SIGTERM SIGINT

# Keep running
while true; do
    sleep 3600 &
    wait $!
done
