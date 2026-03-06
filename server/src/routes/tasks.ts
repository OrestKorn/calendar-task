import { Router } from 'express'
import { TaskModel } from '../models/Task'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const tasks = await TaskModel.find().sort({ date: 1, order: 1, createdAt: 1 })
    res.json(tasks)
  } catch {
    res.status(500).json({ message: 'Failed to fetch tasks' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { text, date, order } = req.body as {
      text?: unknown
      date?: unknown
      order?: unknown
    }

    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ message: 'text is required' })
    }
    if (typeof date !== 'string' || date.trim().length === 0) {
      return res.status(400).json({ message: 'date is required' })
    }

    const created = await TaskModel.create({
      text: text.trim(),
      date: date.trim(),
      order: typeof order === 'number' ? order : 0,
    })

    return res.status(201).json(created)
  } catch {
    return res.status(500).json({ message: 'Failed to create task' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { text, date, order } = req.body as {
      text?: unknown
      date?: unknown
      order?: unknown
    }

    const update: Record<string, unknown> = {}
    if (typeof text === 'string') update.text = text.trim()
    if (typeof date === 'string') update.date = date.trim()
    if (typeof order === 'number') update.order = order

    const updated = await TaskModel.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    } as Parameters<typeof TaskModel.findByIdAndUpdate>[2])

    if (!updated) {
      return res.status(404).json({ message: 'Task not found' })
    }

    return res.json(updated)
  } catch {
    return res.status(500).json({ message: 'Failed to update task' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deleted = await TaskModel.findByIdAndDelete(id)
    if (!deleted) {
      return res.status(404).json({ message: 'Task not found' })
    }

    return res.json({ ok: true })
  } catch {
    return res.status(500).json({ message: 'Failed to delete task' })
  }
})

export default router

