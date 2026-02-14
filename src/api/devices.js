import api from './index.js'

export const devicesApi = {
  list() {
    return api.get('/devices').then(r => r.data)
  },
  create(name) {
    return api.post('/devices', { name }).then(r => r.data)
  },
  remove(id) {
    return api.delete(`/devices/${id}`).then(r => r.data)
  },
  getConfig(id) {
    return api.get(`/devices/${id}/config`, { responseType: 'blob' }).then(r => r.data)
  },
  getQrCode(id) {
    return api.get(`/devices/${id}/qrcode`).then(r => r.data)
  },
}
