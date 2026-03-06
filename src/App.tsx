import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import Calendar from './components/Calendar'
import type { HolidaysByDate, TasksByDate, Task, Holiday } from './types'
import { createTask, deleteTask, fetchTasks, updateTask } from './services/tasks'

function App() {
  const [currentMonth, setCurrentMonth] = useState(() => dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(() => dayjs())
  const [tasksByDate, setTasksByDate] = useState<TasksByDate>({})
  const [holidaysByDate, setHolidaysByDate] = useState<HolidaysByDate>({})
  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('calendar-theme') === 'light'
  })
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

  const handleAddTask = async (date: dayjs.Dayjs, text: string) => {
    const key = date.format('YYYY-MM-DD')

    const currentForDay = tasksByDate[key] ?? []
    const order = currentForDay.length
    const optimisticId = `tmp-${key}-${Date.now()}-${Math.random().toString(16).slice(2)}`

    const optimisticTask: Task = {
      id: optimisticId,
      text,
      date: key,
      order,
    }

    setTasksByDate((prev) => {
      const existing = prev[key] ?? []
      return {
        ...prev,
        [key]: [...existing, optimisticTask],
      }
    })

    try {
      const created = await createTask({ text, date: key, order })

      setTasksByDate((prev) => {
        const existing = prev[key] ?? []
        return {
          ...prev,
          [key]: existing.map((task) => (task.id === optimisticId ? created : task)),
        }
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create task', error)
    }
  }

  const handleUpdateTask = async (date: dayjs.Dayjs, taskId: string, text: string) => {
    const key = date.format('YYYY-MM-DD')

    try {
      const updated = await updateTask(taskId, { text })

      setTasksByDate((prev) => {
        const existing = prev[key] ?? []

        return {
          ...prev,
          [key]: existing.map((task) => (task.id === taskId ? updated : task)),
        }
      })
    } catch {}
  }

  const handleDeleteTask = async (dateKey: string, taskId: string) => {
    try {
      await deleteTask(taskId)

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
    } catch {}
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

      if (fromDateKey === toDateKey) {
        const withoutTask = fromTasks.filter((task) => task.id !== taskId)
        const clampedIndex = Math.max(0, Math.min(toIndex, withoutTask.length))

        const reordered: Task[] = [
          ...withoutTask.slice(0, clampedIndex),
          { ...taskToMove, order: clampedIndex },
          ...withoutTask.slice(clampedIndex).map((t, idx) => ({
            ...t,
            order: clampedIndex + 1 + idx,
          })),
        ]

        void updateTask(taskId, { order: clampedIndex })

        return {
          ...prev,
          [fromDateKey]: reordered,
        }
      }

      const updatedFromTasks = fromTasks.filter((task) => task.id !== taskId)
      const clampedIndex = Math.max(0, Math.min(toIndex, toTasks.length))

      const updatedTask: Task = {
        ...taskToMove,
        date: toDateKey,
        order: clampedIndex,
      }

      const updatedToTasks: Task[] = [
        ...toTasks.slice(0, clampedIndex).map((t, idx) => ({ ...t, order: idx })),
        updatedTask,
        ...toTasks.slice(clampedIndex).map((t, idx) => ({
          ...t,
          order: clampedIndex + 1 + idx,
        })),
      ]

      void updateTask(taskId, { date: toDateKey, order: clampedIndex })

      return {
        ...prev,
        [fromDateKey]: updatedFromTasks,
        [toDateKey]: updatedToTasks,
      }
    })
  }

  const currentYear = currentMonth.year()

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const tasks = await fetchTasks()
        const grouped: TasksByDate = tasks.reduce<TasksByDate>((acc, task) => {
          const key = task.date
          if (!acc[key]) acc[key] = []
          acc[key].push(task)
          return acc
        }, {})
        setTasksByDate(grouped)
      } catch {}
    }

    loadTasks()
  }, [])

  useEffect(() => {
    localStorage.setItem('calendar-theme', isLightTheme ? 'light' : 'dark')
  }, [isLightTheme])

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
      } catch {}
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
        background: isLightTheme
          ? 'radial-gradient(circle at top, #e0f2fe 0, #f9fafb 55%, #e5e7eb 100%)'
          : 'radial-gradient(circle at top, #1d283a 0, #020617 55%, #000 100%)',
      }}
    >
      <div
        ref={calendarContainerRef}
        style={{ width: '100%', maxWidth: 2100, margin: '0 auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setIsLightTheme((prev) => !prev)}
            style={{
              position: 'relative',
              width: 120,
              height: 30,
              borderRadius: 999,
              border: isLightTheme
                ? '1px solid rgba(55,65,81,0.6)'
                : '1px solid rgba(148,163,184,0.6)',
              background: isLightTheme ? '#f9fafb' : '#020617',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: isLightTheme ? '#111827' : '#e5e7eb',
            }}
          >
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                opacity: isLightTheme ? 0.5 : 1,
              }}
            >
              Dark
            </span>
            <span
              style={{
                flex: 1,
                textAlign: 'center',
                opacity: isLightTheme ? 1 : 0.5,
              }}
            >
              Light
            </span>
            <div
              style={{
                position: 'absolute',
                top: 3,
                left: isLightTheme ? 60 : 4,
                width: 56,
                height: 24,
                borderRadius: 999,
                background: isLightTheme ? '#111827' : '#f9fafb',
                boxShadow: '0 4px 8px rgba(15,23,42,0.35)',
                transition: 'left 160ms ease-out, background 160ms ease-out',
              }}
            />
          </button>
        </div>
        <Calendar
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          tasksByDate={tasksByDate}
          holidaysByDate={holidaysByDate}
          isLightTheme={isLightTheme}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onMoveTask={handleMoveTask}
          onDeleteTask={handleDeleteTask}
        />
        <div
          style={{
            marginTop: 16,
            color: isLightTheme ? '#111827' : '#e5e7eb',
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            textAlign: 'center',
            fontSize: '0.9rem',
          }}
        >
          <span style={{ color: isLightTheme ? '#111827' : '#9ca3af' }}>
            Selected date:{' '}
          </span>
          <span style={{ color: isLightTheme ? '#16a34a' : '#e5e7eb' }}>{selectedLabel}</span>
        </div>
      </div>
    </div>
  )
}

export default App
