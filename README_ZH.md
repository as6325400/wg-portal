# wg-portal

[English README](README.md)

自架 WireGuard 管理網頁介面，支援 Linux PAM 及 LDAP 認證。

![WireGuard](https://img.shields.io/badge/WireGuard-88171A?logo=wireguard&logoColor=white)
![Vue 3](https://img.shields.io/badge/Vue_3-4FC08D?logo=vuedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Built with Claude](https://img.shields.io/badge/Built_with-Claude-cc785c?logo=anthropic&logoColor=white)
![Docker Pulls](https://img.shields.io/docker/pulls/as6325400/wg-portal-backend?label=Docker%20Pulls)


## 截圖

### 登入
![Login](docs/screenshots/zh-TW/login.png)

### 儀表板
![Dashboard](docs/screenshots/zh-TW/dashboard.png)

### 管理
![Admin](docs/screenshots/zh-TW/admin.png)

## 功能

- **雙重認證** — Linux PAM + LDAP（FreeIPA、OpenLDAP、AD），自動降級切換
- **存取控制** — 以群組或個別使用者限制登入，二層式手風琴選單介面
- **裝置管理** — 建立、刪除、下載 WireGuard 客戶端設定檔
- **QR Code** — 直接從網頁掃描，搭配手機 WireGuard App 使用
- **流量統計** — 即時頻寬與最後交握時間監控
- **管理面板** — 管理使用者、裝置上限、啟用/停用帳號
- **多語系** — 英文及繁體中文
- **Docker 部署** — 完整 Docker Compose 設定，三容器架構

## 架構

```
             :80          :51820/udp
              │                │
        ┌─────▼─────┐   ┌─────▼──────────────────────┐
        │  frontend  │   │  wireguard                 │
        │  (nginx)   │   │  (wg0 interface)           │
        │  dist/     │   │                            │
        └─────┬──────┘   │  ┌───────────────────────┐ │
              │          │  │ backend               │ │
     /api ────┼──────────┼─►│ Express :3000         │ │
              │          │  │ PAM + LDAP + wg CLI   │ │
              │          │  └───────────────────────┘ │
              └──────────┴────────────────────────────┘
```

| 容器 | 角色 | 基底映像 |
|------|------|----------|
| **frontend** | Nginx 提供打包好的 Vue SPA，代理 `/api` 至後端 | `nginx:alpine` |
| **backend** | Express API、PAM/LDAP 認證、WireGuard peer 管理 | `node:22-bookworm-slim` |
| **wireguard** | WireGuard 介面，首次啟動自動產生伺服器設定 | `alpine:3.19` |

後端透過 `network_mode: service:wireguard` 共享 WireGuard 的 network namespace，可直接使用 `wg` CLI。

## 快速開始

### 前置需求

- Docker + Docker Compose
- Linux 核心 5.6+（內建 WireGuard 支援）

### 1. 下載

```bash
git clone https://github.com/as6325400/wg-portal.git
cd wg-portal
```

### 2. 設定

```bash
cp .env.example .env
```

編輯 `.env`：

```env
# 必填
SESSION_SECRET=<隨機64字元字串>
ENCRYPTION_KEY=<隨機64位hex字串>
WG_ENDPOINT=你的伺服器公網IP:51820

# 選填
WG_SUBNET=10.0.0.0/24
WG_DNS=1.1.1.1
HTTP_PORT=80
TAG=latest
```

產生密鑰：

```bash
openssl rand -hex 32   # SESSION_SECRET 和 ENCRYPTION_KEY 都可使用
```

### 3. 啟動

```bash
docker compose up -d
```

映像檔會自動從 Docker Hub 拉取。若要使用特定版本：

```bash
TAG=1.0.0 docker compose up -d
```

開啟 `http://你的伺服器` 並使用主機上的 Linux 帳號登入。

> **備註：** 屬於 `sudo` 或 `wheel` 群組的使用者（或 `root`）會自動獲得管理員權限。

### Docker 映像

| 映像 | 說明 |
|------|------|
| [`as6325400/wg-portal-wireguard`](https://hub.docker.com/r/as6325400/wg-portal-wireguard) | WireGuard 介面容器 |
| [`as6325400/wg-portal-backend`](https://hub.docker.com/r/as6325400/wg-portal-backend) | Express API + PAM/LDAP 認證 |
| [`as6325400/wg-portal-frontend`](https://hub.docker.com/r/as6325400/wg-portal-frontend) | Nginx 提供 Vue SPA |

## LDAP 認證

wg-portal 支援 LDAP 作為認證來源，與 PAM 並行運作。設定 LDAP 後，登入時會優先嘗試 LDAP，失敗則自動降級至 PAM。

### 支援的 LDAP 伺服器

- FreeIPA
- OpenLDAP
- Active Directory（使用 `uid` 或 `sAMAccountName` 過濾器）

### 設定方式

在 `.env` 中加入 LDAP 變數：

```env
# LDAP 設定
LDAP_URL=ldaps://your-ldap-server:636
LDAP_BIND_DN=cn=Directory Manager
LDAP_BIND_PASSWORD=your-bind-password
LDAP_BASE_DN=cn=users,cn=accounts,dc=example,dc=com
LDAP_USER_FILTER=(uid={username})
LDAP_ADMIN_GROUP=admins
LDAP_TLS_REJECT_UNAUTHORIZED=false   # 自簽憑證設為 false
```

然後重啟後端：

```bash
docker compose restart backend
```

### 運作流程

1. 使用者送出登入帳密
2. 後端嘗試 LDAP bind（先搜尋使用者 DN，再用密碼 bind）
3. 若 LDAP 失敗，降級至 PAM 認證
4. 從 LDAP `memberOf` 屬性取得使用者群組
5. 若設定了 `LDAP_ADMIN_GROUP`，該群組的使用者自動取得管理員權限

### FreeIPA 範例

```env
LDAP_URL=ldaps://ipa.example.com:636
LDAP_BIND_DN=uid=admin,cn=users,cn=accounts,dc=example,dc=com
LDAP_BIND_PASSWORD=your-password
LDAP_BASE_DN=cn=users,cn=accounts,dc=example,dc=com
LDAP_USER_FILTER=(uid={username})
LDAP_ADMIN_GROUP=admins
LDAP_TLS_REJECT_UNAUTHORIZED=false
```

### OpenLDAP 範例

```env
LDAP_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=your-password
LDAP_BASE_DN=dc=example,dc=com
LDAP_USER_FILTER=(uid={username})
LDAP_ADMIN_GROUP=admin
```

### Active Directory 範例

```env
LDAP_URL=ldaps://ad.example.com:636
LDAP_BIND_DN=CN=Service Account,OU=Service Accounts,DC=example,DC=com
LDAP_BIND_PASSWORD=your-password
LDAP_BASE_DN=DC=example,DC=com
LDAP_USER_FILTER=(sAMAccountName={username})
LDAP_ADMIN_GROUP=Domain Admins
```

## 存取控制

管理面板提供二層式存取控制系統，限制哪些人可以登入。

### 群組層級

勾選整個群組即可允許所有成員登入。Linux 群組和 LDAP 群組都會列出。

### 使用者層級

展開任何群組可以看到成員列表，並個別勾選使用者。這與群組選擇互相獨立——你可以只允許特定使用者，而不需要允許他們所屬的整個群組。

### 運作規則

- **都沒選** = 不限制，所有人都能登入
- **選了群組** = 只有該群組的成員可以登入
- **選了使用者** = 該使用者可以登入（不管他屬於哪個群組）
- **兩者都有** = 在任一選取群組中的使用者 或 個別選取的使用者 都可以登入
- 管理員永遠不受存取控制影響

當存取規則變更時，WireGuard peer 會自動同步——被移除權限的使用者其 peer 會被停用，重新獲得權限的使用者其 peer 會被重新啟用。

## 開發

### 本地建置

若要在本地 build 映像而非從 Docker Hub 拉取：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up --build
```

### Docker 開發模式

原始碼透過 volume 掛載——修改後即時生效，無需重新建置映像。

```bash
docker compose -f docker-compose.dev.yml up --build   # 第一次
docker compose -f docker-compose.dev.yml up            # 之後
```

- 前端：`http://localhost:5173`（Vite HMR 熱更新）
- 後端：`node --watch` 自動重啟

### 不使用 Docker

主機需安裝 `wireguard-tools`、`build-essential`、`libpam0g-dev`。

```bash
npm install

# 終端 1 - 後端（需要 sudo 執行 wg 指令）
sudo env PATH="$PATH" npx nodemon --watch server server/index.js

# 終端 2 - 前端
npm run dev:client
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Vue 3、Vite、Tailwind CSS v4、Pinia、Axios |
| 後端 | Node.js 22、Express 5、better-sqlite3、express-session |
| 認證 | Linux PAM（`authenticate-pam`）、LDAP（`ldapts`）、session-based |
| 資料庫 | SQLite（WAL 模式） |
| VPN | WireGuard CLI（`wg genkey/pubkey/set/show`） |
| 加密 | AES-256-GCM 加密儲存私鑰 |
| 容器 | Docker Compose、三服務架構 |

## 設定參數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `SESSION_SECRET` | — | **必填。** Session 加密金鑰 |
| `ENCRYPTION_KEY` | — | **必填。** 私鑰加密金鑰（64 位 hex） |
| `WG_ENDPOINT` | — | **必填。** 客戶端連線的公網端點 |
| `WG_INTERFACE` | `wg0` | WireGuard 介面名稱 |
| `WG_SUBNET` | `10.0.0.0/24` | VPN 子網路 |
| `WG_SERVER_IP` | `10.0.0.1` | 伺服器在 VPN 子網路中的 IP |
| `WG_DNS` | `1.1.1.1` | VPN 客戶端使用的 DNS |
| `WG_ALLOWED_IPS` | `0.0.0.0/0` | 客戶端的 Allowed IPs |
| `WG_PORT` | `51820` | WireGuard 監聽埠 |
| `HTTP_PORT` | `80` | 前端 HTTP 埠 |
| `PORT` | `3000` | 後端伺服器埠 |
| `TAG` | `latest` | Docker 映像版本標籤 |
| `LDAP_URL` | — | LDAP 伺服器 URL（如 `ldaps://server:636`） |
| `LDAP_BIND_DN` | — | LDAP 搜尋用的 Bind DN |
| `LDAP_BIND_PASSWORD` | — | Bind 密碼 |
| `LDAP_BASE_DN` | — | 使用者搜尋的 Base DN |
| `LDAP_USER_FILTER` | `(uid={username})` | LDAP 搜尋過濾器（`{username}` 會被取代） |
| `LDAP_ADMIN_GROUP` | — | 授予管理員權限的 LDAP 群組名稱 |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | `true` | 自簽憑證設為 `false` |

## 專案結構

```
wg-portal/
├── docker-compose.yml          # 正式部署（從 Docker Hub 拉取）
├── docker-compose.build.yml    # 覆寫設定，本地建置映像
├── docker-compose.dev.yml      # 開發模式（熱更新）
├── docker/
│   ├── Dockerfile.frontend     # 多階段建置：Node build → Nginx
│   ├── Dockerfile.backend      # Node 22 + PAM + wg-tools
│   ├── Dockerfile.wireguard    # Alpine + wireguard-tools
│   ├── nginx.conf              # 靜態檔 + API 反向代理
│   └── wg-entrypoint.sh        # 自動產生 WG 伺服器設定
├── server/
│   ├── index.js                # Express 進入點
│   ├── config.js               # 環境變數設定
│   ├── db.js                   # SQLite schema 與初始化
│   ├── crypto.js               # AES-256-GCM 加密
│   ├── middleware/              # 認證、session、速率限制
│   ├── routes/                 # Auth、Devices、Admin API
│   └── services/               # PAM、LDAP、WireGuard、IP 分配
├── src/
│   ├── views/                  # Login、Dashboard、Admin
│   ├── components/             # UI 元件
│   ├── stores/                 # Pinia auth store
│   ├── api/                    # Axios API 封裝
│   ├── i18n/                   # en、zh-TW 翻譯
│   └── router/                 # Vue Router + 路由守衛
├── .env.example
└── package.json
```

## 安全性

- 私鑰以 AES-256-GCM 加密儲存
- Session Cookie：`HttpOnly`、`SameSite=Strict`
- 登入速率限制（15 分鐘內最多 10 次嘗試）
- PAM 認證對接系統帳號
- LDAP 認證採用 search-then-bind（密碼不會被儲存）
- 管理員權限限於 sudo/wheel/root 使用者（PAM）或設定的 LDAP 管理群組
- 所有端點皆有輸入驗證

## 授權

MIT
