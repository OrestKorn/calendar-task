import dayjs, { type Dayjs } from 'dayjs'
import type { MonthMatrix } from '../types'

export const generateMonthMatrix = (currentMonth: Dayjs): MonthMatrix => {
  const startOfMonth = currentMonth.startOf('month')
  const jsDay = startOfMonth.day() // 0 (Sun) - 6 (Sat)
  const mondayFirstIndex = (jsDay + 6) % 7 // 0 (Mon) - 6 (Sun)

  const calendarStartDate = startOfMonth.subtract(mondayFirstIndex, 'day')

  const weeks = 6
  const daysInWeek = 7

  const matrix: MonthMatrix = []

  for (let week = 0; week < weeks; week += 1) {
    const weekRow: Dayjs[] = []

    for (let day = 0; day < daysInWeek; day += 1) {
      const offset = week * daysInWeek + day
      weekRow.push(calendarStartDate.add(offset, 'day'))
    }

    matrix.push(weekRow)
  }

  return matrix
}

export const isToday = (date: Dayjs): boolean => dayjs().isSame(date, 'day')

export const isSameMonth = (date: Dayjs, reference: Dayjs): boolean =>
  date.isSame(reference, 'month')

