export default {
  // Common
  save: '儲存',
  saving: '儲存中...',
  cancel: '取消',
  close: '關閉',
  loading: '載入中...',

  // Login
  login: {
    subtitle: '使用 Linux 帳號登入',
    username: '使用者名稱',
    password: '密碼',
    submit: '登入',
    submitting: '登入中...',
    failed: '登入失敗',
  },

  // Nav
  nav: {
    admin: '管理',
    logout: '登出',
  },

  // Dashboard
  dashboard: {
    title: '用戶端',
    new: '新增',
    empty: '尚無用戶端，點擊「新增」來建立。',
  },

  // Device
  device: {
    online: '線上',
    justNow: '剛剛',
    mAgo: '{n} 分鐘前',
    hAgo: '{n} 小時前',
    dAgo: '{n} 天前',
    qrCode: 'QR Code',
    downloadConfig: '下載設定檔',
    delete: '刪除',
    confirmDelete: '確定刪除裝置「{name}」？',
    downloadFailed: '下載設定檔失敗',
    deleteFailed: '刪除裝置失敗',
  },

  // Device Create Modal
  create: {
    title: '新增用戶端',
    description: '輸入新 WireGuard 用戶端的名稱。',
    placeholder: '例如 my-laptop',
    submit: '建立',
    submitting: '建立中...',
    nameRequired: '裝置名稱為必填',
    failed: '建立裝置失敗',
  },

  // QR Code Modal
  qr: {
    description: '使用 WireGuard App 掃描。',
    loadFailed: '載入 QR Code 失敗',
  },

  // Admin
  admin: {
    users: '使用者',
    admin: '管理員',
    disabled: '已停用',
    devices: '裝置',
    edit: '編輯',
    allowedGroups: '允許的群組',
    groupsDescription: '選擇允許登入的 Linux 群組。若未選擇任何群組，則所有群組皆可登入。',
    loadingGroups: '載入群組中...',
    all: '全部',
    settingsSaved: '設定已儲存',
    settingsFailed: '儲存設定失敗',
  },

  // User Edit Modal
  userEdit: {
    title: '編輯使用者：{name}',
    description: '修改使用者設定。',
    maxDevices: '裝置上限',
    enabled: '啟用',
    devices: '裝置 ({n})',
    updateFailed: '更新使用者失敗',
  },
}
