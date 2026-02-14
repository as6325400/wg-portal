import api from './index.js'

export const authApi = {
  login(username, password) {
    return api.post('/auth/login', { username, password }).then(r => r.data)
  },
  logout() {
    return api.post('/auth/logout').then(r => r.data)
  },
  me() {
    return api.get('/auth/me').then(r => r.data)
  },
}
