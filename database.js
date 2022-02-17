import Mongoose from "mongoose"

const dbOptions = {
  maxPoolSize: 7,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 60000,
  keepAlive: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

export const connectDB = async () => {
  try {
    Mongoose.connect(
      `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_SERVER}/${process.env.DB_NAME}`,
      dbOptions
    )
    console.log('Database connection successful')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
