import type { Dayjs } from 'dayjs'

export type MonthMatrix = Dayjs[][]

export type Task = {
  id: string
  text: string
  date: string // YYYY-MM-DD
  order: number
}

export type TasksByDate = Record<string, Task[]>

export type Holiday = {
  date: string // YYYY-MM-DD
  localName: string
  name: string
  countryCode: string
}

export type HolidaysByDate = Record<string, Holiday[]>



