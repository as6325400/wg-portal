export default {
  // Common
  save: 'Save',
  saving: 'Saving...',
  cancel: 'Cancel',
  close: 'Close',
  loading: 'Loading...',

  // Login
  login: {
    subtitle: 'Sign in to manage your VPN',
    username: 'Username',
    password: 'Password',
    submit: 'Sign In',
    submitting: 'Signing in...',
    failed: 'Login failed',
  },

  // Nav
  nav: {
    admin: 'Admin',
    logout: 'Logout',
  },

  // Dashboard
  dashboard: {
    title: 'Clients',
    new: 'New',
    empty: 'No clients yet. Click "New" to create one.',
  },

  // Device
  device: {
    online: 'Online',
    justNow: 'just now',
    mAgo: '{n}m ago',
    hAgo: '{n}h ago',
    dAgo: '{n}d ago',
    qrCode: 'QR Code',
    downloadConfig: 'Download Config',
    delete: 'Delete',
    confirmDelete: 'Delete device "{name}"?',
    downloadFailed: 'Failed to download config',
    deleteFailed: 'Failed to delete device',
  },

  // Device Create Modal
  create: {
    title: 'New Client',
    description: 'Enter a name for the new WireGuard client.',
    placeholder: 'e.g. my-laptop',
    submit: 'Create',
    submitting: 'Creating...',
    nameRequired: 'Device name is required',
    failed: 'Failed to create device',
  },

  // QR Code Modal
  qr: {
    description: 'Scan with the WireGuard app.',
    loadFailed: 'Failed to load QR code',
  },

  // Admin
  admin: {
    users: 'Users',
    admin: 'admin',
    disabled: 'disabled',
    devices: 'devices',
    edit: 'Edit',
    allowedGroups: 'Access Control',
    groupsDescription: 'Select which groups or individual users are allowed to log in. Expand a group to select individual members. If nothing is selected, all users are allowed.',
    loadingGroups: 'Loading groups...',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    noRestriction: 'No restriction (all users allowed)',
    selectedCount: 'Covers {covered} user(s)',
    settingsSaved: 'Settings saved',
    settingsFailed: 'Failed to save settings',
  },

  // User Edit Modal
  userEdit: {
    title: 'Edit User: {name}',
    description: 'Modify user settings.',
    maxDevices: 'Max Devices',
    enabled: 'Enabled',
    devices: 'Devices ({n})',
    updateFailed: 'Failed to update user',
  },
}
