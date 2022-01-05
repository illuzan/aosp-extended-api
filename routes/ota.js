import axios from 'axios'
import { existsSync, readFileSync } from 'fs'
import { isEmpty, concat, find } from 'lodash-es'
import {
  cacheInterval,
  APIhost,
  donateUrl,
  websiteUrl,
  newsUrl,
  addonsDir,
} from '../constants.js'

export default async function ota(fastify, options) {
  const { redis: client } = fastify

  // @route  GET ota/:codename/:androidVersion
  // @desc   Returns OTA json of a particular device for post nougat devices
  // @access Public
  fastify.get('/:codename/:androidVersion', async (request, reply) => {
    const { codename, androidVersion } = request.params

    const result = await client.get(codename + '_' + androidVersion + '_ota')
    if (result) {
      reply.send(JSON.parse(result))
    } else {
      let deviceInfoResp
      let deviceInfoUrl = APIhost + 'devices/' + codename
      let buildsUrl = APIhost + 'builds/' + codename + '/' + androidVersion
      let addonsList = []

      try {
        if (existsSync(addonsDir + 'addons.json')) {
          addonsList = JSON.parse(readFileSync(addonsDir + 'addons.json'))
        }
      } catch (error) {
        console.log(error)
      }

      let defaultAddons = addonsList['default']
      let deviceAddons = addonsList[codename]
      if (!isEmpty(deviceAddons)) {
        addonsList = concat(defaultAddons, deviceAddons)
      } else {
        addonsList = defaultAddons
      }

      let otaFailResponse = {
        donate_url: donateUrl,
        website_url: websiteUrl,
        news_url: newsUrl,
        addons: addonsList,
        error: true,
        filename: '',
        build_date: '',
        filesize: '',
        md5: '',
        url: '',
        recoveryUrl: '',
        isCustomAvbSupported: false,
      }

      try {
        const resp = await axios.get(deviceInfoUrl)
        deviceInfoResp = find(resp.data.supported_versions, {
          version_code: androidVersion,
        })
        const response = await axios.get(buildsUrl)
        if (response.status === 200) {
          let latestBuildDetails = response.data[0]

          let otaResponse = {
            donate_url: donateUrl,
            website_url: websiteUrl,
            news_url: newsUrl,
            addons: addonsList,
            developer: deviceInfoResp.maintainer_name,
            developer_url: deviceInfoResp.maintainer_url,
            forum_url: deviceInfoResp.xda_thread,
            filename: latestBuildDetails.file_name,
            build_date: latestBuildDetails.timestamp,
            filesize: latestBuildDetails.file_size,
            md5: latestBuildDetails.md5,
            url: latestBuildDetails.download_link,
            recoveryUrl: latestBuildDetails.recovery_download_link,
            changelog: latestBuildDetails.changelog,
            isCustomAvbSupported: latestBuildDetails.isCustomAvbSupported,
            error: false,
          }

          client.setex(
            codename + '_' + androidVersion + '_ota',
            cacheInterval,
            JSON.stringify(otaResponse)
          )
          reply.send(otaResponse)
        } else {
          reply.code('403').send(otaFailResponse)
        }
      } catch (error) {
        reply.code('403').send(otaFailResponse)
      }
    }
  })
}
