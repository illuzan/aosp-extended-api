import mongoose from 'mongoose'
const { Schema } = mongoose

const downloadStatsSchema = new Schema(
  {
    buildName: String,
    userIp: String,
    downloadedAt: Number,
  },
  { versionKey: false }
)

module.exports = mongoose.model('downloadStats', downloadStatsSchema)
