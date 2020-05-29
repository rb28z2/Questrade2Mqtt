import mqtt from 'mqtt'
import Questrade from 'questrade'
import _ from 'lodash';

if ("MQTT_HOST" in process.env === false) {
    console.error("No MQTT host was provided! Exiting.")
    process.exit(1);
}

var mqtt_options = {
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT || 1883
}

if ("MQTT_USER" in process.env) {
    mqtt_options.username = process.env.MQTT_USER
    mqtt_options.password = process.env.MQTT_PASS
}

var qt
const publish_root = process.env.MQTT_PUBLISH_TOPIC || "questrade/"
const publish_topic = publish_root + "positions/"

// exit if no QT api key was defined
if ("QUESTRADE_API_KEY" in process.env === false) {
    console.error("No Questrade API key was provided! Exiting.")
    process.exit(1);
}

var client = mqtt.connect(mqtt_options)
client.on('connect', async () => {
    console.log("Connected to MQTT")
    await initQuestrade()
    
    loop()
})

async function loop(){
    let positions = await getPositions()
    let totalValue = getTotalMarketValue(positions)
    
    publishPositionsToMqtt(positions)

    console.log("Total Value: " + totalValue)
    client.publish(publish_root + 'totalMarketValue', totalValue.toFixed(2))
}

async function getPositions(){
    return new Promise((resolve, reject) => {
        qt.getPositions((err, response) => {
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

        for (var key of keys) {
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
