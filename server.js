import Fastify from 'fastify'
import fastifyEnv from 'fastify-env'
import fastifyStatic from 'fastify-static'
import mongoose from 'mongoose'
import addons from './routes/addons.js'
import download from './routes/download.js'
import builds from './routes/builds.js'
import devices from './routes/devices.js'
import stats from './routes/stats.js'
import ota from './routes/ota.js'
import otaNew from './routes/otaNew.js'
import { buildsDir } from './config/constants.js'

const fastify = Fastify({
  logger: true,
})

const envSchema = {
  type: 'object',
  required: [
    'PORT',
    'DB_NAME',
    'DB_SERVER',
    'DB_USERNAME',
    'DB_PASSWORD',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ],
  properties: {
    PORT: {
      type: 'number',
      default: 3000,
    },
    DB_NAME: {
      type: 'string',
    },
    DB_SERVER: {
      type: 'string',
    },
    DB_USERNAME: {
      type: 'string',
    },
    DB_PASSWORD: {
      type: 'string',
    },
    TELEGRAM_BOT_TOKEN: {
      type: 'string',
    },
    TELEGRAM_CHAT_ID: {
      type: 'string',
    },
  },
}

const envOptions = {
  schema: envSchema,
  dotenv: true,
  data: process.env,
}

const dbOptions = {
  maxPoolSize: 7,
  socketTimeoutMS: 60000,
  connectTimeoutMS: 60000,
  keepAlive: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
}

fastify.register(fastifyStatic, { root: buildsDir })
fastify.register(addons, { prefix: '/addons' })
fastify.register(download, { prefix: '/download' })
fastify.register(builds, { prefix: '/builds' })
fastify.register(devices, { prefix: '/devices' })
fastify.register(stats, { prefix: '/stats' })
fastify.register(ota, { prefix: '/ota' })
fastify.register(otaNew, { prefix: '/ota_V2' })

const connectDB = async () => {
  try {
    fastify.register(fastifyEnv, envOptions)
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
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

connectDB()
startServer()
