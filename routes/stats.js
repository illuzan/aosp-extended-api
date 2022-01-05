import InstallStats from '../models/InstallStats.js'
import { getCountryNameByCode } from '../utils/utils.js'
import { cacheInterval, pushOperation } from '../constants.js'

export default async function stats(fastify, options) {
  const { redis: client } = fastify

  // @route  GET stats/
  // @desc   Returns all stats
  // @access Public
  fastify.get('/', async (request, reply) => {
    const result = await client.get('statsData')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let stats = await getStats()
      client.setex('statsData', cacheInterval, JSON.stringify(stats))
      reply.send(stats)
    }
  })

  // @route  POST stats/
  // @desc   Stores stats from devices
  // @access Public
  fastify.post('/', async (request, reply) => {
    if (request.body?.operation === pushOperation) {
      let statsData = request.body.stats

      let stats = new InstallStats({
        buildName: statsData.buildName,
        device: statsData.device,
        model: statsData.model,
        version: statsData.version,
        buildType: statsData.buildType,
        countryCode: statsData.countryCode,
        buildDate: statsData.buildDate,
      })
      try {
        await stats.save()
        reply.send({ result: 'success', message: 'Stored succesfully' })
      } catch (error) {
        reply.send({ result: 'failure', message: 'Failed to store data' })
      }
    } else {
      reply.send({ result: 'failure', message: 'Invalid operation' })
    }
  })

  // @route  GET stats/:device
  // @desc   Returns all stats for specific device
  // @access Public
  fastify.get('/:device', async (request, reply) => {
    const { device } = request.params
    const result = await client.get(device + '_statsData')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let stats = await getStatsByDevice(device)
      client.setex(device + '_statsData', cacheInterval, JSON.stringify(stats))
      reply.send(stats)
    }
  })

  // @route  GET stats/version/:versionCode
  // @desc   Returns all stats for specific version
  // @access Public
  fastify.get('/version/:versionCode', async (request, reply) => {
    const { versionCode } = request.params
    const result = await client.get(versionCode + '_statsData')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let stats = await getStatsByVersion(versionCode)
      client.setex(
        versionCode + '_statsData',
        cacheInterval,
        JSON.stringify(stats)
      )
      reply.send(stats)
    }
  })
}

const getStats = async () => {
  let stats = {
    deviceCountList: [],
    countryCountList: [],
    versionCountList: [],
    totalInstallations: '',
    officialInstallations: '',
    unofficialInstallations: '',
  }

  const versionAggregator = [
    {
      $group: {
        _id: '$version',
        name: { $first: '$version' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  const countryAggregator = [
    {
      $group: {
        _id: '$countryCode',
        name: { $first: '$countryCode' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  const deviceAggregator = [
    {
      $group: {
        _id: '$device',
        name: { $first: '$device' },
        model: { $first: '$model' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  let totalCount = InstallStats.countDocuments().then(
    (count) => (stats.totalInstallations = count)
  )

  let offCount = InstallStats.countDocuments({ buildType: 'OFFICIAL' }).then(
    (count) => {
      stats.officialInstallations = count
    }
  )

  let versionCount = InstallStats.aggregate(versionAggregator).then((data) => {
    stats.versionCountList = data
  })

  let countryList = InstallStats.aggregate(countryAggregator).then((data) => {
    stats.countryCountList = data.map((list) => {
      return {
        name: getCountryNameByCode(list.name),
        count: list.count,
      }
    })
  })

  let deviceCount = InstallStats.aggregate(deviceAggregator).then((data) => {
    stats.deviceCountList = data
  })

  await Promise.all([
    totalCount,
    offCount,
    versionCount,
    countryList,
    deviceCount,
  ])
  stats.unofficialInstallations =
    stats.totalInstallations - stats.officialInstallations
  return stats
}

const getStatsByDevice = async (device) => {
  let stats = {
    buildsCountList: [],
    countryCountList: [],
    versionCountList: [],
    deviceModel: '',
    totalInstallations: '',
    officialInstallations: '',
    unofficialInstallations: '',
  }

  const versionAggregator = [
    {
      $match: {
        device,
      },
    },
    {
      $group: {
        _id: '$version',
        name: { $first: '$version' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  const countryAggregator = [
    {
      $match: {
        device,
      },
    },
    {
      $group: {
        _id: '$countryCode',
        name: { $first: '$countryCode' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  const buildAggregator = [
    {
      $match: {
        device,
      },
    },
    {
      $group: {
        _id: '$buildName',
        buildName: { $first: '$buildName' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  let totalCount = InstallStats.countDocuments({ device }).then(
    (count) => (stats.totalInstallations = count)
  )

  let offCount = InstallStats.countDocuments({
    device,
    buildType: 'OFFICIAL',
  }).then((count) => {
    stats.officialInstallations = count
  })

  let model = InstallStats.findOne({ device }).then((data) => {
    stats.deviceModel = data.model
  })

  let versionCount = InstallStats.aggregate(versionAggregator).then((data) => {
    stats.versionCountList = data
  })

  let countryList = InstallStats.aggregate(countryAggregator).then((data) => {
    stats.countryCountList = data.map((list) => {
      return {
        name: getCountryNameByCode(list.name),
        count: list.count,
      }
    })
  })

  let buildsCount = InstallStats.aggregate(buildAggregator).then((data) => {
    stats.buildsCountList = data
  })

  await Promise.all([
    totalCount,
    offCount,
    model,
    versionCount,
    countryList,
    buildsCount,
  ])
  stats.unofficialInstallations =
    stats.totalInstallations - stats.officialInstallations
  return stats
}

const getStatsByVersion = async (version) => {
  let stats = {
    buildsCountList: [],
    countryCountList: [],
    deviceCountList: [],
    version: '',
    totalInstallations: '',
    officialInstallations: '',
    unofficialInstallations: '',
  }

  stats.version = version

  const deviceAggregator = [
    {
      $match: {
        version,
      },
    },
    {
      $group: {
        _id: '$device',
        name: { $first: '$device' },
        model: { $first: '$model' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  const countryAggregator = [
    {
      $match: {
        version,
      },
    },
    {
      $group: {
        _id: '$countryCode',
        name: { $first: '$countryCode' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  const buildAggregator = [
    {
      $match: {
        version,
      },
    },
    {
      $group: {
        _id: '$buildName',
        buildName: { $first: '$buildName' },
        name: { $first: '$device' },
        model: { $first: '$model' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]

  let totalCount = InstallStats.countDocuments({ version }).then(
    (count) => (stats.totalInstallations = count)
  )

  let offCount = InstallStats.countDocuments({
    version,
    buildType: 'OFFICIAL',
  }).then((count) => {
    stats.officialInstallations = count
  })

  let deviceCount = InstallStats.aggregate(deviceAggregator).then((data) => {
    stats.deviceCountList = data
  })

  let countryList = InstallStats.aggregate(countryAggregator).then((data) => {
    stats.countryCountList = data.map((list) => {
      return {
        name: getCountryNameByCode(list.name),
        count: list.count,
      }
    })
  })

  let buildCount = InstallStats.aggregate(buildAggregator).then((data) => {
    stats.buildsCountList = data
  })

  await Promise.all([
    totalCount,
    offCount,
    deviceCount,
    countryList,
    buildCount,
  ])
  stats.unofficialInstallations =
    stats.totalInstallations - stats.officialInstallations
  return stats
}
