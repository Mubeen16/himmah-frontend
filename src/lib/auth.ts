import axios from 'axios'

const BASE = 'http://127.0.0.1:8000/api'

export async function login(username: string, password: string) {
  const res = await axios.post(`${BASE}/token/`, { username, password })
  localStorage.setItem('access_token', res.data.access)
  localStorage.setItem('refresh_token', res.data.refresh)
  document.cookie = `access_token=${res.data.access}; path=/; max-age=86400`
  return res.data
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  document.cookie = 'access_token=; path=/; max-age=0'
  window.location.href = '/login'
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token')
}
