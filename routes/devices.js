import axios from 'axios'
import { isEmpty, orderBy, find, filter } from 'lodash-es'
import { devicesJson, devicesBranch, cacheInterval } from '../constants.js'

export default async function devices(fastify, options) {
  const { redis: client } = fastify

  // @route  GET devices/
  // @desc   Returns all the supported devices post nougat android version
  // @access Public
  fastify.get('/', async (request, reply) => {
    const result = await client.get('devices')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let url = devicesJson + devicesBranch + '/devices.json'
      try {
        let response = await axios.get(url)
        let resp = orderBy(response.data, ['brand', 'name'], ['asc', 'asc'])
        client.setex('devices', cacheInterval, JSON.stringify(resp))
        reply.send(resp)
      } catch (error) {
        reply.code('403').send({ error: 'Something went wrong' })
      }
    }
  })

  // @route  GET devices/filtered/:androidVersion
  // @desc   Returns all the supported devices filtered with androidVersion
  // @access Public
  fastify.get('/filtered/:androidVersion', async (request, reply) => {
    const { androidVersion } = request.params
    const result = await client.get('devices')
    if (result) {
      let rawData = JSON.parse(result)
      let data = getFilteredArray(rawData, androidVersion)
      if (!isEmpty(data)) {
        reply.send(data)
      } else {
        reply.code('403').send({ error: 'No devices' })
      }
    } else {
      let url = devicesJson + devicesBranch + '/devices.json'
      try {
        let response = await axios.get(url)
        let resp = orderBy(response.data, ['brand', 'name'], ['asc', 'asc'])
        client.setex('devices', cacheInterval, JSON.stringify(resp))
        let data = getFilteredArray(response, androidVersion)
        if (!isEmpty(data)) {
          reply.send(data)
        } else {
          reply.code('403').send({ error: 'No devices' })
        }
      } catch (error) {
        reply.code('403').send({ error: 'Something went wrong' })
      }
    }
  })

  // @route  GET devices/:codename
  // @desc   Returns details of a particular device for post nougat devices
  // @access Public
  fastify.get('/:codename', async (request, reply) => {
    const { codename } = request.params
    const result = await client.get('devices')
    if (result) {
      let deviceInfo = find(JSON.parse(result), { codename })
      if (!isEmpty(deviceInfo)) {
        reply.send(deviceInfo)
      } else {
        reply.code('403').send({ error: 'Device not found' })
      }
    } else {
      let url = devicesJson + devicesBranch + '/devices.json'
      try {
        let response = await axios.get(url)
        let resp = orderBy(response.data, ['brand', 'name'], ['asc', 'asc'])
        client.setex('devices', cacheInterval, JSON.stringify(resp))
        let deviceInfo = find(resp, { codename })
        if (!isEmpty(deviceInfo)) {
          reply.send(deviceInfo)
        } else {
          reply.code('403').send({ error: 'Device not found' })
        }
      } catch (error) {
        reply.code('403').send({ error: 'Something went wrong' })
      }
    }
  })
}

const getFilteredArray = (deviceArray, codeVersion) => {
  let filteredArray = deviceArray.reduce((newArray, device) => {
    if (device.codename !== 'treble_gsi') {
      let versionData = filter(device.supported_versions, function(v) {
        return v.version_code === codeVersion || v.version_code === codeVersion + '_gapps'
      })
      if (versionData.length > 0) {
        newArray.push({
          name: device.name,
          brand: device.brand,
          codename: device.codename,
          maintainer_name: versionData[0].maintainer_name,
          maintainer_url: versionData[0].maintainer_url,
          xda_thread: versionData[0].xda_thread,
        })
      }
    }
    return newArray
  }, [])

  return filteredArray
}
