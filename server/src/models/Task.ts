import mongoose, { type InferSchemaType } from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true },
)

taskSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const json: Record<string, unknown> = { ...ret }
    // eslint-disable-next-line no-underscore-dangle
    json.id = ret._id
    // eslint-disable-next-line no-underscore-dangle
    delete json._id
    return json
  },
})

export type TaskDocument = InferSchemaType<typeof taskSchema>

export const TaskModel =
  (mongoose.models.Task as mongoose.Model<TaskDocument> | undefined) ??
  mongoose.model<TaskDocument>('Task', taskSchema)

