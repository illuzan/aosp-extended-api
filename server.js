import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import fastifyRedis from 'fastify-redis'
import fastifyStatic from 'fastify-static'
import fastifyCompress from 'fastify-compress'

import mongoose from 'mongoose'
import ota from './routes/ota.js'
import stats from './routes/stats.js'
import addons from './routes/addons.js'
import builds from './routes/builds.js'
import otaNew from './routes/otaNew.js'
import devices from './routes/devices.js'
import download from './routes/download.js'
import { buildsDir } from './constants.js'

const fastify = Fastify({
  logger: true
})

const dbOptions = {
  maxPoolSize: 7,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 60000,
  keepAlive: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

// Fastify Plugins
fastify.register(fastifyCors)
fastify.register(fastifyRedis)
fastify.register(fastifyCompress, { global: true })
fastify.register(fastifyStatic, { root: buildsDir })

// API Routes
fastify.register(addons, { prefix: '/addons' })
fastify.register(builds, { prefix: '/builds' })
fastify.register(devices, { prefix: '/devices' })
fastify.register(download, { prefix: '/download' })
fastify.register(ota, { prefix: '/ota' })
fastify.register(otaNew, { prefix: '/ota_v2' })
fastify.register(stats, { prefix: '/stats' })

const connectDB = async () => {
  try {
    await fastify.after()
    mongoose.connect(
      `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_SERVER}/${process.env.DB_NAME}`,
      dbOptions
    )
    console.log('Database connection successful')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

const startServer = async () => {
  try {
    await fastify.ready()
    await fastify.listen(process.env.PORT)
    console.log('Server Started')
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

connectDB()
startServer()
