import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import tasksRouter from './routes/tasks'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.send('API running')
})

app.get('/api', (_req, res) => {
  res.send('API running')
})

app.use('/api/tasks', tasksRouter)

const port = Number(process.env.PORT ?? 5000)

async function start() {
  const mongoUri = process.env.MONGO_URI
  if (!mongoUri) {
    throw new Error('Missing environment variable MONGO_URI')
  }

  await mongoose.connect(mongoUri)

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`)
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err)
  process.exit(1)
})

