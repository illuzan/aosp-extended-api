import mongoose from 'mongoose'
const { Schema } = mongoose

const installStatsSchema = new Schema(
  {
    buildName: String,
    device: String,
    model: String,
    version: String,
    buildType: String,
    countryCode: String,
    buildDate: String,
  },
  { versionKey: false }
)

const InstallStats = mongoose.model('installstats', installStatsSchema)
export default InstallStats
