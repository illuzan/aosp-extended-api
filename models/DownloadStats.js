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

const DownloadStats = mongoose.model('downloadStats', downloadStatsSchema)
export default DownloadStats
