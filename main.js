import mqtt from 'mqtt'
import Questrade from 'questrade'
import _ from 'lodash'
import moment from 'moment-timezone'

if ("MQTT_HOST" in process.env === false) {
    console.error("No MQTT host was provided! Exiting.")
    process.exit(1);
}

var mqtt_options = {
    host: process.env.MQTT_HOST,
    port: parseInt(process.env.MQTT_PORT || 1883)
}

if ("MQTT_USER" in process.env) {
    mqtt_options.username = process.env.MQTT_USER
    mqtt_options.password = process.env.MQTT_PASS
}

var qt
const publish_root = process.env.MQTT_PUBLISH_TOPIC || "questrade/"
const publish_topic = publish_root + "positions/"
const intervalMinutes = process.env.REFRESH_INTERVAL || 5
const force_refresh = process.env.FORCE_REFRESH === "true"

console.log("Refreshing every " + intervalMinutes + " minutes")
if (force_refresh) console.log("Forcing refresh even if the market is closed")

// exit if no QT api key was defined
if ("QUESTRADE_API_KEY" in process.env === false) {
    console.error("No Questrade API key was provided! Exiting.")
    process.exit(1);
}

var client = mqtt.connect(mqtt_options)
client.on('connect', async () => {
    console.log("Connected to MQTT")
    await initQuestrade()
    update_all()
    loop()
})

function tsxOpen(){
    let tz = 'America/Toronto'
    let fmt = 'HH:mm:ss'

    let now = moment.tz(tz)
    let openTime = moment.tz('09:30:00', fmt, tz)
    let closeTime = moment.tz('16:00:00', fmt, tz)

    return now.isBetween(openTime, closeTime)
}

async function loop(){
    if (tsxOpen() || force_refresh) {
        update_all()
        setTimeout(loop, intervalMinutes * 60 * 1000)
    } else {
        setTimeout(loop, intervalMinutes * 3 * 60 * 1000)
    }
}

async function update_all(){
    console.log(moment().toISOString() + ": refreshing...")
    let positions = await getPositions()
    let totalValue = getTotalMarketValue(positions)
    
    publishPositionsToMqtt(positions)

    console.log("Total Value: " + totalValue.toFixed(2))
    client.publish(publish_root + 'totalMarketValue', totalValue.toFixed(2))

    publishPNLs(positions)
}

async function publishPNLs(positions){
    let positionIds = []
    let dailyPNL = 0
    let openPNL = 0
    let yesterdayTotalValue = 0

    for (let position of positions){
        positionIds.push(position.symbolId)
        dailyPNL += position.dayPnl
        openPNL += position.openPnl
    }

    let symbols = await getSymbols(positionIds)
    for (let [key, value] of symbols) {
        let picked = _.filter(positions, x => x.symbolId === parseInt(key))[0] // find the position with the matching ID
        let yesterdaysValue = value.prevDayClosePrice * picked.openQuantity
        yesterdayTotalValue += yesterdaysValue
        let percentDailyPNL = (picked.currentMarketValue - yesterdaysValue) * 100 / yesterdaysValue
        client.publish(publish_topic + value.symbol + '/prevClosePercent', percentDailyPNL.toString()) // per position PNL daily
    }
    
    client.publish(publish_root + 'dailyPNL', dailyPNL.toFixed(2)) // daily PNL $ for all positions combined
    client.publish(publish_root + 'openPNL', openPNL.toFixed(2)) // open PNL for all positions combined

    let dailyPNLPercent = dailyPNL * 100 / yesterdayTotalValue;
    client.publish(publish_root + 'dailyPNLPercent', dailyPNLPercent.toFixed(2))
}

async function getSymbols(positionIds) {
    return new Promise((resolve, reject) => {
        qt.getSymbols(positionIds, (err, response) => {
            resolve(Object.entries(response))
        })
    })

}

async function getPositions(){
    return new Promise((resolve, reject) => {
        qt.getPositions((err, response) => {
            if (err){
                console.err(err)
                reject("Error retrieving positions")
            }
            resolve(response.positions)
        })
    })
}

function publishPositionsToMqtt(positions){
    console.log("Pushing new position data to MQTT")
    for (let position of positions) {
        const topic = publish_topic + position.symbol + '/'
        const keys = [
            'openQuantity',
            'currentMarketValue',
            'currentPrice',
            'averageEntryPrice',
            'dayPnl',
            'openPnl',
            'totalCost'
        ]

        for (let key of keys) {
            client.publish(topic + key, position[key].toFixed(2).toString())
        }
    }
}

function getTotalMarketValue(positions){
    let totalValue = 0
    for (let position of positions) {
        totalValue += position['currentMarketValue']
    }
    return totalValue
}

async function initQuestrade() {
    console.log("Connecting to Questrade")
    qt = new Questrade(process.env.QUESTRADE_API_KEY)

    return new Promise((resolve, reject) => {
        qt.on('ready', () => {
            console.log("Connected to Questrade")
            resolve();
        })
    })
}
