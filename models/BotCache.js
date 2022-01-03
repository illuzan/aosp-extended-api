import mongoose from 'mongoose'
const { Schema } = mongoose

const botCacheSchema = new Schema(
  {
    md5: String,
  },
  { versionKey: false }
)

module.exports = mongoose.model('botcaches', botCacheSchema)
