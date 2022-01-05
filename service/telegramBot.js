import moment from 'moment'
import filesize from 'filesize'
import BotCache from '../models/BotCache.js'
import TelegramBot from 'node-telegram-bot-api'

import { isPushed } from '../utils/utils.js'
import { Clienthost } from '../constants.js'


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })

export default async function pushNotification() {
  const { redis: client } = fastify

  console.log('Sending telegram notification')
  const result = await client.get('devices')
  if (result) {
    let devices = JSON.parse(result)
    devices.map((device) => {
      device.supported_versions.map((version) => {
        const result = await client.get(
          device.codename + '_' + version.version_code + '_builds'
        )
        if (result) {
          let buildList = JSON.parse(result)
          if (buildList.length !== 0) {
            try {
              let latestBuild = buildList[0]
              let doc = await BotCache.find()
              if (!isPushed(doc, latestBuild.md5)) {
                console.log(
                  'Pushing for',
                  device.codename,
                  'for version:',
                  version.version_code
                )

                let message = `<b>New build for ${device.brand} ${device.name} (${device.codename})</b>\n` +
                  `by <a href="${version.maintainer_url}">${version.maintainer_name}</a>\n\n` +
                  `▪️ Version: ${version.version_name}\n` +
                  `▪️ Build date: ${moment(latestBuild.timestamp, "YYYYMMDD-Hmm").format('MMMM Do YYYY, h:mm a')}\n` +
                  `▪️ File size: ${filesize(latestBuild.file_size).human()}\n` +
                  `▪️ Md5: ${latestBuild.md5}\n\n` +
                  `▪️ <a href="${Clienthost}download/${device.codename}/${version.version_code}/${latestBuild.file_name}">Download</a>\n\n` +
                  `#${device.codename} #aospextended`

                console.log('====================')
                console.log('Pushing Notification')
                console.log('====================')
                telegrambot(message, latestBuild.md5)
                console.log(message)
              }
            } catch (error) {
              console.error(error)
            }
          }
        }
      })
    })
  }
}

const telegrambot = async (message, md5) => {
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
      parse_mode: 'html',
      disable_web_page_preview: true,
    })
    let cache = new BotCache({
      md5,
    })
    await cache.save()
  } catch (error) {
    console.log(
      'Something went wrong when trying to send a Telegram notification',
      error
    )
  }
}
