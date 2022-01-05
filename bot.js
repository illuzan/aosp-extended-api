import telegramBot from './service/telegramBot.js'
import { botInterval } from './constants.js'

// Call telegram bot service to check for newer builds and push to our channel
setInterval(() => telegramBot.pushNotification(), botInterval)
