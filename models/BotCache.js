import mongoose from 'mongoose'
const { Schema } = mongoose

const botCacheSchema = new Schema(
  {
    md5: String,
  },
  { versionKey: false }
)

const BotCache = mongoose.model('botcaches', botCacheSchema)
export default BotCache
