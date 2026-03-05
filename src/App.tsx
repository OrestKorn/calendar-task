import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import Calendar from './components/Calendar'
import type { HolidaysByDate, TasksByDate, Task, Holiday } from './types'

function App() {
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(() => dayjs())
  const [tasksByDate, setTasksByDate] = useState<TasksByDate>({})
  const [holidaysByDate, setHolidaysByDate] = useState<HolidaysByDate>({})
  const calendarContainerRef = useRef<HTMLDivElement | null>(null)

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => prev.subtract(1, 'month'))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => prev.add(1, 'month'))
  }

  const handleSelectDate = (date: dayjs.Dayjs) => {
    setSelectedDate(date)
    setCurrentMonth(date.startOf('month'))
  }

  const handleAddTask = (date: dayjs.Dayjs, text: string) => {
    const key = date.format('YYYY-MM-DD')

    setTasksByDate((prev) => {
      const existing = prev[key] ?? []
      const newTask: Task = {
        id: `${key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        date: key,
      }

      return {
        ...prev,
        [key]: [...existing, newTask],
      }
    })
  }

  const handleUpdateTask = (date: dayjs.Dayjs, taskId: string, text: string) => {
    const key = date.format('YYYY-MM-DD')

    setTasksByDate((prev) => {
      const existing = prev[key] ?? []

      return {
        ...prev,
        [key]: existing.map((task) =>
          task.id === taskId
            ? {
                ...task,
                text,
              }
            : task,
        ),
      }
    })
  }

  const handleDeleteTask = (dateKey: string, taskId: string) => {
    setTasksByDate((prev) => {
      const existing = prev[dateKey] ?? []
      const nextTasks = existing.filter((task) => task.id !== taskId)

      if (nextTasks.length === 0) {
        const { [dateKey]: _removed, ...rest } = prev
        return rest
      }

      return {
        ...prev,
        [dateKey]: nextTasks,
      }
    })
  }

  const handleMoveTask = (
    taskId: string,
    fromDateKey: string,
    toDateKey: string,
    toIndex: number,
  ) => {
    setTasksByDate((prev) => {
      const fromTasks = prev[fromDateKey] ?? []
      const toTasks = prev[toDateKey] ?? []

      const taskToMove = fromTasks.find((task) => task.id === taskId)
      if (!taskToMove) return prev

      // Reorder within the same day
      if (fromDateKey === toDateKey) {
        const withoutTask = fromTasks.filter((task) => task.id !== taskId)
        const clampedIndex = Math.max(0, Math.min(toIndex, withoutTask.length))

        const reordered: Task[] = [
          ...withoutTask.slice(0, clampedIndex),
          taskToMove,
          ...withoutTask.slice(clampedIndex),
        ]

        return {
          ...prev,
          [fromDateKey]: reordered,
        }
      }

      // Move between different days
      const updatedFromTasks = fromTasks.filter((task) => task.id !== taskId)
      const updatedTask: Task = {
        ...taskToMove,
        date: toDateKey,
      }

      const clampedIndex = Math.max(0, Math.min(toIndex, toTasks.length))
      const updatedToTasks: Task[] = [
        ...toTasks.slice(0, clampedIndex),
        updatedTask,
        ...toTasks.slice(clampedIndex),
      ]

      return {
        ...prev,
        [fromDateKey]: updatedFromTasks,
        [toDateKey]: updatedToTasks,
      }
    })
  }

  const currentYear = currentMonth.year()

  useEffect(() => {
    const controller = new AbortController()

    const fetchHolidays = async () => {
      try {
        const response = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/GB`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          return
        }

        const data: Holiday[] = await response.json()

        const mapped: HolidaysByDate = data.reduce<HolidaysByDate>((acc, holiday) => {
          const key = holiday.date
          if (!acc[key]) {
            acc[key] = []
          }
          acc[key].push(holiday)
          return acc
        }, {})

        setHolidaysByDate(mapped)
      } catch {
        // ignore network errors for now
      }
    }

    fetchHolidays()

    return () => {
      controller.abort()
    }
  }, [currentYear])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = calendarContainerRef.current
      if (!container) return

      if (!container.contains(event.target as Node)) {
        setSelectedDate(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const selectedLabel = selectedDate
    ? selectedDate.format('dddd, D MMMM YYYY')
    : '—'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 32px 40px',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={calendarContainerRef}
        style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}
      >
        <Calendar
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          tasksByDate={tasksByDate}
          holidaysByDate={holidaysByDate}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onMoveTask={handleMoveTask}
          onDeleteTask={handleDeleteTask}
        />
        <div
          style={{
            marginTop: 16,
            color: '#e5e7eb',
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            textAlign: 'center',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ color: '#9ca3af' }}>Selected date: </span>
          <span>{selectedLabel}</span>
        </div>
      </div>
    </div>
  )
}

export default App
