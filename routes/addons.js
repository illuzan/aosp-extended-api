import axios from 'axios'
import { isEmpty, concat } from 'lodash-es'
import {
  buildsJson,
  buildsBranch,
  cacheInterval,
  APIhost,
} from '../constants.js'

export default async function addons(fastify, options) {
  const { redis: client } = fastify

  // @route  GET addons/
  // @desc   Returns all the addons
  // @access Public
  fastify.get('/', async (request, reply) => {
    const result = await client.get('addons')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let url = buildsJson + buildsBranch + '/addons.json'
      try {
        let response = await axios.get(url)
        client.setex('addons', cacheInterval, JSON.stringify(response.data))
        reply.send(response.data)
      } catch (error) {
        reply.code('403').send({ error: 'Something went wrong' })
      }
    }
  })

  // @route  GET addons/:codename
  // @desc   Returns addons for a particular device
  // @access Public
  fastify.get('/:codename', async (request, reply) => {
    const { codename } = request.params
    const result = await client.get(codename + '_addons')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      const url = APIhost + 'addons'
      try {
        const response = await axios.get(url)
        let resp = response.data
        let defaultAddons = resp['default']
        let deviceAddons = resp[codename]
        if (!isEmpty(deviceAddons)) {
          let data = concat(defaultAddons, deviceAddons)
          client.setex(
            codename + '_addons',
            cacheInterval,
            JSON.stringify(data)
          )
          reply.send(data)
        } else {
          reply.send(defaultAddons)
        }
      } catch (error) {
        reply.code('403').send({ error: 'Something went wrong' })
      }
    }
  })
}
