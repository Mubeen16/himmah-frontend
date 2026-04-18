import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(
            'http://127.0.0.1:8000/api/token/refresh/',
            { refresh }
          )
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export interface DayIntention {
  id: number
  day_plan: number | null
  date: string
  title: string
  focus: string
  purpose: string
  character: string
  created_at: string
  updated_at: string
}

export interface TaskReflection {
  id: number
  task: number
  note: string
  what_went_well: string
  what_missed: string
  actual_mins: number | null
  created_at: string
  updated_at: string
}

export default api
