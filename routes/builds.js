import axios from 'axios'
import { encrypt } from '../utils/crypt.js'
import { isEmpty, orderBy, find } from 'lodash-es'
import { buildsDir, cacheInterval, APIhost } from '../constants.js'
import { existsSync, readdirSync, statSync, readFileSync } from 'fs'
import { getBuilddateByFilename } from '../utils/utils.js'
import DownloadStats from '../models/DownloadStats.js'

export default async function builds(fastify, options) {
  const { redis: client } = fastify

  // @route  GET builds/:codename/:androidVersion
  // @desc   Returns all builds for the particular device for particular android version
  // @access Public
  fastify.get('/:codename/:androidVersion', async (request, reply) => {
    const { codename, androidVersion } = request.params
    const result = await client.get(codename + '_' + androidVersion + '_builds')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let basePath = buildsDir + codename + '/' + androidVersion + '/'

      try {
        if (!existsSync(basePath)) {
          reply.code('403').send({ error: 'No builds :(' })
          return;
        }
      } catch (error) {
        console.log(error)
        reply.code('403').send({ error: 'No builds :(' })
        return;
      }

      let customAvbSupport = isCustAvbSupported(request)
      let buildList = updateBuildList(basePath, request)
      let results = await Promise.all([buildList, customAvbSupport])

      if (!isEmpty(results[0])) {
        let buildList = results[0].map((build) => {
          build.isCustomAvbSupported = results[1]
          return build
        })

        let builds = orderBy(buildList, ['timestamp'], ['desc'])
        client.setex(
          codename + '_' + androidVersion + '_builds',
          cacheInterval,
          JSON.stringify(builds)
        )
        reply.send(builds)
      } else {
        reply.code('403').send({ error: 'No builds :(' })
      }
    }
  })
}

async function isCustAvbSupported(request) {
  const { codename, androidVersion } = request.params
  let deviceInfoUrl = APIhost + 'devices/' + codename
  let customAvbSupport = false

  let response = await axios.get(deviceInfoUrl)
  let deviceInfoResp = find(response.data.supported_versions, {
    version_code: androidVersion,
  })
  if (
    typeof deviceInfoResp !== 'undefined' &&
    typeof deviceInfoResp.supportsCustomAvb !== 'undefined' &&
    deviceInfoResp.supportsCustomAvb === true
  ) {
    customAvbSupport = true
  }
  return customAvbSupport
}

const updateBuildList = async (basePath, request) => {
  const { codename, androidVersion } = request.params
  let buildList = []
  let fileList = readdirSync(basePath)
  for await (const file of fileList) {
    if (isValidFile(file) && isValidMd5(basePath, file)) {
      // If file name is valid and has valid md5
      let downloadLink =
        APIhost +
        'download' +
        '/' +
        codename +
        '/' +
        androidVersion +
        '/' +
        encrypt(file)
      let stats = statSync(basePath + file)
      let changeLog = ''
      let recoveryLink = ''

      if (existsSync(basePath + file + '.txt')) {
        changeLog = readFileSync(basePath + file + '.txt', 'utf8')
      }
      if (existsSync(basePath + file.replace('.zip', '.img'))) {
        recoveryLink =
          APIhost +
          'download' +
          '/' +
          codename +
          '/' +
          androidVersion +
          '/' +
          encrypt(file.replace('.zip', '.img'))
      }

      let count = await getDownloadCount(file)

      let buildDetails = {
        file_name: file,
        file_size: stats.size,
        timestamp: getBuilddateByFilename(file),
        md5: getMd5SumFromFile(basePath, file),
        download_link: downloadLink,
        recovery_download_link: recoveryLink,
        isCustomAvbSupported: false,
        downloads_count: count,
        changelog: changeLog,
      }
      buildList.push(buildDetails)
    }
  }
  return buildList
}

function isValidFile(file) {
  return (
    !file.includes('.md5sum') &&
    !file.includes('.txt') &&
    (file.match(
      /AospExtended-v[0-9].[0-9]-([a-zA-Z0-9_]*)-OFFICIAL-([0-9]{8})-([0-9]{4}).zip/g
    ) ||
      file.match(
        /AospExtended-v[0-9].[0-9]-([a-zA-Z0-9_]*)-([0-9]{8})-([0-9]{4})-OFFICIAL.zip/g
      ))
  )
}

function isValidMd5(basePath, file) {
  let result = false

  if (existsSync(basePath + file + '.md5sum')) {
    let fileCheckSum = []
    try {
      let fileCheckSumString = readFileSync(basePath + file + '.md5sum', 'utf8')
      fileCheckSum = fileCheckSumString.match(/[a-f0-9]{32}/g)
      if (fileCheckSum[0] === null) {
        return false
      }
    } catch (error) {
      console.log(error)
      return false
    }
    result = fileCheckSum[0] !== ''
  }

  return result
}

async function getDownloadCount(file) {
  let downloadCount = 0
  try {
    const count = await DownloadStats.countDocuments({ buildName: file })
    downloadCount = count
  } catch (error) {
    console.error(error)
  }

  return downloadCount
}

function getMd5SumFromFile(basePath, file) {
  let fileCheckSum = []
  try {
    let fileCheckSumString = readFileSync(basePath + file + '.md5sum', 'utf8')
    fileCheckSum = fileCheckSumString.match(/[a-f0-9]{32}/g)
    return fileCheckSum[0]
  } catch (error) {
    console.error(error)
    return
  }
}
