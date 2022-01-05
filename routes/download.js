import { existsSync } from 'fs'
import { decrypt } from '../utils/crypt.js'
import { buildsDir } from '../constants.js'
import DownloadStats from '../models/DownloadStats.js'

export default async function download(fastify, options) {

  // @route  GET download/:codename/:androidVersion/:buildNameHex
  // @desc   Redirects to download of particular build of particular device post nougat android version
  // @access Public
  fastify.get(
    '/:codename/:androidVersion/:buildNameHex',
    async (request, reply) => {
      const { codename, androidVersion, buildNameHex } = request.params
      const remoteip =
        request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        (request.connection.socket
          ? request.connection.socket.remoteAddress
          : null)
      const buildName = decrypt(buildNameHex)
      try {
        if (
          existsSync(
            buildsDir + '/' + codename + '/' + androidVersion + '/' + buildName
          )
        ) {
          reply.download(
            '/' + codename + '/' + androidVersion + '/' + buildName
          )

          if (buildName.includes('.zip')) {
            // Don't count download for recovery
            const stats = new DownloadStats({
              buildName,
              userIp: remoteip,
              downloadedAt: Math.floor(Date.now()),
            })
            try {
              const count = await DownloadStats.countDocuments({
                buildName,
                userIp: remoteip,
              })
              if (count === 0) {
                stats.save()
              }
            } catch (error) {
              console.error(error)
            }
          }
        } else {
          reply.code('403').send({ status: 'Not found' })
        }
      } catch (error) {
        console.log(error)
        reply.code('403').send({ status: 'Not found' })
      }
    }
  )
}
