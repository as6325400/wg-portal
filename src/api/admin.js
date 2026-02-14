import api from './index.js'

export const adminApi = {
  listUsers() {
    return api.get('/admin/users').then(r => r.data)
  },
  getUserDevices(userId) {
    return api.get(`/admin/users/${userId}/devices`).then(r => r.data)
  },
  updateUser(userId, data) {
    return api.patch(`/admin/users/${userId}`, data).then(r => r.data)
  },
  listGroups() {
    return api.get('/admin/groups').then(r => r.data)
  },
  getSettings() {
    return api.get('/admin/settings').then(r => r.data)
  },
  updateSettings(data) {
    return api.put('/admin/settings', data).then(r => r.data)
  },
}
