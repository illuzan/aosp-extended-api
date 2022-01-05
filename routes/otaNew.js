import md5 from 'md5'
import axios from 'axios'
import moment from 'moment'
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

export default async function otaNew(fastify, options) {
  const { redis: client } = fastify

  // @route  GET ota_V2/:codename/:androidVersion
  // @desc   Returns OTA json of a particular device for post nougat devices
  // @access Public
  fastify.get('/:codename/:androidVersion', async (request, reply) => {
    const { codename, androidVersion } = request.params

    if (
      androidVersion != 'q' &&
      androidVersion != 'q_gapps' &&
      androidVersion != 'r' &&
      androidVersion != 'r_gapps'
    ) {
      let otaFailResponse = {
        error: true,
        donate_url: donateUrl,
        website_url: websiteUrl,
        news_url: newsUrl,
        datetime: '',
        filename: '',
        id: '',
        size: 0,
        url: '',
        version: '',
        addons: '',
        recoveryUrl: '',
        isCustomAvbSupported: false,
      }
      reply.code('403').send(otaFailResponse)
      return
    }

    const result = await client.get(codename + '_' + androidVersion + '_otanew')
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
        error: true,
        donate_url: donateUrl,
        website_url: websiteUrl,
        news_url: newsUrl,
        datetime: '',
        filename: '',
        id: '',
        size: 0,
        url: '',
        version: '',
        addons: addonsList,
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
            error: false,
            filename: latestBuildDetails.file_name,
            datetime: Math.floor(
              moment(
                `${moment(latestBuildDetails.timestamp, 'YYYYMMDD-HHmm').format(
                  'YYYY-MM-DD HH:mm'
                )} UTC`,
                'YYYY-MM-DD HH:mm UTC'
              ).valueOf() / 1000
            ),
            size: latestBuildDetails.file_size,
            url: latestBuildDetails.download_link,
            recoveryUrl: latestBuildDetails.recovery_download_link,
            isCustomAvbSupported: latestBuildDetails.isCustomAvbSupported,
            filehash: latestBuildDetails.md5,
            version: androidVersion,
            id: md5(
              `${latestBuildDetails.file_name}${latestBuildDetails.file_size}${latestBuildDetails.download_link}${androidVersion}${latestBuildDetails.md5}`
            ),
            donate_url: donateUrl,
            website_url: websiteUrl,
            news_url: newsUrl,
            maintainer: deviceInfoResp.maintainer_name,
            maintainer_url: deviceInfoResp.maintainer_url,
            forum_url: deviceInfoResp.xda_thread,
            addons: addonsList,
          }
          client.setex(
            codename + '_' + androidVersion + '_otanew',
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
