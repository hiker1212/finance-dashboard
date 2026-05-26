import { apiClient } from './client'
import type { Category } from '../types'

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/categories'),
  create: (data: { name: string; color: string }) =>
    apiClient.post<Category>('/categories', data),
  update: (id: number, data: { name: string; color: string }) =>
    apiClient.put<Category>(`/categories/${id}`, data),
  remove: (id: number) => apiClient.delete(`/categories/${id}`),
}
