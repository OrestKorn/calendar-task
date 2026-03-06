import type { Task } from '../types'

const API_BASE = 'http://localhost:5001/api'
const TASKS_URL = `${API_BASE}/tasks`

type CreateTaskPayload = {
  text: string
  date: string
  order: number
}

type UpdateTaskPayload = Partial<Pick<Task, 'text' | 'date' | 'order'>>

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(TASKS_URL)
  if (!res.ok) {
    throw new Error('Failed to fetch tasks')
  }
  const data = (await res.json()) as Task[]
  return data
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const res = await fetch(TASKS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('Failed to create task')
  }
  const data = (await res.json()) as Task
  return data
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('Failed to update task')
  }
  const data = (await res.json()) as Task
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${TASKS_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error('Failed to delete task')
  }
}

