import type { FC } from 'react'
import { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import styled from 'styled-components'
import type { Dayjs } from 'dayjs'
import { generateMonthMatrix, isSameMonth, isToday } from '../../utils/date'
import type { TasksByDate, Task, HolidaysByDate } from '../../types'

type CalendarProps = {
  currentMonth: Dayjs
  onPrevMonth?: () => void
  onNextMonth?: () => void
  selectedDate?: Dayjs | null
  onSelectDate?: (date: Dayjs) => void
  tasksByDate?: TasksByDate
  holidaysByDate?: HolidaysByDate
   isLightTheme?: boolean
  onAddTask?: (date: Dayjs, text: string) => void
  onUpdateTask?: (date: Dayjs, taskId: string, text: string) => void
  onMoveTask?: (
    taskId: string,
    fromDateKey: string,
    toDateKey: string,
    toIndex: number,
  ) => void
  onDeleteTask?: (dateKey: string, taskId: string) => void
}

type ViewMode = 'default' | 'month'

const CalendarWrapper = styled.div<{ $light?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 22px 22px;
  border-radius: 14px;
  background: ${({ $light }) => ($light ? '#f9fafb' : '#0f172a')};
  color: ${({ $light }) => ($light ? '#0f172a' : '#e5e7eb')};
  box-shadow:
    0 20px 25px -5px rgba(15, 23, 42, 0.5),
    0 8px 10px -6px rgba(15, 23, 42, 0.4);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  width: 100%;
  max-width: 2040px;
  margin: 0 auto;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 14px;
    border-radius: 12px;
  }
`

const SearchRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  gap: 8px;
`

const SearchInput = styled.input<{ $light?: boolean }>`
  width: 100%;
  max-width: 320px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid ${({ $light }) =>
    $light ? 'rgba(31, 41, 55, 0.5)' : 'rgba(148, 163, 184, 0.5)'};
  background: ${({ $light }) => ($light ? '#f9fafb' : 'rgba(15, 23, 42, 0.9)')};
  color: ${({ $light }) => ($light ? '#111827' : '#e5e7eb')};
  font-size: 0.85rem;
  outline: none;

  &::placeholder {
    color: ${({ $light }) => ($light ? '#9ca3af' : '#6b7280')};
  }

  &:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.5);
  }
`

const ViewModeGroup = styled.div`
  display: inline-flex;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.5);
  overflow: hidden;
`

const ViewModeButton = styled.button<{ $active?: boolean }>`
  border: none;
  background: ${({ $active }) => ($active ? 'rgba(34, 197, 94, 0.12)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#22c55e' : '#9ca3af')};
  font-size: 0.7rem;
  padding: 4px 10px;
  cursor: pointer;
  transition:
    background 120ms ease-out,
    color 120ms ease-out;

  &:not(:last-child) {
    border-right: 1px solid rgba(148, 163, 184, 0.4);
  }
`

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`

const MonthLabel = styled.h2`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`

const YearLabel = styled.span`
  color: #9ca3af;
  font-size: 0.95rem;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`

const HeaderCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
`

const NavButton = styled.button<{ $light?: boolean }>`
  border: ${({ $light }) =>
    $light ? '1px solid rgba(31, 41, 55, 0.6)' : 'none'};
  background: ${({ $light }) => ($light ? '#ffffff' : '#020617')};
  color: ${({ $light }) => ($light ? '#111827' : '#e5e7eb')};
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  box-shadow: ${({ $light }) =>
    $light
      ? '0 4px 8px -3px rgba(15, 23, 42, 0.25)'
      : '0 6px 10px -4px rgba(15, 23, 42, 0.9)'};
  transition:
    transform 120ms ease-out,
    box-shadow 120ms ease-out,
    background 120ms ease-out,
    color 120ms ease-out;

  &:hover {
    transform: translateY(-1px);
    background: ${({ $light }) => ($light ? '#f9fafb' : '#1f2937')};
    box-shadow: ${({ $light }) =>
      $light
        ? '0 6px 12px -4px rgba(15, 23, 42, 0.35)'
        : '0 10px 18px -6px rgba(15, 23, 42, 1)'};
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${({ $light }) =>
      $light
        ? '0 3px 6px -3px rgba(15, 23, 42, 0.35)'
        : '0 4px 8px -4px rgba(15, 23, 42, 0.9)'};
  }

  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }
`

const WeekdayHeaderRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-top: 4px;
`

const WeekdayHeaderCell = styled.div<{ $isWeekend?: boolean }>`
  padding: 4px 2px 6px;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ $isWeekend }) => ($isWeekend ? '#f97316' : '#9ca3af')};

  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-top: 2px;
`

const DayCell = styled.div<{
  $isToday?: boolean
  $isCurrentMonth?: boolean
  $isWeekend?: boolean
  $isSelected?: boolean
  $hasEvent?: boolean
  $isSearchMatch?: boolean
  $light?: boolean
  $hidden?: boolean
}>`
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  padding: 6px 6px 8px;
  background: ${({ $isSelected, $isToday, $light, $hidden }) => {
    if ($hidden) return 'transparent'
    if ($isSelected) return 'linear-gradient(135deg, #22c55e, #16a34a)'
    if ($isToday) return 'linear-gradient(135deg, #ef4444, #b91c1c)'
    return $light ? '#f9fafb' : 'rgba(15, 23, 42, 0.9)'
  }};
  border: 1px solid
    ${({ $isSelected, $isToday, $hasEvent, $light, $hidden }) => {
      if ($hidden) return 'transparent'
      if ($isSelected) return 'rgba(34, 197, 94, 0.95)'
      if ($hasEvent) return 'rgba(248, 113, 113, 0.9)'
      if ($isToday) return 'rgba(248, 113, 113, 0.95)'
      return $light ? 'rgba(31, 41, 55, 0.25)' : 'rgba(148, 163, 184, 0.15)'
    }};
  color: ${({ $isSelected, $isToday, $isCurrentMonth, $light, $hidden }) => {
    if ($hidden) return 'transparent'
    if ($isSelected || $isToday) return '#fefce8'
    if ($isToday) return '#ecfdf5'
    if ($isCurrentMonth) return $light ? '#111827' : '#e5e7eb'
    return '#6b7280'
  }};
  box-shadow: ${({ $isToday }) =>
    $isToday ? '0 0 0 1px rgba(239, 68, 68, 0.9), 0 10px 18px -4px rgba(185, 28, 28, 0.9)' : 'none'};
  transition:
    transform 120ms ease-out,
    box-shadow 120ms ease-out,
    border-color 120ms ease-out,
    background 120ms ease-out;
  position: relative;
  overflow: hidden;

  @keyframes searchPulse {
    0% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      transform: translateY(0);
    }
    35% {
      box-shadow:
        0 0 0 1px rgba(59, 130, 246, 0.9),
        0 0 0 8px rgba(59, 130, 246, 0.25);
      transform: translateY(-1px);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      transform: translateY(0);
    }
  }

  animation: ${({ $isSearchMatch }) => ($isSearchMatch ? 'searchPulse 0.9s ease-out 0s 2' : 'none')};

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 12px -4px rgba(15, 23, 42, 0.7);
    border-color: ${({ $isToday }) =>
      $isToday ? 'rgba(22, 163, 74, 1)' : 'rgba(148, 163, 184, 0.35)'};
  }

  @media (max-width: 768px) {
    padding: 4px 4px 6px;
    border-radius: 8px;
  }
`

const DayNumber = styled.div<{ $isToday?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ $isToday }) => ($isToday ? 'rgba(15, 23, 42, 0.15)' : 'transparent')};

  @media (max-width: 768px) {
    width: 22px;
    height: 22px;
    font-size: 0.75rem;
  }
`

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const DayContent = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const HolidayLabel = styled.div`
  margin-top: 4px;
  font-size: 0.7rem;
  color: #fb7185;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TaskDropZone = styled.div<{ $isOver: boolean; $isDragging: boolean; $light?: boolean }>`
  margin-top: 4px;
  padding: 4px;
  border-radius: 8px;
  min-height: 56px;
  display: flex;
  flex-direction: column;
  flex: 1;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;

  ${({ $isDragging, $isOver, $light }) =>
    $isDragging
      ? `
    border: 1px dashed ${
      $light
        ? $isOver
          ? 'rgba(31, 41, 55, 0.8)'
          : 'rgba(31, 41, 55, 0.45)'
        : $isOver
          ? 'rgba(77, 171, 247, 0.9)'
          : 'rgba(148, 163, 184, 0.35)'
    };
    background: ${
      $light
        ? $isOver
          ? '#e5e7eb'
          : '#f3f4f6'
        : $isOver
          ? 'rgba(37, 99, 235, 0.12)'
          : 'rgba(15, 23, 42, 0.45)'
    };
  `
      : `
    border: 1px dashed transparent;
    background: transparent;
  `}
`

const TasksList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.7) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(148, 163, 184, 0.7);
    border-radius: 999px;
  }
`

const EmptyCellPlaceholder = styled.div<{ $light?: boolean }>`
  font-size: 0.7rem;
  opacity: ${({ $light }) => ($light ? 0.7 : 0.5)};
  color: ${({ $light }) => ($light ? '#4b5563' : '#e5e7eb')};
  text-align: center;
  padding: 4px 2px 6px;
  pointer-events: none;
`

const TaskItem = styled.li<{ $isSearchMatch?: boolean; $light?: boolean }>`
  font-size: 0.7rem;
  padding: 2px 4px;
  border-radius: 4px;
  background: ${({ $light }) => ($light ? '#f9fafb' : 'rgba(15, 23, 42, 0.9)')};
  border: 1px solid
    ${({ $light }) => ($light ? 'rgba(31, 41, 55, 0.35)' : 'rgba(148, 163, 184, 0.3)')};
  color: ${({ $light }) => ($light ? '#111827' : '#f9fafb')};
  cursor: grab;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;

  @keyframes taskPulse {
    0% {
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(148, 163, 184, 0.3);
    }
    35% {
      background: rgba(37, 99, 235, 0.4);
      border-color: rgba(59, 130, 246, 0.95);
    }
    100% {
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(148, 163, 184, 0.3);
    }
  }

  animation: ${({ $isSearchMatch }) => ($isSearchMatch ? 'taskPulse 0.9s ease-out 0s 2' : 'none')};
`

const TaskText = styled.span`
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DeleteTaskButton = styled.button<{ $light?: boolean }>`
  border: none;
  background: transparent;
  color: ${({ $light }) => ($light ? '#111827' : '#9ca3af')};
  cursor: pointer;
  padding: 0 2px;
  font-size: 0.8rem;
  line-height: 1;

  &:hover {
    color: #f97316;
  }
`

const TaskInput = styled.input<{ $isHidden?: boolean; $light?: boolean }>`
  margin-top: 4px;
  width: 100%;
  border-radius: 4px;
  border: 1px solid ${({ $light }) =>
    $light ? 'rgba(31, 41, 55, 0.35)' : 'rgba(148, 163, 184, 0.4)'};
  background: ${({ $light }) => ($light ? '#f9fafb' : 'rgba(15, 23, 42, 0.8)')};
  color: ${({ $light }) => ($light ? '#111827' : '#e5e7eb')};
  padding: 2px 4px;
  font-size: 0.7rem;
  outline: none;
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;

  ${({ $isHidden }) =>
    $isHidden
      ? `
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
  `
      : `
    opacity: 1;
    transform: translateY(0);
  `}

  &:focus {
    border-color: #22c55e;
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.5);
  }
`

const InlineEditInput = styled.input`
  width: 100%;
  border-radius: 4px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.95);
  color: #e5e7eb;
  padding: 2px 4px;
  font-size: 0.7rem;
  outline: none;

  &:focus {
    border-color: #f97316;
    box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.5);
  }
`

type DayTasksCellProps = {
  date: Dayjs
  dateKey: string
  tasks?: Task[]
  onAddTask?: (date: Dayjs, text: string) => void
  onUpdateTask?: (date: Dayjs, taskId: string, text: string) => void
  children: React.ReactNode
  onDeleteTask?: (dateKey: string, taskId: string) => void
  isDraggingTask: boolean
  search: string
  searchTick: number
  holidaysForDay: string[]
  isLightTheme?: boolean
}

const DayTasksCell: FC<DayTasksCellProps> = ({
  date,
  dateKey,
  tasks,
  onAddTask,
  onUpdateTask,
  children,
  onDeleteTask,
  isDraggingTask,
  search,
  searchTick,
  holidaysForDay,
  isLightTheme,
}) => {
  const [newTaskText, setNewTaskText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const submitByEnterRef = useRef(false)

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: {
      type: 'day',
      dateKey,
    },
  })

  const handleNewTaskKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter' && newTaskText.trim()) {
      submitByEnterRef.current = true
      onAddTask?.(date, newTaskText.trim())
      setNewTaskText('')
    }
  }

  const startEditing = (task: Task) => {
    setEditingId(task.id)
    setEditingText(task.text)
  }

  const commitEdit = () => {
    if (editingId && editingText.trim() && onUpdateTask) {
      onUpdateTask(date, editingId, editingText.trim())
    }
    setEditingId(null)
    setEditingText('')
  }

  const handleEditKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      commitEdit()
    } else if (event.key === 'Escape') {
      setEditingId(null)
      setEditingText('')
    }
  }

  const normalizedSearch = search.trim().toLowerCase()
  const allTasks = tasks ?? []
  const hasSearch = normalizedSearch.length > 0
  const filteredTasks = hasSearch
    ? allTasks.filter((task) => task.text.toLowerCase().includes(normalizedSearch))
    : allTasks

  const showNoResults = hasSearch && filteredTasks.length === 0

  return (
    <DayContent>
      {children}
      {holidaysForDay.map((name) => (
        <HolidayLabel key={name}>{name}</HolidayLabel>
      ))}
      <TaskDropZone
        ref={setNodeRef}
        $isOver={isOver}
        $isDragging={isDraggingTask}
        $light={isLightTheme}
      >
        {isDraggingTask && allTasks.length === 0 && !hasSearch && (
          <EmptyCellPlaceholder $light={isLightTheme}>Drop task here</EmptyCellPlaceholder>
        )}
        {showNoResults && (
          <EmptyCellPlaceholder $light={isLightTheme}>No tasks found</EmptyCellPlaceholder>
        )}
        <TasksList>
          <SortableContext
            items={filteredTasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredTasks.map((task, index) => (
              <SortableTaskItem
                key={hasSearch ? `${task.id}-${searchTick}` : task.id}
                task={task}
                dateKey={dateKey}
                index={index}
                isEditing={editingId === task.id}
                editingText={editingText}
                onStartEditing={() => startEditing(task)}
                onChangeEditingText={(value) => setEditingText(value)}
                onCommitEdit={commitEdit}
                onCancelEdit={() => {
                  setEditingId(null)
                  setEditingText('')
                }}
                handleEditKeyDown={handleEditKeyDown}
                onDeleteTask={onDeleteTask}
                isSearchMatch={hasSearch}
                searchTick={searchTick}
                lightTheme={isLightTheme}
              />
            ))}
          </SortableContext>
        </TasksList>
        <TaskInput
          placeholder="Add task"
          value={newTaskText}
          onChange={(event) => setNewTaskText(event.target.value)}
          onKeyDown={handleNewTaskKeyDown}
          $isHidden={isDraggingTask && isOver}
          $light={isLightTheme}
          onBlur={() => {
            const value = newTaskText.trim()
            if (value && !submitByEnterRef.current) {
              onAddTask?.(date, value)
            }
            submitByEnterRef.current = false
            setNewTaskText('')
          }}
        />
      </TaskDropZone>
    </DayContent>
  )
}

type SortableTaskItemProps = {
  task: Task
  dateKey: string
  index: number
  isEditing: boolean
  editingText: string
  onStartEditing: () => void
  onChangeEditingText: (value: string) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  handleEditKeyDown: React.KeyboardEventHandler<HTMLInputElement>
  onDeleteTask?: (dateKey: string, taskId: string) => void
  isSearchMatch: boolean
  searchTick: number
  lightTheme?: boolean
}

const SortableTaskItem: FC<SortableTaskItemProps> = ({
  task,
  dateKey,
  index,
  isEditing,
  editingText,
  onStartEditing,
  onChangeEditingText,
  onCommitEdit,
  onCancelEdit,
  handleEditKeyDown,
  onDeleteTask,
  isSearchMatch,
  searchTick: _searchTick, // unused but keeps re-mount semantics via key
  lightTheme,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      dateKey,
      index,
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <TaskItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      $isSearchMatch={isSearchMatch}
      $light={lightTheme}
    >
      {isEditing ? (
        <InlineEditInput
          autoFocus
          value={editingText}
          onChange={(event) => onChangeEditingText(event.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onCancelEdit()
            } else {
              handleEditKeyDown(event)
            }
          }}
        />
      ) : (
        <>
          <TaskText
            {...listeners}
            onClick={() => {
              onStartEditing()
            }}
          >
            {task.text}
          </TaskText>
          <DeleteTaskButton
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDeleteTask?.(dateKey, task.id)
            }}
            $light={lightTheme}
          >
            ×
          </DeleteTaskButton>
        </>
      )}
    </TaskItem>
  )
}

const DaysGridWrapper = styled.div`
  animation: fadeIn 160ms ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const Calendar: FC<CalendarProps> = ({
  currentMonth,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
  tasksByDate,
  holidaysByDate,
  isLightTheme,
  onAddTask,
  onUpdateTask,
  onMoveTask,
  onDeleteTask,
}) => {
  const [search, setSearch] = useState('')
  const [searchTick, setSearchTick] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('default')

  const matrix = generateMonthMatrix(currentMonth)

  const monthName = currentMonth.format('MMMM')
  const yearNumber = currentMonth.year()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  )

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !tasksByDate || !onMoveTask) return

    const activeData = active.data.current as
      | { type: 'task'; dateKey: string; index: number }
      | undefined
    const overData = over.data.current as
      | { type: 'task'; dateKey: string; index: number }
      | { type: 'day'; dateKey: string }
      | undefined

    if (!activeData || activeData.type !== 'task' || !overData) return

    const fromKey = activeData.dateKey

    let toKey = fromKey
    let toIndex = activeData.index

    if (overData.type === 'task') {
      toKey = overData.dateKey
      toIndex = overData.index
    } else if (overData.type === 'day') {
      toKey = overData.dateKey
      toIndex = (tasksByDate[toKey]?.length ?? 0)
    }

    if (fromKey === toKey && activeData.index === toIndex) {
      setActiveTaskId(null)
      return
    }

    onMoveTask(String(active.id), fromKey, toKey, toIndex)
    setActiveTaskId(null)
  }

  const allTasks = tasksByDate ? Object.values(tasksByDate).flat() : []
  const activeTask = activeTaskId
    ? allTasks.find((task) => task.id === activeTaskId) ?? null
    : null

  const normalizedSearch = search.trim().toLowerCase()
  const hasSearch = normalizedSearch.length > 0

  return (
    <CalendarWrapper $light={isLightTheme}>
      <SearchRow>
        <SearchInput
          type="text"
          placeholder="Search tasks..."
          value={search}
          $light={isLightTheme}
          onChange={(event) => {
            setSearch(event.target.value)
            setSearchTick((prev) => prev + 1)
          }}
        />
        <ViewModeGroup>
          <ViewModeButton
            type="button"
            $active={viewMode === 'default'}
            onClick={() => setViewMode('default')}
          >
            Default
          </ViewModeButton>
          <ViewModeButton
            type="button"
            $active={viewMode === 'month'}
            onClick={() => setViewMode('month')}
          >
            Month
          </ViewModeButton>
        </ViewModeGroup>
      </SearchRow>
      <CalendarHeader>
        <NavButton
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          $light={isLightTheme}
        >
          ‹
        </NavButton>
        <HeaderCenter>
          <MonthLabel>{monthName}</MonthLabel>
          <YearLabel>{yearNumber}</YearLabel>
        </HeaderCenter>
        <NavButton
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          $light={isLightTheme}
        >
          ›
        </NavButton>
      </CalendarHeader>

      <WeekdayHeaderRow>
        {WEEKDAY_LABELS.map((label, index) => (
          <WeekdayHeaderCell key={label} $isWeekend={index === 5 || index === 6}>
            {label}
          </WeekdayHeaderCell>
        ))}
      </WeekdayHeaderRow>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <DaysGridWrapper key={currentMonth.format('YYYY-MM')}>
          <DaysGrid>
            {matrix.map((week) =>
              week.map((date) => {
                const today = isToday(date)
                const inCurrentMonth = isSameMonth(date, currentMonth)
                const isHidden = viewMode === 'month' && !inCurrentMonth
                const weekdayIndex = (date.day() + 6) % 7
                const isWeekend = weekdayIndex === 5 || weekdayIndex === 6
                const isSelected = selectedDate ? date.isSame(selectedDate, 'day') : false
                const dateKey = date.format('YYYY-MM-DD')
                const tasksForDay = tasksByDate?.[dateKey] ?? []
                const holidaysForDay = holidaysByDate?.[dateKey]?.map((h) => h.name) ?? []
                const hasEvent = holidaysForDay.length > 0

                const hasSearchMatch =
                  !isHidden &&
                  hasSearch &&
                  tasksForDay.some((task) =>
                    task.text.toLowerCase().includes(normalizedSearch),
                  )

                const handleClick = () => {
                  if (onSelectDate && !isHidden) onSelectDate(date)
                }

                return (
                  <DayCell
                    key={hasSearchMatch ? `${dateKey}-${searchTick}` : dateKey}
                    $isToday={!isHidden && today}
                    $isCurrentMonth={inCurrentMonth}
                    $isWeekend={isWeekend}
                    $isSelected={!isHidden && isSelected}
                    $hasEvent={!isHidden && hasEvent}
                    $isSearchMatch={hasSearchMatch}
                    $light={isLightTheme}
                    $hidden={isHidden}
                    onClick={handleClick}
                  >
                    {!isHidden && (
                      <DayTasksCell
                        date={date}
                        dateKey={dateKey}
                        tasks={tasksForDay}
                        onAddTask={onAddTask}
                        onUpdateTask={onUpdateTask}
                        onDeleteTask={onDeleteTask}
                        isDraggingTask={Boolean(activeTaskId)}
                        search={search}
                        searchTick={searchTick}
                        holidaysForDay={holidaysForDay}
                        isLightTheme={isLightTheme}
                      >
                        <DayNumber $isToday={today}>{date.date()}</DayNumber>
                      </DayTasksCell>
                    )}
                  </DayCell>
                )
              }),
            )}
          </DaysGrid>
        </DaysGridWrapper>
        <DragOverlay>
          {activeTask ? (
            <div
              style={{
                padding: '2px 6px',
                borderRadius: 6,
                background: 'rgba(15, 23, 42, 0.98)',
                border: '1px solid rgba(148, 163, 184, 0.6)',
                color: '#e5e7eb',
                fontSize: '0.7rem',
                boxShadow: '0 8px 16px rgba(15, 23, 42, 0.9)',
                maxWidth: 200,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {activeTask.text}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </CalendarWrapper>
  )
}

export default Calendar

